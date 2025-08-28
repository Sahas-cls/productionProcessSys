const express = require("express");
const routes = express.Router();
const multer = require("multer");
const path = require("path");
const controller = require("../controllers/SubOpMediaController");

// Use memory storage instead of diskStorage to access req.body properly
const storage = multer.memoryStorage();

// Multer upload setup
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|webm/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype.toLowerCase());

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed (mp4, avi, mov, mkv, webm)"));
    }
  },
});

routes.get("/getVideos/:subOpId", controller.getVideos);

// to upload videos
routes.post("/uploadVideos", upload.single("video"), controller.uploadVideo);

// to delete videos
routes.delete("/deleteVideo/:so_media_id", controller.deleteVideo);

module.exports = routes;
