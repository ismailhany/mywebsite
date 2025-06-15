const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure upload directories exist
const uploadDirs = [
    path.join(__dirname, '../public/uploads'),
    path.join(__dirname, '../public/uploads/courses'),
    path.join(__dirname, '../public/uploads/lessons'),
    path.join(__dirname, '../public/uploads/profiles')
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads/courses'));
    },
    filename: function (req, file, cb) {
        // Create a more readable filename
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
        cb(null, fileName);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only allow one file
    }
}).single('thumbnail');

// Upload course thumbnail
router.post('/thumbnail', function(req, res) {
    console.log('Received request on /api/uploads/thumbnail');
    upload(req, res, function(err) {
        console.log('Inside multer callback');
        if (err) {
            console.error('Multer error:', err);
        }
        if (req.file) {
            console.log('File received by multer:', req.file);
        } else {
            console.log('No file received by multer.');
        }

        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size must be less than 5MB'
                });
            }
            return res.status(500).json({
                success: false,
                message: err.message
            });
        } else if (err) {
            // An unknown error occurred
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
        
        console.log('Checking for file presence after error handling.');
        // Everything went fine
        if (!req.file) {
            console.log('req.file is missing, sending 400.');
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Return the file path relative to public directory
        const filePath = `/uploads/courses/${req.file.filename}`;
        
        console.log('File upload successful, sending back path:', filePath);
        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                path: filePath
            }
        });
    });
});

module.exports = router;