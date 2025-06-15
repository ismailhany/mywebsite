const express = require('express');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const auth = require('../middleware/auth');
const paymentService = require('../models/paymentService');

const router = express.Router();

// Get all courses with filtering, sorting, and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      level,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      instructor
    } = req.query;

    // Build filter object
    const filter = { isPublished: true };

    if (category) filter.category = category;
    if (level) filter.level = level;
    if (instructor) filter.instructor = instructor;
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [courses, totalCourses] = await Promise.all([
      Course.find(filter)
        .populate('instructor', 'firstName lastName profilePicture')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Course.countDocuments(filter)
    ]);

    // Add weather data for featured courses (example of external API integration)
    if (page == 1 && !search) {
      try {
        const weatherData = await WeatherService.getCurrentWeather('New York');
        if (weatherData.success) {
          // You could use weather data to feature seasonal courses
          courses.forEach(course => {
            if (weatherData.data.temperature < 10 && course.category === 'Programming') {
              course.isFeatured = true;
              course.weatherContext = `Perfect indoor learning weather! ${weatherData.data.temperature}°C in ${weatherData.data.city}`;
            }
          });
        }
      } catch (error) {
        console.log('Weather API integration failed:', error.message);
      }
    }

    const totalPages = Math.ceil(totalCourses / parseInt(limit));

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCourses,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single course with lessons
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName profilePicture bio')
      .populate({
        path: 'lessons',
        select: 'title description duration order type isPreview',
        options: { sort: { order: 1 } }
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled (if authenticated)
    let isEnrolled = false;
    let userProgress = 0;
    
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const enrollment = await Enrollment.findOne({
          user: decoded.id,
          course: req.params.id
        });
        
        if (enrollment) {
          isEnrolled = true;
          userProgress = enrollment.progress;
        }
      } catch (error) {
        // Token invalid or expired, continue as unauthenticated
      }
    }

    // Filter lessons based on enrollment status
    if (!isEnrolled) {
      course.lessons = course.lessons.filter(lesson => lesson.isPreview);
    }

    res.json({
      success: true,
      data: {
        course,
        isEnrolled,
        userProgress
      }
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create new course (instructor/admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only instructors can create courses.'
      });
    }

    const courseData = {
      ...req.body,
      instructor: req.user.id
    };

    const course = await Course.create(courseData);
    
    // Add course to instructor's created courses
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, {
      $push: { createdCourses: course._id }
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    console.error('Create course error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update course
router.put('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user owns the course or is admin
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('instructor', 'firstName lastName');

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete course
router.delete('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user owns the course or is admin
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete associated lessons
    await Lesson.deleteMany({ course: req.params.id });
    
    // Delete enrollments
    await Enrollment.deleteMany({ course: req.params.id });
    
    // Remove from instructor's created courses
    const User = require('../models/User');
    await User.findByIdAndUpdate(course.instructor, {
      $pull: { createdCourses: req.params.id }
    });

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add review to course
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      course: req.params.id
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled to review this course'
      });
    }

    // Check if user already reviewed
    const existingReview = course.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this course'
      });
    }

    // Add review
    course.reviews.push({
      user: req.user.id,
      rating,
      comment,
      createdAt: new Date()
    });

    await course.save();

    res.json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get course analytics (instructor/admin only)
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get enrollment analytics
    const enrollments = await Enrollment.find({ course: req.params.id })
      .populate('user', 'firstName lastName email');

    const analytics = {
      totalEnrollments: enrollments.length,
      completedEnrollments: enrollments.filter(e => e.status === 'completed').length,
      averageProgress: enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length || 0,
      totalRevenue: enrollments.reduce((sum, e) => sum + (e.paymentInfo?.amount || 0), 0),
      enrollmentsByMonth: {},
      studentProgress: enrollments.map(e => ({
        student: e.user,
        progress: e.progress,
        enrolledAt: e.enrollmentDate,
        lastAccessed: e.lastAccessedAt
      }))
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Course analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add videos to a course
router.post('/:id/videos', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user owns the course or is admin
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { videos } = req.body;

    if (!videos || !Array.isArray(videos)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. "videos" must be an array of video objects.'
      });
    }

    const createdVideos = [];

    for (const videoData of videos) {
      const { title, url, duration } = videoData;

      if (!title || !url || !duration) {
        return res.status(400).json({
          success: false,
          message: 'Each video must have a title, url, and duration.'
        });
      }

      const video = new Video({
        title,
        url,
        duration,
        course: course._id
      });

      await video.save();
      createdVideos.push(video);
      course.videos.push(video._id);
    }

    await course.save();

    res.status(201).json({
      success: true,
      message: 'Videos added successfully',
      data: createdVideos
    });
  } catch (error) {
    console.error('Add videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
module.exports = router;