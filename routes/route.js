// This is a dummy line to force module re-evaluation.
const express = require('express');
const control = require('../controllers/control');
const { uploadConfigs } = require('../config/upload');
const { isAuthenticated, isTeacher } = require('../middleware/roleCheck');

const router = express.Router();

// Public routes
router.get('/', control.home);
router.get('/about', control.about);
router.get('/contact', control.contactGet);

// Authentication routes
router.get('/login', control.loginGet);
router.post('/login', control.loginPost);
router.get('/register', control.registerGet);
router.post('/register', control.registerPost);
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to logout'
            });
        }
        res.redirect('/login');
    });
});

// Protected routes
console.log('Value of control.dashboard:', control.dashboard); // Debugging line
router.get('/dashboard', isAuthenticated, control.dashboard);
router.post('/courses/:id/enroll', isAuthenticated, control.enrollCourse);

// Teacher routes
router.get('/courses', control.getCourses);
router.get('/courses/create', isAuthenticated, isTeacher, control.createCourseGet);
router.post('/courses', isAuthenticated, isTeacher, uploadConfigs.courseThumbnail.single('thumbnail'), control.createCourse);
router.get('/courses/:id', control.getCourse);
router.get('/courses/:id/edit', isAuthenticated, isTeacher, control.updateCourseGet);
router.post('/courses/:id', isAuthenticated, isTeacher, uploadConfigs.courseThumbnail.single('thumbnail'), control.updateCourse);
router.post('/courses/:id/delete', isAuthenticated, isTeacher, control.deleteCourse);

// Add multiple videos to a course
router.post('/courses/:courseId/videos', isAuthenticated, isTeacher, control.addCourseVideos);

// Profile routes
router.get('/profile', isAuthenticated, control.profile);
router.get('/profile/edit', isAuthenticated, control.update);
router.post('/profile/edit', isAuthenticated,  control.updateProfile);

// Settings route
router.get('/settings', isAuthenticated, control.settings);
router.post('/update-profile-picture', isAuthenticated, control.updateProfilePicture);


// Help Center route
router.get('/help', control.help);

// Playlists routes
router.get('/playlists', control.getPlaylists);
router.get('/playlists/create', isAuthenticated, isTeacher, control.createPlaylistGet);
router.post('/playlists', isAuthenticated, isTeacher, control.createPlaylist);
router.get('/playlists/:id', control.getPlaylist);
router.get('/playlists/:id/edit', isAuthenticated, isTeacher, control.updatePlaylistGet);
router.post('/playlists/:id', isAuthenticated, isTeacher, control.updatePlaylist);
router.post('/playlists/:id/delete', isAuthenticated, isTeacher, control.deletePlaylist);

// Videos routes
router.get('/videos', control.getVideos);
router.get('/videos/create', isAuthenticated, isTeacher, control.createVideoGet);
router.post('/videos', isAuthenticated, isTeacher, uploadConfigs.courseVideo.single('video'), control.createVideo);
router.get('/videos/:id', control.getVideo);
router.get('/videos/:id/edit', isAuthenticated, isTeacher, control.updateVideoGet);
router.post('/videos/:id', isAuthenticated, isTeacher, uploadConfigs.courseVideo.single('video'), control.updateVideo);
router.post('/videos/:id/delete', isAuthenticated, isTeacher, control.deleteVideo);
router.get('/watchvideo/:courseId/:videoId', isAuthenticated, control.watchVideo);

// Teachers routes
router.get('/teachers', control.teachers);
router.get('/teacher/:id', control.teacherProfile);

// Create HTML course with videos
router.get('/create-html-course', isAuthenticated, isTeacher, control.createHTMLCourse);

// Utility: Ensure HTML videos are linked to the course
router.get('/admin/ensure-html-videos', isAuthenticated, isTeacher, control.ensureHTMLVideos);

// Utility: Force-link provided HTML videos to the course
router.get('/admin/force-link-html-videos', isAuthenticated, isTeacher, control.forceLinkHTMLVideos);

// Utility: Add a single YouTube video to the HTML course
router.get('/admin/add-single-html-video', isAuthenticated, isTeacher, control.addSingleHTMLVideo);

// Liked courses page
router.get('/liked-courses', control.likedCoursesPage);

// New POST route for syncing liked courses
router.post('/sync-liked-courses', (req, res) => {
    req.session.likedCourses = req.body.likedCourses || [];
    res.json({ success: true });
});

module.exports = router;



