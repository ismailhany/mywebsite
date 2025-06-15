// This is a dummy line to force module re-evaluation.
const { User, Course, Enrollment, Lesson, Playlist, Video, Comment, Review } = require('../models/schema');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Home page: show latest 6 published courses and all categories
exports.home = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate('instructor', 'firstName lastName email')
      .sort('-createdAt')
      .limit(6);
    const categories = await Course.distinct('category');
    res.render('home', {
      title: 'Welcome to Our Learning Platform',
      courses,
      categories,
      user: req.session.user,
      path: req.path
    });
  } catch (err) {
    console.error('Home page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the home page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// About page (static)
exports.about = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'firstName lastName profilePicture')
      .sort('-createdAt');
    const title = "About";
    res.render('about', { 
      title, 
      reviews, 
      user: req.session.user, 
      path: req.path,
      error: req.query.error,
      success: req.query.success
    });
  } catch (err) {
    console.error('About page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the about page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// All published courses
exports.getCourses = async (req, res) => {
  try {
    const limit = 2;
    const currentPage = parseInt(req.query.page) || 1;
    const skip = (currentPage - 1) * limit;
    const coursesCount = await Course.countDocuments({ isPublished: true });
    const courses = await Course.find({ isPublished: true }).skip(skip).limit(limit)
      .populate('instructor', 'firstName lastName email')
      .sort('-createdAt');

    const totalPages = Math.ceil(coursesCount / limit);
    console.log("totalPages", totalPages);
    res.render('courses', {
      title: 'Browse Courses',
      courses,
      totalPages,
      currentPage,
      user: req.session.user,
      path: req.path,
      likedCourses: req.session.likedCourses || []
    });
  } catch (err) {
    console.error('Get courses error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the courses.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Single course detail
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor')
      .populate({
        path: 'videos',
        options: { sort: { order: 1 } }
      });

    if (!course) {
      return res.status(404).render('404', {
        title: 'Course Not Found',
        message: 'The course you are looking for does not exist.',
        path: req.path
      });
    }

    const enrollment = await Enrollment.findOne({
      course: req.params.id,
      user: req.session.user?._id
    });
    
    const enrolled = enrollment !== null;

    res.render('course-detail', {
      title: course.title,
      course,
      enrolled,
      user: req.session.user,
      path: req.path
    });
  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the course.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName email')
      .populate({ path: 'lessons', populate: { path: 'videos' } });
    if (!course) {
      return res.status(404).render('404', {
        title: 'Course Not Found',
        message: 'The course you are looking for does not exist.',
        path: req.path
      });
    }
    let enrollment = await Enrollment.findOne({ course: req.params.id, user: req.session.user._id });
    if (!enrollment) {
      const user = await User.findOne({ _id: req.session.user._id });
      enrollment = new Enrollment({
        user,
        course,
        enrollmentDate: new Date(),
        completionDate: null,
        progress: 0,
        completedLessons: [],
        totalTimeSpent: 0,
        lastAccessedLesson: null,
        lastAccessedAt: new Date(),
        certificateIssued: false,
        status: "active"
      });
      await enrollment.save();
    }
    const enrolled = enrollment !== null;
    res.render('course-detail', {
      title: course.title,
      course,
      enrolled,
      user: req.session.user,
      path: req.path
    });
  } catch (err) {
    console.error('enroll course error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the course.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
}

// Create a new course (teacher only) - GET to show form
exports.createCourseGet = (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', {
        title: 'Unauthorized',
        message: 'Only teachers can create courses.',
        path: req.path
      });
    }
    res.render('create-course', {
      title: 'Create New Course',
      user: req.session.user,
      path: req.path
    });
  } catch (err) {
    console.error('Create course page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the create course page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Create a new course (teacher only) - POST to handle submission
exports.createCourse = async (req, res) => {
  try {
    // Reverted to secure method: using the logged-in user's session
    const course = new Course({
      title: req.body.title,
      description: req.body.description,
      instructor: req.session.user._id,
      thumbnail: req.file ? `/uploads/courses/thumbnails/${req.file.filename}` : undefined,
      category: req.body.category,
      level: req.body.level,
      price: req.body.price,
      shortDescription: req.body.shortDescription,
      duration: req.body.duration,
      requirements: req.body.requirements ? req.body.requirements.split(',').map(s => s.trim()) : [],
      whatYouWillLearn: req.body.whatYouWillLearn ? req.body.whatYouWillLearn.split(',').map(s => s.trim()) : [],
      isPublished: true
    });
    await course.save();
    res.redirect('/courses');
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t create the course.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Manage a course (teacher only) - GET to show management dashboard
exports.manageCourseGet = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      instructor: req.session.user._id
    }).populate('lessons');

    if (!course) {
      return res.status(404).render('404', {
        title: 'Course Not Found',
        message: 'You are not the instructor of this course or it does not exist.',
        path: req.path,
        user: req.session.user
      });
    }

    const studentCount = await Enrollment.countDocuments({ course: req.params.id });

    res.render('manage-course', {
      title: `Manage: ${course.title}`,
      course,
      studentCount,
      user: req.session.user,
      path: req.path
    });
  } catch (err) {
    console.error('Manage course page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Could not load the course management page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path,
      user: req.session.user
    });
  }
};

// Handle course details update from manage page
exports.updateCourseDetails = async (req, res) => {
  try {
    const { title, description } = req.body;
    await Course.findOneAndUpdate(
      { _id: req.params.id, instructor: req.session.user._id },
      { title, description, lastUpdated: Date.now() },
      { new: true, runValidators: true }
    );
    res.redirect(`/courses/${req.params.id}/manage`);
  } catch (err) {
    console.error('Update course details error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Could not update the course details.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path,
      user: req.session.user
    });
  }
};

