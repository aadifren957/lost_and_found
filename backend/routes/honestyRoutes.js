const express = require("express");
const router = express.Router();

const {
    getPendingVerifications,
    verifyFoundItem,
    rejectFoundItem,
    getUserHonestyProfile,
    getLeaderboard,
    getLeaderboardByBadge,
    getTopUsersOfMonth,
    getBadgeStatistics
} = require("../controllers/honestyController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// ================= ADMIN VERIFICATION ROUTES =================

// Get pending verifications (Admin only)
router.get("/admin/pending", protect, adminOnly, getPendingVerifications);

// Verify found item and award honesty score (Admin only)
router.put("/admin/verify/:foundItemId", protect, adminOnly, verifyFoundItem);

// Reject found item (Admin only)
router.put("/admin/reject/:foundItemId", protect, adminOnly, rejectFoundItem);

// ================= USER HONESTY PROFILE ROUTES =================

// Get user honesty profile
router.get("/profile/:userId", getUserHonestyProfile);

// ================= LEADERBOARD ROUTES =================

// Get global leaderboard
router.get("/leaderboard", getLeaderboard);

// Get leaderboard by badge
router.get("/leaderboard/badge/:badge", getLeaderboardByBadge);

// Get top users of the month
router.get("/leaderboard/month/top", getTopUsersOfMonth);

// Get badge statistics
router.get("/stats/badges", getBadgeStatistics);

module.exports = router;
