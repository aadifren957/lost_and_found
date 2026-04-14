const express = require("express");
const router = express.Router();


const {
    reportLostItem,
    upload,
    getLostItemsCount,
    getMyLostItems
} = require("../controllers/lostController");

const { protect } = require("../middleware/authMiddleware");
const { getAllLostItems } = require("../controllers/lostController");
// Protected routes
router.post("/report", protect, upload.single("image"), reportLostItem);
router.get("/mine", protect, getMyLostItems);
router.get("/all", getAllLostItems);
// Public route
router.get("/count", getLostItemsCount);

module.exports = router;