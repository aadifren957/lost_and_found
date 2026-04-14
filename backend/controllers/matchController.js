const LostItem = require("../models/LostItem");
const FoundItem = require("../models/FoundItem");
const MatchRequest = require("../models/MatchRequest");
const { scoreFromEmbeddings, getItemEmbedding } = require("../utils/aiMatcher");

// GET /api/matches/find/:lostItemId?limit=10
exports.findMatchesOnDemand = async (req, res) => {
    try {
        const { lostItemId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const lostItem = await LostItem.findById(lostItemId);
        if (!lostItem) {
            return res.status(404).json({ error: "Lost item not found" });
        }

        // ✅ Ensure lost item embedding exists
        if (!lostItem.embedding || lostItem.embedding.length === 0) {
            const emb = await getItemEmbedding(lostItem);
            if (emb) {
                lostItem.embedding = emb;
                await lostItem.save();
            }
        }

        const foundItems = await FoundItem.find();

        if (foundItems.length === 0) {
            return res.json({ lostItem, results: [] });
        }

        const scored = [];

        for (const found of foundItems) {
            // ✅ Ensure found item embedding exists
            if (!found.embedding || found.embedding.length === 0) {
                const emb = await getItemEmbedding(found);
                if (emb) {
                    found.embedding = emb;
                    await found.save();
                }
            }

            const score = scoreFromEmbeddings(lostItem, found);

            scored.push({
                foundItem: found,
                score
            });
        }

        // ✅ Sort by highest similarity
        scored.sort((a, b) => b.score - a.score);

        // 🔥 IMPORTANT FIX (you missed this earlier)
        const results = scored.slice(0, limit);

        // 🔥 Clear old matches for this lost item
        await MatchRequest.deleteMany({ lostItem: lostItem._id });

        // 🔥 Save new matches
        for (const r of results) {
            await MatchRequest.create({
                lostItem: lostItem._id,
                foundItem: r.foundItem._id,
                score: r.score
            });
        }

        res.json({ lostItem, results });

    } catch (error) {
        console.error("findMatchesOnDemand error:", error);
        res.status(500).json({ error: error.message });
    }
};

// GET /api/matches
exports.getAllMatches = async (req, res) => {
    try {
        const matches = await MatchRequest.find()
            .populate("lostItem")
            .populate("foundItem");

        res.json(matches);

    } catch (error) {
        console.error("getAllMatches error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// PUT /api/matches/:id/approve
exports.approveMatch = async (req, res) => {
    try {
        const match = await MatchRequest.findById(req.params.id);

        if (!match) {
            return res.status(404).json({ message: "Match not found" });
        }

        // ✅ Update Found Item → matched
        await FoundItem.findByIdAndUpdate(match.foundItem, {
            status: "matched"
        });

        // ✅ Update Lost Item → matched (optional but good)
        await LostItem.findByIdAndUpdate(match.lostItem, {
            status: "matched"
        });

        // ✅ Remove match request after approval
        await MatchRequest.findByIdAndDelete(req.params.id);

        res.json({ message: "Match approved successfully" });

    } catch (error) {
        console.error("approveMatch error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// DELETE /api/matches/:id/reject
exports.rejectMatch = async (req, res) => {
    try {
        const match = await MatchRequest.findById(req.params.id);

        if (!match) {
            return res.status(404).json({ message: "Match not found" });
        }

        // ✅ Simply delete match request
        await MatchRequest.findByIdAndDelete(req.params.id);

        res.json({ message: "Match rejected successfully" });

    } catch (error) {
        console.error("rejectMatch error:", error);
        res.status(500).json({ message: "Server error" });
    }
};