const express = require('express');
const paymentService = require('../models/paymentService');
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const router = express.Router();

// Create payment intent for course enrollment
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: req.user.id,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Create payment intent
    const paymentResult = await PaymentService.createPaymentIntent(
      course.effectivePrice,
      'usd',
      {
        courseId: courseId,
        userId: req.user.id,
        courseName: course.title
      }
    );

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: paymentResult.error
      });
    }

    res.json({
      success: true,
      data: {
        clientSecret: paymentResult.clientSecret,
        paymentIntentId: paymentResult.paymentIntentId,
        amount: course.effectivePrice,
        courseName: course.title
      }
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Confirm payment and create enrollment
router.post('/confirm-payment', auth, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    // Confirm payment with Stripe
    const paymentResult = await PaymentService.confirmPayment(paymentIntentId);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: paymentResult.error
      });
    }

    if (paymentResult.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      user: req.user.id,
      course: paymentResult.metadata.courseId,
      paymentInfo: {
        transactionId: paymentIntentId,
        amount: paymentResult.amount,
        currency: paymentResult.currency,
        paymentMethod: 'stripe',
        paymentDate: new Date()
      }
    });

    // Update course enrollment count
    await Course.findByIdAndUpdate(
      paymentResult.metadata.courseId,
      { $inc: { enrollmentCount: 1 } }
    );

    // Add course to user's enrolled courses
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        enrolledCourses: {
          course: paymentResult.metadata.courseId,
          enrolledAt: new Date()
        }
      }
    });

    res.json({
      success: true,
      message: 'Payment confirmed and enrollment created',
      data: {
        enrollmentId: enrollment._id,
        transactionId: paymentIntentId
      }
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.stripeCustomerId) {
      return res.json({
        success: true,
        data: { payments: [] }
      });
    }

    const paymentHistory = await PaymentService.getPaymentHistory(
      user.stripeCustomerId,
      parseInt(req.query.limit) || 10
    );

    if (!paymentHistory.success) {
      return res.status(400).json({
        success: false,
        message: paymentHistory.error
      });
    }

    res.json({
      success: true,
      data: paymentHistory
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Process refund (admin only)
router.post('/refund', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { paymentIntentId, amount, reason } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    const refundResult = await PaymentService.processRefund(
      paymentIntentId,
      amount,
      reason
    );

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        message: refundResult.error
      });
    }

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: refundResult
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    
    const result = await PaymentService.handleWebhook(req.body, signature);
    
    if (result.success) {
      res.json({ received: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

module.exports = router;