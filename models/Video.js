const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  url: {
    type: String,
    required: [true, 'Video URL is required'],
    trim: true
  },
  videoType: {
    type: String,
    enum: ['youtube', 'upload'],
    default: 'youtube'
  },
  youtubeId: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // in seconds
    required: [true, 'Video duration is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  playlist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist'
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

// Pre-save middleware to extract YouTube ID if it's a YouTube URL
videoSchema.pre('save', function(next) {
  if (this.videoType === 'youtube' && this.url) {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = this.url.match(youtubeRegex);
    if (match) {
      this.youtubeId = match[1];
    }
  }
  next();
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video; 