// Handle adding a new lesson from manage page
exports.addLessonToCourse = async (req, res) => {
  try {
    const { title, description } = req.body;
    const course = await Course.findOne({ _id: req.params.id, instructor: req.session.user._id });

    if (!course) {
      return res.status(404).send('Course not found or you are not the instructor.');
    }

    const lesson = new Lesson({
      title,
      description,
      course: course._id
    });
    await lesson.save();

    course.lessons.push(lesson._id);
    await course.save();

    res.redirect(`/courses/${req.params.id}/manage`);
  } catch (err) {
    console.error('Add lesson error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Could not add the new lesson.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path,
      user: req.session.user
    });
  }
};

// Update a course (teacher only) - GET to show form
exports.updateCourseGet = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', {
        title: 'Unauthorized',
        message: 'Only teachers can update courses.',
        path: req.path
      });
    }
    const course = await Course.findOne({
      _id: req.params.id,
      instructor: req.session.user._id
    });
    if (!course) {
      return res.status(404).render('404', {
        title: 'Course Not Found',
        message: 'You do not have permission to edit this course.',
        path: req.path
      });
    }
    res.render('edit-course', {
      title: 'Edit Course',
      course,
      user: req.session.user,
      path: req.path
    });
  } catch (err) {
    console.error('Edit course page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the edit course page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Update a course (teacher only) - POST to handle submission
exports.updateCourse = async (req, res) => {
  try {
    const { title, description, price, videoUrl } = req.body;
    const courseId = req.params.id;

    // Validate input
    if (!title || !description || !price) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if course exists and belongs to the teacher
    const course = await Course.findOne({ _id: courseId, instructor: req.session.user._id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found or unauthorized' });
    }

    // Update course
    course.title = title;
    course.description = description;
    course.price = price;
    course.videoUrl = videoUrl;

    await course.save();

    res.json({ message: 'Course updated successfully', course });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Error updating course' });
  }
};

// Delete a course (teacher only)
exports.deleteCourse = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', {
        title: 'Unauthorized',
        message: 'Only teachers can delete courses.',
        path: req.path
      });
    }
    const course = await Course.findOne({
      _id: req.params.id,
      instructor: req.session.user._id
    });
    if (!course) {
      return res.status(404).render('404', {
        title: 'Course Not Found',
        message: 'You do not have permission to delete this course.',
        path: req.path
      });
    }
    await course.deleteOne(); // Use deleteOne instead of remove
    res.redirect('/courses');
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t delete the course.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Playlists controllers
exports.getPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({})
      .populate('course')
      .populate('videos');
    res.render('playlists', { playlists, user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Get playlists error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the playlists.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.getPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('course')
      .populate('videos');
    if (!playlist) return res.status(404).render('404', { path: req.path });
    res.render('playlist', { playlist, user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Get playlist error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the playlist.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Create a new playlist (teacher only) - GET to show form
exports.createPlaylistGet = (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', { title: 'Unauthorized', message: 'Only teachers can create playlists.', path: req.path });
    }
    res.render('create-playlist', { title: 'Create New Playlist', user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Create playlist page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the create playlist page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.createPlaylist = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', { title: 'Unauthorized', message: 'Only teachers can create playlists.', path: req.path });
    }
    const playlist = new Playlist({
      title: req.body.title,
      course: req.body.courseId,
      videos: req.body.videos || []
    });
    await playlist.save();
    res.redirect('/playlists');
  } catch (err) {
    console.error('Create playlist error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t create the playlist.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Update a playlist (teacher only) - GET to show form
exports.updatePlaylistGet = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', { title: 'Unauthorized', message: 'Only teachers can update playlists.', path: req.path });
    }
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).render('404', { path: req.path });
    res.render('edit-playlist', { title: 'Edit Playlist', playlist, user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Edit playlist page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the edit playlist page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.updatePlaylist = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', { title: 'Unauthorized', message: 'Only teachers can update playlists.', path: req.path });
    }
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).render('404', { path: req.path });
    playlist.title = req.body.title;
    playlist.course = req.body.courseId;
    playlist.videos = req.body.videos || [];
    await playlist.save();
    res.redirect(`/playlists/${req.params.id}`);
  } catch (err) {
    console.error('Update playlist error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t update the playlist.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.deletePlaylist = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', { title: 'Unauthorized', message: 'Only teachers can delete playlists.', path: req.path });
    }
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).render('404', { path: req.path });
    await playlist.deleteOne(); // Use deleteOne instead of remove
    res.redirect('/playlists');
  } catch (err) {
    console.error('Delete playlist error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t delete the playlist.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Videos controllers
exports.getVideos = async (req, res) => {
  try {
    const videos = await Video.find({})
      .populate('course')
      .populate('playlist');
    res.render('videos', { videos, user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Get videos error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the videos.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('course')
      .populate('playlist');
    if (!video) return res.status(404).render('404', { path: req.path });
    res.render('video', { video, user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Get video error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the video.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Create a new video (teacher only) - GET to show form
exports.createVideoGet = (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', { title: 'Unauthorized', message: 'Only teachers can create videos.', path: req.path });
    }
    res.render('create-video', { title: 'Create New Video', user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Create video page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the create video page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.createVideo = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', { title: 'Unauthorized', message: 'Only teachers can create videos.', path: req.path });
    }
    const video = new Video({
      title: req.body.title,
      course: req.body.courseId,
      playlist: req.body.playlistId,
      duration: req.body.duration,
      url: req.file ? `/uploads/videos/${req.file.filename}` : undefined // Correct path
    });
    await video.save();
    res.redirect('/videos');
  } catch (err) {
    console.error('Create video error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t create the video.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Update a video (teacher only) - GET to show form
exports.updateVideoGet = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', { title: 'Unauthorized', message: 'Only teachers can update videos.', path: req.path });
    }
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).render('404', { path: req.path });
    res.render('edit-video', { title: 'Edit Video', video, user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Edit video page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the edit video page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.updateVideo = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', { title: 'Unauthorized', message: 'Only teachers can update videos.', path: req.path });
    }
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).render('404', { path: req.path });
    video.title = req.body.title;
    video.course = req.body.courseId;
    video.playlist = req.body.playlistId;
    video.duration = req.body.duration;
    if (req.file) video.url = `/uploads/videos/${req.file.filename}`; // Correct path
    await video.save();
    res.redirect(`/videos/${req.params.id}`);
  } catch (err) {
    console.error('Update video error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t update the video.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'teacher') {
      return res.status(403).render('error', { title: 'Unauthorized', message: 'Only teachers can delete videos.', path: req.path });
    }
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).render('404', { path: req.path });
    await video.deleteOne(); // Use deleteOne instead of remove
    res.redirect('/videos');
  } catch (err) {
    console.error('Delete video error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t delete the video.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Teachers controllers
exports.teachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' });
    const title = 'Teachers';
    res.render('teachers', { title, teachers, user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Teachers page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the teachers.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.teacherProfile = async (req, res) => {
  try {
    const teacher = await User.findById(req.params.id);
    if (!teacher) return res.status(404).render('404', { path: req.path });
    const teacherCourses = await Course.find({ instructor: req.params.id });
    res.render('teacher_profile', { teacher, courses: teacherCourses, user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Teacher profile error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the teacher profile.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.playlist = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).render('404', { path: req.path });
    const tutor = await User.findById(course.instructor);
    if (!tutor) {
      return res.status(404).render('error', {
        title: 'Instructor Not Found',
        message: 'The instructor for this course could not be found.',
        path: req.path
      });
    }
    res.render('playlist', { course, tutor, user: req.session.user, path: req.path });
  } catch (err) {
    console.error('Playlist error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the playlist.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.watchVideo = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).render('404', {
        title: 'Course Not Found',
        message: 'The course associated with this video does not exist.',
        path: req.path
      });
    }

    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).render('404', {
        title: 'Video Not Found',
        message: 'The video you are looking for does not exist.',
        path: req.path
      });
    }

    // Get the next video in sequence
    const nextVideo = await Video.findOne({
      course: course._id,
      order: { $gt: video.order }
    }).sort({ order: 1 });

    const tutor = await User.findById(course.instructor);
    if (!tutor) {
      return res.status(404).render('error', {
        title: 'Instructor Not Found',
        message: 'The instructor for this course could not be found.',
        path: req.path
      });
    }

    // Get comments for the video
    const comments = await Comment.find({ video: video._id })
      .populate('user', 'firstName lastName profilePicture')
      .sort('-createdAt');

    res.render('watchvideo', {
      title: video.title,
      video,
      course,
      tutor,
      nextVideo,
      comments,
      user: req.session.user,
      path: req.path
    });
  } catch (err) {
    console.error('Watch video error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the video.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.profile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    // req.session.user already contains the user data, no need to fetch again unless refreshing
    const user = await User.findById(req.session.user._id);
    const enrollments = await Enrollment.find({ user: user._id });

    // Update session user data
    const userDTO = {
      _id: user._id,
      fullName: user.firstName + ' ' + user.lastName,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture || "/images/pic-1.jpg",
      enrolledCoursesCount: enrollments.length || 0,
      likedVideos: user.likedVideos || 0,
    };

    res.render('profile', { title: 'My Profile', user: userDTO, path: req.path });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load your profile.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.status(404).render('error', {
        title: 'User Not Found',
        message: 'Your user account could not be found.',
        path: req.path
      });
    }

    // Update user profile fields
    user.firstName = req.body.name ? req.body.name.split(' ')[0] : user.firstName;
    user.lastName = req.body.name ? req.body.name.split(' ').slice(1).join(' ') : user.lastName;
    user.email = req.body.email || user.email;
    user.bio = req.body.bio || user.bio;

    if (req.file) {
      user.profilePicture = `/uploads/${req.file.filename}`; // Correct path
    }

    await user.save();

    // Update session user data
    req.session.user = {
      _id: user._id,
      fullName: user.firstName + ' ' + user.lastName,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
    };

    res.redirect('/profile');
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t update your profile.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Update profile (render form - existing, no axios here)
exports.update = (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/login');
    res.render('edit-profile', { title: 'Edit Profile', user: req.session.user, path: req.path }); // Ensure this renders your edit-profile view
  } catch (err) {
    console.error('Update page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the update page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Login/Register GET/POST routes are already using direct DB calls.
// contactGet and contactPost are also likely fine.
exports.loginGet = (req, res) => {
  try {
    if (req.session.user) return res.redirect('/profile');
    const error = req.query.error || null;
    res.render('login', {
      title: 'Login',
      error,
      user: null, // Explicitly set user to null for login page
      path: req.path
    });
  } catch (err) {
    console.error('Login page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the login page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path,
      user: req.session.user || null
    });
  }
};

exports.loginPost = async (req, res) => {
  try {
    const { email, password, remember } = req.body;
    console.log('Login attempt:', { email, password });
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).render('login', {
        title: 'Login',
        error: 'Email and password are required.',
        user: null,
        path: req.path
      });
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password').exec();
    console.log('User found:', user ? user.email : 'No user');
    if (user) {
      console.log('Stored hash:', user.password);
      const match = await bcrypt.compare(password, user.password);
      console.log('Password match:', match);
      if (match) {
        req.session.user = {
          _id: user._id,
          fullName: user.firstName + ' ' + user.lastName,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
        };
        if (remember) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }
        return res.redirect('/profile');
      }
    }
    console.log('Invalid credentials');
    return res.status(401).render('login', {
      title: 'Login',
      error: 'Oops! Invalid email or password.',
      user: null,
      path: req.path
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Something went wrong during login.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path,
      user: req.session.user || null
    });
  }
};

exports.registerGet = (req, res) => {
  try {
    if (req.session.user) return res.redirect('/profile');
    res.render('register', { title: 'Register', error: req.query.error, path: req.path });
  } catch (err) {
    console.error('Register page error:', err);
    res.status(500).render('error', {
      message: 'Oops! Couldn\'t load the register page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.registerPost = async (req, res) => {
  const { name, email, password, confirm_password, role } = req.body;
  const values = { name, email, role }; // Store original input

  try {
    let profilePicture = null;
    if (req.file) {
      profilePicture = `/uploads/profiles/${req.file.filename}`;
    }

    if (password !== confirm_password) {
      return res.status(400).render('register', {
        title: 'Register',
        error: "Hmm, passwords don't match. Try again!",
        values,
        path: req.path
      });
    }

    if (await User.findOne({ email: email.toLowerCase() }).exec()) {
      return res.status(409).render('register', {
        title: 'Register',
        error: 'This email is already registered. Try logging in.',
        values,
        path: req.path
      });
    }

    const emailLower = email.toLowerCase();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const [firstName, ...lastName] = name.split(' ');

    const newUser = new User({
      email: emailLower,
      password: hashedPassword,
      role: role || 'student',
      firstName,
      lastName: lastName.join(' '),
      profilePicture
    });

    await newUser.save();

    req.session.user = {
      _id: newUser._id,
      fullName: name,
      email: newUser.email,
      role: newUser.role,
      profilePicture: newUser.profilePicture,
    };

    return res.redirect('/profile'); // Redirect to profile on success

  } catch (err) {
    console.error('Registration error details:', err);
    let errorMessage = 'Oops! Something went wrong during registration.';
    if (err.name === 'ValidationError') {
      errorMessage = Object.values(err.errors).map(error => error.message).join(' ');
    }
    
    res.status(500).render('register', {
        title: 'Register',
        error: errorMessage,
        values,
        path: req.path
    });
  }
};

exports.contactGet = (req, res) => {
  try {
    res.render('contact', { title: 'Contact Us', user: req.session.user, contactInfo: {}, path: req.path });
  } catch (err) {
    console.error('Contact page error:', err);
    res.status(500).render('error', {
      message: 'Oops! Couldn\'t load the contact page.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.contactPost = (req, res) => {
  try {
    const { name, email, number, msg } = req.body;

    // Validate required fields
    if (!name || !email || !number || !msg) {
      return res.status(400).render('contact', {
        title: 'Contact Us',
        user: req.session.user,
        error: 'All fields are required',
        contactInfo: req.body,
        path: req.path
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).render('contact', {
        title: 'Contact Us',
        user: req.session.user,
        error: 'Please enter a valid email address',
        contactInfo: req.body,
        path: req.path
      });
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(number.replace(/\D/g, ''))) {
      return res.status(400).render('contact', {
        title: 'Contact Us',
        user: req.session.user,
        error: 'Please enter a valid phone number (10-15 digits)',
        contactInfo: req.body,
        path: req.path
      });
    }

    // Log the contact message (in a real app, this would send an email)
    console.log('Contact form submission:', {
      name,
      email,
      number,
      message: msg,
      timestamp: new Date().toISOString()
    });

    // Render success message
    res.render('contact', {
      title: 'Contact Us',
      user: req.session.user,
      success: 'Thank you for your message! We will get back to you soon.',
      path: req.path
    });
  } catch (err) {
    console.error('Contact post error:', err);
    res.status(500).render('contact', {
      title: 'Contact Us',
      user: req.session.user,
      error: 'Oops! Something went wrong. Please try again later.',
      contactInfo: req.body,
      path: req.path
    });
  }
};

// Dashboard controller
exports.dashboard = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect('/login');
    }

    let data = {
      title: 'Dashboard',
      user: user,
      path: req.path
    };

    // If user is an instructor, get their courses
    if (user.role === 'teacher') {
      const courses = await Course.find({ instructor: user._id }).sort('-createdAt');
      data.courses = courses;
    }
    else {
      const enrollments = await Enrollment.find({ user: user._id })
        .populate({
          path: 'course',
          populate: { path: 'instructor', select: 'firstName lastName email' }
        })
        .sort('-enrolledAt');
      data.enrollments = enrollments;
    }
    res.render('dashboard', data);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load the dashboard.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Settings page controller
exports.settings = (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const message = req.session.message;
  req.session.message = null; // Clear the message after retrieving it
  res.render('settings', {
    title: 'Settings',
    user: req.session.user,
    path: req.path,
    message: message
  });
};

// Help Center page controller
exports.help = (req, res) => {
  res.render('help', { title: 'Help Center', user: req.session.user, path: req.path });
};

// Update profile picture
exports.updateProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (req.file) {
      // CONSTRUCT THE CORRECT, WEB-ACCESSIBLE PATH
      const profilePicturePath = `/uploads/profiles/${req.file.filename}`;
      user.profilePicture = profilePicturePath;
      await user.save();
      // Update the session to reflect the change immediately
      req.session.user.profilePicture = user.profilePicture;
    }
    res.redirect('/settings');
  } catch (err) {
    console.error('Update profile picture error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t update your profile picture.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Add multiple videos to a course
exports.addCourseVideos = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const videos = [
      {
        title: "HTML Tutorial for Beginners - Part 1",
        url: "https://youtu.be/6QAELgirvjs",
        duration: 1800, // 30 minutes
        order: 1,
        description: "Introduction to HTML and basic structure"
      },
      {
        title: "HTML Tutorial for Beginners - Part 2",
        url: "https://youtu.be/7LxA9qXUY5k",
        duration: 1800, // 30 minutes
        order: 2,
        description: "HTML elements and attributes"
      },
      {
        title: "HTML Tutorial for Beginners - Part 3",
        url: "https://youtu.be/QG5aEmS9Fu0",
        duration: 1800, // 30 minutes
        order: 3,
        description: "HTML forms and input elements"
      },
      {
        title: "HTML Tutorial for Beginners - Part 4",
        url: "https://youtu.be/dVgTBEYCseU",
        duration: 1800, // 30 minutes
        order: 4,
        description: "HTML tables and lists"
      }
    ];

    const createdVideos = [];
    for (const videoData of videos) {
      const video = new Video({
        ...videoData,
        course: courseId,
        videoType: 'youtube'
      });
      await video.save();
      createdVideos.push(video);
    }

    // Add videos to course
    course.videos.push(...createdVideos.map(v => v._id));
    await course.save();

    res.json({
      success: true,
      message: 'Videos added successfully',
      videos: createdVideos
    });
  } catch (err) {
    console.error('Add course videos error:', err);
    res.status(500).json({
      success: false,
      message: 'Error adding videos to course',
      error: err.message
    });
  }
};

// Create HTML course with videos
exports.createHTMLCourse = async (req, res) => {
  try {
    // Create the course
    const course = new Course({
      title: "Complete HTML Tutorial",
      description: "Learn HTML from scratch with this comprehensive tutorial series. Perfect for beginners who want to start their web development journey.",
      shortDescription: "Master HTML with this complete tutorial series",
      instructor: req.session.user._id,
      category: "Programming",
      level: "Beginner",
      price: 0,
      duration: "2 hours",
      requirements: ["No prior programming experience needed", "Basic computer skills"],
      whatYouWillLearn: [
        "HTML document structure",
        "HTML elements and attributes",
        "Forms and input elements",
        "Tables and lists"
      ],
      isPublished: true
    });

    await course.save();

    // Create and add videos
    const videos = [
      {
        title: "HTML Tutorial for Beginners - Part 1",
        url: "https://youtu.be/6QAELgirvjs",
        duration: 1800, // 30 minutes
        order: 1,
        description: "Introduction to HTML and basic structure"
      },
      {
        title: "HTML Tutorial for Beginners - Part 2",
        url: "https://youtu.be/7LxA9qXUY5k",
        duration: 1800, // 30 minutes
        order: 2,
        description: "HTML elements and attributes"
      },
      {
        title: "HTML Tutorial for Beginners - Part 3",
        url: "https://youtu.be/QG5aEmS9Fu0",
        duration: 1800, // 30 minutes
        order: 3,
        description: "HTML forms and input elements"
      },
      {
        title: "HTML Tutorial for Beginners - Part 4",
        url: "https://youtu.be/dVgTBEYCseU",
        duration: 1800, // 30 minutes
        order: 4,
        description: "HTML tables and lists"
      }
    ];

    const createdVideos = [];
    for (const videoData of videos) {
      const video = new Video({
        ...videoData,
        course: course._id,
        videoType: 'youtube'
      });
      await video.save();
      createdVideos.push(video);
    }

    // Add videos to course
    course.videos.push(...createdVideos.map(v => v._id));
    await course.save();

    res.redirect(`/courses/${course._id}`);
  } catch (err) {
    console.error('Create HTML course error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t create the HTML course.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Utility: Ensure HTML videos are linked to the course
exports.ensureHTMLVideos = async (req, res) => {
  try {
    const course = await Course.findOne({ title: "Complete HTML Tutorial" });
    if (!course) {
      return res.status(404).send('Course not found.');
    }

    // Video data
    const videoData = [
      {
        title: "HTML Tutorial for Beginners - Part 1",
        url: "https://youtu.be/6QAELgirvjs",
        duration: 1800,
        order: 1,
        description: "Introduction to HTML and basic structure"
      },
      {
        title: "HTML Tutorial for Beginners - Part 2",
        url: "https://youtu.be/7LxA9qXUY5k",
        duration: 1800,
        order: 2,
        description: "HTML elements and attributes"
      },
      {
        title: "HTML Tutorial for Beginners - Part 3",
        url: "https://youtu.be/QG5aEmS9Fu0",
        duration: 1800,
        order: 3,
        description: "HTML forms and input elements"
      },
      {
        title: "HTML Tutorial for Beginners - Part 4",
        url: "https://youtu.be/dVgTBEYCseU",
        duration: 1800,
        order: 4,
        description: "HTML tables and lists"
      }
    ];

    const createdVideoIds = [];
    for (const v of videoData) {
      let video = await Video.findOne({ url: v.url, course: course._id });
      if (!video) {
        video = new Video({ ...v, course: course._id, videoType: 'youtube' });
        await video.save();
      }
      createdVideoIds.push(video._id);
    }

    // Link videos to course (avoid duplicates)
    course.videos = createdVideoIds;
    await course.save();

    res.send('HTML videos ensured and linked to the course.');
  } catch (err) {
    console.error('Ensure HTML videos error:', err);
    res.status(500).send('Error ensuring HTML videos.');
  }
};

// Force-link provided YouTube videos to the Complete HTML Tutorial course
exports.forceLinkHTMLVideos = async (req, res) => {
  try {
    const course = await Course.findOne({ title: "Complete HTML Tutorial" });
    if (!course) {
      return res.status(404).send('Course not found.');
    }

    // Use the exact URLs from the user's screenshot
    const videoData = [
      {
        title: "HTML Tutorial for Beginners - Part 1",
        url: "https://youtu.be/6QAELgirvjs?si=ncQORQAUIXPIf1Uh",
        duration: 1800,
        order: 1,
        description: "Introduction to HTML and basic structure"
      },
      {
        title: "HTML Tutorial for Beginners - Part 2",
        url: "https://youtu.be/7LxA9qXUY5k?si=JAeXyS_G5EdamDf0",
        duration: 1800,
        order: 2,
        description: "HTML elements and attributes"
      },
      {
        title: "HTML Tutorial for Beginners - Part 3",
        url: "https://youtu.be/QG5aEmS9Fu0?si=YwTF2p1B7ULgfmEW",
        duration: 1800,
        order: 3,
        description: "HTML forms and input elements"
      },
      {
        title: "HTML Tutorial for Beginners - Part 4",
        url: "https://youtu.be/dVgTBEYCseU?si=XK-72E7OJClw67z5",
        duration: 1800,
        order: 4,
        description: "HTML tables and lists"
      }
    ];

    const createdVideoIds = [];
    for (const v of videoData) {
      let video = await Video.findOne({ url: v.url, course: course._id });
      if (!video) {
        video = new Video({ ...v, course: course._id, videoType: 'youtube' });
        await video.save();
      }
      createdVideoIds.push(video._id);
    }

    // Link videos to course (replace any existing videos)
    course.videos = createdVideoIds;
    await course.save();

    res.send('Videos force-linked to the Complete HTML Tutorial course.');
  } catch (err) {
    console.error('Force-link HTML videos error:', err);
    res.status(500).send('Error force-linking HTML videos.');
  }
};

// Add a single YouTube video to the Complete HTML Tutorial course
exports.addSingleHTMLVideo = async (req, res) => {
  try {
    const course = await Course.findOne({ title: "Complete HTML Tutorial" });
    if (!course) {
      return res.status(404).send('Course not found.');
    }
    const url = req.query.url || "https://youtu.be/6QAELgirvjs?si=koTHnS3lydIsNSun";
    let video = await Video.findOne({ url, course: course._id });
    if (!video) {
      video = new Video({
        title: "HTML Tutorial for Beginners - Part 1 (Updated)",
        url,
        duration: 1800,
        order: (course.videos && course.videos.length ? course.videos.length + 1 : 1),
        description: "Updated HTML introduction video",
        course: course._id,
        videoType: 'youtube'
      });
      await video.save();
      course.videos.push(video._id);
      await course.save();
    }
    res.send('Video added to the Complete HTML Tutorial course.');
  } catch (err) {
    console.error('Add single HTML video error:', err);
    res.status(500).send('Error adding single HTML video.');
  }
};

// Show liked courses page (expects ?ids=comma,separated,ids)
exports.likedCoursesPage = async (req, res) => {
  try {
    let ids = req.query.ids || '';
    ids = ids.split(',').filter(Boolean);
    const courses = ids.length > 0 ? await Course.find({ _id: { $in: ids } }) : [];
    res.render('liked-courses', {
      title: 'Liked Courses',
      courses,
      user: req.session.user,
      path: req.path
    });
  } catch (err) {
    console.error('Liked courses error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Oops! Couldn\'t load your liked courses.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

// Get all courses for the logged-in teacher
exports.getTeacherCourses = async (req, res) => {
  try {
    console.log(`Fetching courses for teacher ID: ${req.session.user._id}`);
    const teacherCourses = await Course.find({ instructor: req.session.user._id })
      .sort({ createdAt: -1 });
    console.log(`Found ${teacherCourses.length} courses.`);

    res.render('teacher-courses', {
      title: 'My Courses',
      courses: teacherCourses,
      user: req.session.user,
      path: req.path
    });
  } catch (err) {
    console.error('Get teacher courses error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Could not load your courses.',
      error: process.env.NODE_ENV === 'development' ? err : {},
      path: req.path
    });
  }
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        console.log('Current Password Input:', currentPassword);

        const user = await User.findById(req.session.user._id);

        if (!user) {
            req.session.message = { type: 'error', text: 'User not found.' };
            return res.redirect('/settings');
        }

        console.log('User found:', user.email);
        console.log('Stored Password Hash:', user.password);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        console.log('Password match result:', isMatch);

        if (!isMatch) {
            req.session.message = { type: 'error', text: 'Incorrect current password.' };
            return res.redirect('/settings');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        req.session.message = { type: 'success', text: 'Password updated successfully.' };
        res.redirect('/settings');
    } catch (err) {
        console.error('Update password error:', err);
        req.session.message = { type: 'error', text: 'Failed to update password.' };
        res.redirect('/settings');
    }
};

// Add review
exports.addReview = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const { rating, comment } = req.body;

    // Validate input
    if (!rating || !comment) {
      return res.redirect('/about?error=Please provide both rating and comment');
    }

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.redirect('/about?error=Rating must be between 1 and 5');
    }

    // Create new review
    const review = new Review({
      user: req.session.user._id,
      rating: ratingNum,
      comment: comment.trim()
    });

    await review.save();

    res.redirect('/about?success=Thank you for your review!');
  } catch (err) {
    console.error('Add review error:', err);
    res.redirect('/about?error=Failed to add review. Please try again.');
  }
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate input
        if (!name || !email || !password || !role) {
            return res.status(400).render('register', {
                title: 'Register',
                error: 'All fields are required',
                values: req.body
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).render('register', {
                title: 'Register',
                error: 'Email already registered',
                values: req.body
            });
        }

        // Validate role
        const validRoles = ['student', 'teacher', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).render('register', {
                title: 'Register',
                error: 'Invalid role selected',
                values: req.body
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role
        });

        await user.save();

        // Set user session
        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        // Redirect based on role
        switch (role) {
            case 'admin':
                res.redirect('/admin/dashboard');
                break;
            case 'teacher':
                res.redirect('/teacher/dashboard');
                break;
            default:
                res.redirect('/student/dashboard');
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).render('register', {
            title: 'Register',
            error: 'Error during registration',
            values: req.body
        });
    }
};