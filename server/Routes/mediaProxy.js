// routes/mediaProxy.js
const express = require('express');
const router = express.Router();
const path = require('path');
const AWS = require('aws-sdk');

// Initialize S3
const s3 = new AWS.S3({
  endpoint: 'https://s3.eu-central-003.backblazeb2.com',
  region: 'eu-central-003',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY
  },
  s3ForcePathStyle: true
});

// FIXED: Use just '*' or ':filePath(*)'
router.get('/:*', async (req, res) => {
  try {
    // Get the full path after /media/
    // Example: /media/StyleImages/file.jpg → StyleImages/file.jpg
    const filePath = req.path.substring(1);
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    console.log('Fetching from B2:', filePath);
    
    const params = {
      Bucket: process.env.B2_BUCKET_NAME,
      Key: filePath
    };
    
    const fileObject = await s3.getObject(params).promise();
    
    // Set headers
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    // Set content type
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".png": "image/png", ".gif": "image/gif",
      ".webp": "image/webp", ".bmp": "image/bmp",
      ".tiff": "image/tiff", ".svg": "image/svg+xml"
    };
    
    res.setHeader("Content-Type", mimeTypes[ext] || 'application/octet-stream');
    
    // Send file
    res.send(fileObject.Body);
    
  } catch (error) {
    console.error('B2 Proxy Error:', error.message);
    
    if (error.code === 'NoSuchKey') {
      res.status(404).json({ error: 'File not found' });
    } else if (error.code === 'AccessDenied') {
      res.status(403).json({ error: 'Access denied' });
    } else {
      res.status(500).json({ error: 'Failed to fetch file' });
    }
  }
});

module.exports = router;