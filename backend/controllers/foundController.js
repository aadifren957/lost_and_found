const multer = require("multer");
const path = require("path");
const FoundItem = require("../models/FoundItem");
const { getItemEmbedding } = require("../utils/aiMatcher");

// ================= FILE UPLOAD CONFIG =================
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

// ================= REPORT FOUND ITEM =================
exports.reportFoundItem = async (req, res) => {
    try {
        const { title, description, category, location, date } = req.body;

        // ✅ Validation
        if (!title || !category || !location) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        // 🔐 Get user from token
        const reportedBy = req.user.name; // (later upgrade → req.user._id)

        const image = req.file ? req.file.filename : null;

        const newItem = new FoundItem({
            title,
            description,
            category,
            location,
            date,
            image,
            reportedBy
        });

        // 🤖 Generate embedding
        const embedding = await getItemEmbedding(newItem);
        if (embedding) newItem.embedding = embedding;

        await newItem.save();

        res.status(201).json({
            message: "Found item reported successfully",
            item: newItem
        });

    } catch (error) {
        console.error("Report Found Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ================= MARK AS RETURNED =================
exports.markAsReturned = async (req, res) => {
    try {
        const item = await FoundItem.findById(req.params.id);

        // ❌ Item not found
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        // ❌ Already returned
        if (item.status === "returned") {
            return res.status(400).json({ message: "Item already returned" });
        }

        // ✅ Update status
        item.status = "returned";
        await item.save();

        res.json({
            message: "Item marked as returned",
            item
        });

    } catch (error) {
        console.error("Mark Returned Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ================= GET ALL FOUND ITEMS =================
exports.getAllFoundItems = async (req, res) => {
    try {
        const items = await FoundItem.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        console.error("Get Found Items Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ================= TOTAL FOUND ITEMS COUNT =================
exports.getFoundItemsCount = async (req, res) => {
    try {
        const count = await FoundItem.countDocuments();
        res.json({ count });
    } catch (error) {
        console.error("Count Found Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// ================= PENDING MATCHES COUNT =================
exports.getPendingMatchesCount = async (req, res) => {
    try {
        const count = await FoundItem.countDocuments({ status: "unmatched" });
        res.json({ count });
    } catch (error) {
        console.error("Pending Count Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// ================= RETURNED ITEMS COUNT =================
exports.getReturnedItemsCount = async (req, res) => {
    try {
        const count = await FoundItem.countDocuments({ status: "returned" });
        res.json({ count });
    } catch (error) {
        console.error("Returned Count Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getRecentMatchedItems = async (req, res) => {
    try {
        const items = await FoundItem
            .find({ status: "matched" }) 
            .sort({ createdAt: -1 })
            .limit(4);

        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};