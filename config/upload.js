const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage configuration
const createStorage = (uploadPath) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const fullPath = path.join(__dirname, '..', 'public', 'uploads', uploadPath);
      console.log('Creating upload directory:', fullPath);
      ensureDirectoryExists(fullPath);
      cb(null, fullPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const filename = file.fieldname + '-' + uniqueSuffix + extension;
      console.log('Generated filename:', filename);
      cb(null, filename);
    }
  });
};

// File filters
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
};

const videoFilter = (req, file, cb) => {
  const allowedTypes = /mp4|avi|mkv|mov|wmv|flv|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /video/.test(file.mimetype);

  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only video files are allowed'));
};

const documentFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|txt|rtf|odt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) return cb(null, true);
  cb(new Error('Only document files are allowed (pdf, doc, docx, txt, rtf, odt)'));
};

const generalFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mkv|mov|pdf|doc|docx|txt|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) return cb(null, true);
  cb(new Error('File type not allowed'));
};

// Upload configurations
const uploadConfigs = {
  profilePicture: multer({
    storage: createStorage('profiles'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFilter
  }),
  courseThumbnail: multer({
    storage: createStorage('courses/thumbnails'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFilter
  }),
  courseVideo: multer({
    storage: createStorage('courses/videos'),
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: videoFilter
  }),
  lessonVideo: multer({
    storage: createStorage('lessons/videos'),
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: videoFilter
  }),
  previewVideo: multer({
    storage: createStorage('courses/previews'),
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: videoFilter
  }),
  lessonResource: multer({
    storage: createStorage('lessons/resources'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: generalFilter
  }).array('resourceFiles', 10), // Allow multiple files
  assignmentSubmission: multer({
    storage: createStorage('assignments'),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: documentFilter
  }),
  general: multer({
    storage: createStorage('general'),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: generalFilter
  })
};

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File too large' });
    if (error.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, message: 'Too many files' });
    if (error.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ success: false, message: 'Unexpected field' });
  }
  if (error.message) return res.status(400).json({ success: false, message: error.message });
  next(error);
};

module.exports = { uploadConfigs, handleUploadError };