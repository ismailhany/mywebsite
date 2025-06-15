const express = require('express');
const router = express.Router();

// Example upload route (to be expanded)
router.post('/upload', (req, res) => {
  res.json({ message: 'Upload endpoint' });
});

module.exports = router;