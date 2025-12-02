const express = require("express");
const router = express.Router();
const controlers = require("../controllers/MachineController");
const authMiddleware = require("../middlewares/AuthUser");
const multer = require("multer");

// Configure multer (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.match(/\.(xlsx|xls)$/)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed!"), false);
    }
  },
});

// to get machine details
router.get("/getMachiens", controlers.getMachineData);

// get machine data with limit
router.get("/getMachiensLimited", controlers.getMachineDataLimited);

// to search machine details
// router.get("/filter/:searchTerm", controlers.searchMachines);
router.get("/filter/:searchKey", controlers.searchMachines);

// to count machines
router.get("/countMachines", controlers.countMachines);

// to get machine types
router.get("/getMachineTypes", controlers.getMachineTypes);

// to create new mahcine
router.post("/createMachine", authMiddleware, controlers.createMachine);

// to edit machine
router.put("/editMachine/:mId", authMiddleware, controlers.editMachine);

// to delete machine
router.delete("/deleteMachine/:mId", authMiddleware, controlers.deleteMachine);

router.get("/getExcel", controlers.getExcelFile);

// !machine excel upload and handle
router.post(
  "/uploadExcel",
  upload.single("excelFile"),
  controlers.uploadMachines
);

// Add this to your routes for testing
router.post("/test-upload", upload.single("excelFile"), (req, res) => {
  console.log("=== TEST UPLOAD ===");
  console.log("File:", req.file);
  console.log("Body:", req.body);

  if (req.file) {
    return res.json({
      success: true,
      message: "File received successfully",
      file: {
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        buffer: req.file.buffer
          ? `Buffer of ${req.file.buffer.length} bytes`
          : "No buffer",
      },
    });
  } else {
    return res.status(400).json({
      success: false,
      error: "No file received",
    });
  }
});

module.exports = router;
