const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  order: {
    type: Number,
    required: [true, 'Lesson order is required']
  },
  type: {
    type: String,
    required: [true, 'Lesson type is required'],
    enum: ['video', 'text', 'quiz', 'assignment', 'resource']
  },
  content: {
    // For video lessons
    videoUrl: String,
    videoDuration: Number, // in seconds
    
    // For text lessons
    textContent: String,
    
    // For resources
    resourceFiles: [{
      filename: String,
      originalName: String,
      fileUrl: String,
      fileSize: Number,
      mimeType: String
    }],
    
    // For quizzes
    questions: [{
      question: {
        type: String,
        required: function() { return this.parent().type === 'quiz'; }
      },
      options: [{
        text: String,
        isCorrect: Boolean
      }],
      explanation: String,
      points: {
        type: Number,
        default: 1
      }
    }],
    
    // For assignments
    assignmentInstructions: String,
    maxScore: Number,
    dueDate: Date
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Lesson duration is required']
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  completionCriteria: {
    type: String,
    enum: ['view', 'quiz_pass', 'assignment_submit'],
    default: 'view'
  },
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['link', 'file', 'document']
    }
  }],
  notes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    timestamp: Number, // for video lessons
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimization
lessonSchema.index({ course: 1, order: 1 });
lessonSchema.index({ course: 1, isPublished: 1 });
lessonSchema.index({ type: 1 });

// Virtual for formatted duration
lessonSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Method to check if lesson is accessible to user
lessonSchema.methods.isAccessibleTo = function(user, course) {
  // Preview lessons are always accessible
  if (this.isPreview) return true;
  
  // Check if user is enrolled in the course
  const enrollment = user.enrolledCourses.find(
    enrollment => enrollment.course.toString() === course._id.toString()
  );
  
  return !!enrollment;
};

module.exports = mongoose.model('Lesson', lessonSchema);