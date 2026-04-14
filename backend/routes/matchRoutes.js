const express = require("express");
const router = express.Router();
const {
    findMatchesOnDemand,
    getAllMatches,
    approveMatch,
    rejectMatch
} = require("../controllers/matchController");
const { protect } = require("../middleware/authMiddleware");

// Protected route
router.get("/find/:lostItemId", protect, findMatchesOnDemand);
router.get("/", getAllMatches);
router.put("/:id/approve", approveMatch);
router.delete("/:id/reject", rejectMatch);
module.exports = router;