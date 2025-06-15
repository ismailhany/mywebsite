const express = require('express');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const auth = require('../middleware/auth');
const router = express.Router();

// Get user dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'enrolledCourses.course',
        select: 'title thumbnail instructor duration',
        populate: {
          path: 'instructor',
          select: 'firstName lastName'
        }
      });

    // Get detailed enrollment data
    const enrollments = await Enrollment.find({ user: req.user.id })
      .populate('course', 'title thumbnail duration')
      .sort({ lastAccessedAt: -1 });

    // Calculate statistics
    const stats = {
      totalEnrolledCourses: enrollments.length,
      completedCourses: enrollments.filter(e => e.status === 'completed').length,
      inProgressCourses: enrollments.filter(e => e.status === 'active').length,
      totalTimeSpent: enrollments.reduce((sum, e) => sum + e.totalTimeSpent, 0),
      averageProgress: enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length || 0
    };

    // Get recent activity
    const recentEnrollments = enrollments.slice(0, 5);

    res.json({
      success: true,
      data: {
        user,
        stats,
        recentEnrollments
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user's enrolled courses
router.get('/enrolled-courses', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const filter = { user: req.user.id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [enrollments, totalEnrollments] = await Promise.all([
      Enrollment.find(filter)
        .populate('course', 'title thumbnail instructor duration price')
        .populate('course.instructor', 'firstName lastName')
        .sort({ enrollmentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Enrollment.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalEnrollments / parseInt(limit));

    res.json({
      success: true,
      data: {
        enrollments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalEnrollments,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get enrolled courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user's created courses (for instructors)
router.get('/created-courses', auth, async (req, res) => {
  try {
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const Course = require('../models/Course');
    
    const [courses, totalCourses] = await Promise.all([
      Course.find({ instructor: req.user.id })
        .select('title thumbnail price enrollmentCount averageRating isPublished createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Course.countDocuments({ instructor: req.user.id })
    ]);

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
    console.error('Get created courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update course progress
router.put('/course-progress/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId, timeSpent = 0, completed = false } = req.body;

    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      course: courseId
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (completed && lessonId) {
      enrollment.completeLesson(lessonId, timeSpent);
      await enrollment.calculateProgress();
      await enrollment.save();
    }

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        progress: enrollment.progress,
        completedLessons: enrollment.completedLessons.length
      }
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get learning statistics
router.get('/learning-stats', auth, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user.id });
    
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const recentEnrollments = enrollments.filter(
      e => e.enrollmentDate >= thirtyDaysAgo
    );

    const stats = {
      totalCourses: enrollments.length,
      completedCourses: enrollments.filter(e => e.status === 'completed').length,
      inProgressCourses: enrollments.filter(e => e.status === 'active').length,
      totalTimeSpent: enrollments.reduce((sum, e) => sum + e.totalTimeSpent, 0),
      averageProgress: enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length || 0,
      coursesThisMonth: recentEnrollments.length,
      timeSpentThisMonth: recentEnrollments.reduce((sum, e) => sum + e.totalTimeSpent, 0),
      streak: await calculateLearningStreak(req.user.id),
      categoryBreakdown: await getCategoryBreakdown(req.user.id)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Learning stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get list of teachers
router.get('/teachers', auth, async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', isActive: true }).select('-password');
    res.json({
      success: true,
      data: { teachers }
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get teacher profile by ID
router.get('/teacher/:id', auth, async (req, res) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher', isActive: true }).select('-password');
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.json({
      success: true,
      data: { teacher }
    });
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to calculate learning streak
async function calculateLearningStreak(userId) {
  const enrollments = await Enrollment.find({ user: userId })
    .sort({ lastAccessedAt: -1 });

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (let enrollment of enrollments) {
    const accessDate = new Date(enrollment.lastAccessedAt);
    accessDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((currentDate - accessDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === streak) {
      streak++;
    } else if (daysDiff > streak) {
      break;
    }
  }

  return streak;
}

// Helper function to get category breakdown
async function getCategoryBreakdown(userId) {
  const Course = require('../models/Course');
  
  const enrollments = await Enrollment.find({ user: userId })
    .populate('course', 'category');

  const categoryCount = {};
  
  enrollments.forEach(enrollment => {
    const category = enrollment.course.category;
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });

  return categoryCount;
}

module.exports = router;