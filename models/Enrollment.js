const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  completionDate: Date,
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completedLessons: [{
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    timeSpent: Number, // in minutes
    score: Number // for quizzes/assignments
  }],
  totalTimeSpent: {
    type: Number,
    default: 0 // in minutes
  },
  lastAccessedLesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateUrl: String,
  paymentInfo: {
    transactionId: String,
    amount: Number,
    currency: String,
    paymentMethod: String,
    paymentDate: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'dropped', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Compound indexes for optimization
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ user: 1, status: 1 });
enrollmentSchema.index({ course: 1, status: 1 });
enrollmentSchema.index({ enrollmentDate: -1 });

// Method to calculate progress
enrollmentSchema.methods.calculateProgress = async function() {
  const course = await mongoose.model('Course').findById(this.course).populate('lessons');
  if (!course || course.lessons.length === 0) {
    this.progress = 0;
    return;
  }

  const completedCount = this.completedLessons.length;
  const totalLessons = course.lessons.length;
  this.progress = Math.round((completedCount / totalLessons) * 100);
  
  // Mark as completed if 100% progress
  if (this.progress === 100 && !this.completionDate) {
    this.completionDate = new Date();
    this.status = 'completed';
  }
};

// Method to mark lesson as completed
enrollmentSchema.methods.completeLesson = function(lessonId, timeSpent = 0, score = null) {
  const existingCompletion = this.completedLessons.find(
    completion => completion.lesson.toString() === lessonId.toString()
  );

  if (!existingCompletion) {
    this.completedLessons.push({
      lesson: lessonId,
      completedAt: new Date(),
      timeSpent,
      score
    });
    this.totalTimeSpent += timeSpent;
  }

  this.lastAccessedLesson = lessonId;
  this.lastAccessedAt = new Date();
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);