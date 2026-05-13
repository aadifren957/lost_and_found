const User = require("../models/User");
const FoundItem = require("../models/FoundItem");

// ================= BADGE ASSIGNMENT LOGIC =================
const getBadgeFromScore = (score) => {
    if (score < 21) return "Beginner Helper";
    if (score < 51) return "Trusted Contributor";
    if (score < 101) return "Campus Guardian";
    return "Platinum Honest User";
};

const calculateRewardPoints = (itemValue = "normal") => {
    const rewards = {
        "normal": 10,
        "valuable": 20,
        "critical": 30
    };
    return rewards[itemValue] || 10;
};

// ================= ADMIN: GET PENDING VERIFICATIONS =================
exports.getPendingVerifications = async (req, res) => {
    try {
        const pendingItems = await FoundItem
            .find({ verificationStatus: "Pending" })
            .populate("reportedByUserId", "name email honestyScore")
            .populate("matchedLostItem", "title description category")
            .sort({ createdAt: -1 });

        res.json({
            count: pendingItems.length,
            items: pendingItems
        });
    } catch (error) {
        console.error("Get Pending Verifications Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= ADMIN: VERIFY AND APPROVE FOUND ITEM =================
exports.verifyFoundItem = async (req, res) => {
    try {
        const { foundItemId } = req.params;
        const { adminNotes, physicallySubmitted, itemValue = "normal" } = req.body;

        // Validate
        if (!foundItemId) {
            return res.status(400).json({ message: "Found item ID required" });
        }

        const foundItem = await FoundItem.findById(foundItemId).populate("reportedByUserId");
        
        if (!foundItem) {
            return res.status(404).json({ message: "Found item not found" });
        }

        if (foundItem.rewardGranted) {
            return res.status(400).json({ message: "Reward already granted for this item" });
        }

        // ✅ Mark as verified
        foundItem.verificationStatus = "Verified";
        foundItem.physicallySubmitted = physicallySubmitted || false;
        foundItem.adminVerificationNotes = adminNotes;
        foundItem.verifiedBy = req.user.id;
        foundItem.verifiedAt = new Date();
        foundItem.rewardGranted = true;
        foundItem.status = "returned";

        await foundItem.save();

        // ================= GRANT HONESTY SCORE =================
        if (foundItem.reportedByUserId) {
            const user = foundItem.reportedByUserId;
            const pointsAwarded = calculateRewardPoints(itemValue);

            // Add points
            user.honestyScore += pointsAwarded;
            user.totalReturnedItems += 1;

            // Update badge
            const newBadge = getBadgeFromScore(user.honestyScore);
            user.currentBadge = newBadge;

            // Log score history
            user.scoreHistory.push({
                date: new Date(),
                action: "report_verified",
                pointsAwarded: pointsAwarded,
                foundItemId: foundItemId,
                description: `Verified found item: ${foundItem.title}`
            });

            await user.save();

            return res.json({
                message: "Found item verified successfully. Honesty score awarded!",
                foundItem,
                scoreUpdate: {
                    user: user.name,
                    newScore: user.honestyScore,
                    pointsAwarded: pointsAwarded,
                    newBadge: newBadge,
                    totalReturned: user.totalReturnedItems
                }
            });
        }

        res.json({
            message: "Found item verified successfully",
            foundItem
        });

    } catch (error) {
        console.error("Verify Found Item Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= ADMIN: REJECT FOUND ITEM =================
exports.rejectFoundItem = async (req, res) => {
    try {
        const { foundItemId } = req.params;
        const { rejectionReason } = req.body;

        if (!foundItemId) {
            return res.status(400).json({ message: "Found item ID required" });
        }

        const foundItem = await FoundItem.findById(foundItemId).populate("reportedByUserId");

        if (!foundItem) {
            return res.status(404).json({ message: "Found item not found" });
        }

        // ❌ Mark as rejected
        foundItem.verificationStatus = "Rejected";
        foundItem.rewardGranted = false;
        foundItem.rejectionReason = rejectionReason;
        foundItem.verifiedBy = req.user.id;
        foundItem.verifiedAt = new Date();

        await foundItem.save();

        // Log rejection in user's history (no points awarded)
        if (foundItem.reportedByUserId) {
            const user = foundItem.reportedByUserId;
            user.scoreHistory.push({
                date: new Date(),
                action: "report_rejected",
                pointsAwarded: 0,
                foundItemId: foundItemId,
                description: `Report rejected: ${rejectionReason}`
            });
            await user.save();
        }

        res.json({
            message: "Found item rejected. No honesty score awarded.",
            foundItem
        });

    } catch (error) {
        console.error("Reject Found Item Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= GET USER HONESTY PROFILE =================
exports.getUserHonestyProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select(
            "name email honestyScore currentBadge totalReturnedItems profilePic scoreHistory"
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Calculate progress to next badge
        const badgeThresholds = {
            "Beginner Helper": 20,
            "Trusted Contributor": 50,
            "Campus Guardian": 100,
            "Platinum Honest User": 100
        };

        const currentThreshold = badgeThresholds[user.currentBadge] || 0;
        const previousThreshold = user.currentBadge === "Beginner Helper" ? 0 :
                               user.currentBadge === "Trusted Contributor" ? 20 :
                               user.currentBadge === "Campus Guardian" ? 50 : 100;

        const nextThreshold = user.currentBadge === "Platinum Honest User" ? 
            user.honestyScore + 10 : 
            (user.currentBadge === "Beginner Helper" ? 20 : 
             user.currentBadge === "Trusted Contributor" ? 50 : 100);

        const progressToNextBadge = ((user.honestyScore - previousThreshold) / 
                                    (nextThreshold - previousThreshold)) * 100;

        res.json({
            user,
            badgeProgress: {
                currentBadge: user.currentBadge,
                currentScore: user.honestyScore,
                nextBadgeRequiredScore: nextThreshold,
                progressPercentage: Math.min(progressToNextBadge, 100)
            }
        });

    } catch (error) {
        console.error("Get User Honesty Profile Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= GET LEADERBOARD =================
exports.getLeaderboard = async (req, res) => {
    try {
        const { limit = 50, sortBy = "honestyScore" } = req.query;

        const leaderboard = await User
            .find({ role: "user" })
            .select("name email honestyScore currentBadge totalReturnedItems profilePic")
            .sort({ [sortBy]: -1 })
            .limit(parseInt(limit));

        // Add rank
        const rankedLeaderboard = leaderboard.map((user, index) => ({
            ...user.toObject(),
            rank: index + 1
        }));

        res.json({
            totalUsers: rankedLeaderboard.length,
            leaderboard: rankedLeaderboard
        });

    } catch (error) {
        console.error("Get Leaderboard Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= GET LEADERBOARD BY BADGE =================
exports.getLeaderboardByBadge = async (req, res) => {
    try {
        const { badge } = req.params;
        const validBadges = ["Beginner Helper", "Trusted Contributor", "Campus Guardian", "Platinum Honest User"];

        if (!validBadges.includes(badge)) {
            return res.status(400).json({ message: "Invalid badge" });
        }

        const users = await User
            .find({ currentBadge: badge, role: "user" })
            .select("name email honestyScore currentBadge totalReturnedItems profilePic")
            .sort({ honestyScore: -1 });

        const rankedUsers = users.map((user, index) => ({
            ...user.toObject(),
            rank: index + 1
        }));

        res.json({
            badge,
            count: rankedUsers.length,
            users: rankedUsers
        });

    } catch (error) {
        console.error("Get Leaderboard By Badge Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= GET TOP HONEST USERS OF THE MONTH =================
exports.getTopUsersOfMonth = async (req, res) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const users = await User.find({ role: "user" });

        // Calculate monthly score
        const monthlyScores = users.map(user => {
            const monthlyPoints = user.scoreHistory
                .filter(record => new Date(record.date) >= startOfMonth)
                .reduce((total, record) => total + record.pointsAwarded, 0);

            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePic: user.profilePic,
                currentBadge: user.currentBadge,
                monthlyScore: monthlyPoints,
                totalScore: user.honestyScore,
                totalReturned: user.totalReturnedItems
            };
        }).filter(u => u.monthlyScore > 0)
         .sort((a, b) => b.monthlyScore - a.monthlyScore)
         .slice(0, 10);

        const rankedUsers = monthlyScores.map((user, index) => ({
            ...user,
            rank: index + 1
        }));

        res.json({
            month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            topUsers: rankedUsers
        });

    } catch (error) {
        console.error("Get Top Users Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= GET BADGE STATISTICS =================
exports.getBadgeStatistics = async (req, res) => {
    try {
        const badges = ["Beginner Helper", "Trusted Contributor", "Campus Guardian", "Platinum Honest User"];
        
        const stats = {};
        for (const badge of badges) {
            stats[badge] = await User.countDocuments({ currentBadge: badge, role: "user" });
        }

        const totalUsers = await User.countDocuments({ role: "user" });
        const totalHonestyScore = await User.aggregate([
            { $match: { role: "user" } },
            { $group: { _id: null, total: { $sum: "$honestyScore" } } }
        ]);

        res.json({
            totalUsers,
            totalHonestyScore: totalHonestyScore[0]?.total || 0,
            badgeDistribution: stats
        });

    } catch (error) {
        console.error("Get Badge Statistics Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
