const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Playlist title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  videos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson' // Assuming videos are stored as Lessons
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  order: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Playlist = mongoose.model('Playlist', playlistSchema);

module.exports = Playlist; 