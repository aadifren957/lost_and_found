const express = require("express");
const router = express.Router();

const {
    reportFoundItem,
    upload,
    getAllFoundItems,
    markAsReturned,
    getFoundItemsCount,
    getPendingMatchesCount,
    getReturnedItemsCount,
    getRecentMatchedItems
} = require("../controllers/foundController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// ================= ROUTES =================

// 🔐 Report found item (User)
router.post("/report", protect, upload.single("image"), reportFoundItem);

// 🔐 Get all found items (Admin or protected)
router.get("/", getAllFoundItems);

// 🔐 Mark item as returned (Admin only)
router.put("/:id/return", markAsReturned);
// 📊 Dashboard Stats (can keep protected OR public based on your need)
router.get("/count", getFoundItemsCount);
router.get("/pending-count", getPendingMatchesCount);
router.get("/returned-count", getReturnedItemsCount);
router.get("/recent-matched", getRecentMatchedItems);
module.exports = router;