const multer = require("multer");
const path = require("path");
const LostItem = require("../models/LostItem");
const { getItemEmbedding } = require("../utils/aiMatcher");
const axios = require("axios"); // ✅ ADD AT TOP OF FILE
// Storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

exports.upload = upload;

// ✅ Report Lost Item (SECURE)
exports.reportLostItem = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            location,
            date
        } = req.body;

        const reportedBy = req.user.name;
        const image = req.file ? req.file.filename : null;

        const newItem = new LostItem({
            title,
            description,
            category,
            location,
            date,
            image,
            reportedBy
        });

        // ✅ Generate embedding
        const embedding = await getItemEmbedding(newItem);
        if (embedding) newItem.embedding = embedding;

        await newItem.save();

        // 🔥🔥🔥 ADD THIS BLOCK (IMPORTANT)
        try {
            await axios.get(`http://127.0.0.1:${process.env.PORT || 5000}/api/matches/find/${newItem._id}`);
            console.log("✅ Matching triggered for lost item");
        } catch (matchError) {
            console.error("❌ Matching failed:", matchError.message);
        }
        // 🔥🔥🔥 END

        res.status(201).json({
            message: "Lost item reported successfully",
            item: newItem
        });

    } catch (error) {
        console.error("Report Lost Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// ✅ Count (public)
exports.getLostItemsCount = async (req, res) => {
    try {
        const count = await LostItem.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get ONLY logged-in user's items (SECURE)
exports.getMyLostItems = async (req, res) => {
    try {
        // 🔐 Get user from token
        const reportedBy = req.user.name;

        const items = await LostItem
            .find({ reportedBy })
            .sort({ createdAt: -1 });

        res.json(items);

    } catch (error) {
        console.error("Get My Items Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET ALL LOST ITEMS (Admin)
exports.getAllLostItems = async (req, res) => {
    try {
        const items = await LostItem.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};