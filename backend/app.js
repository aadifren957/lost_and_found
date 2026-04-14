const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const lostRoutes = require("./routes/lostRoutes");
const foundRoutes = require("./routes/foundRoutes"); // ✅ ADD THIS
const matchRoutes = require("./routes/matchRoutes");

const session = require("express-session");
const passport = require("passport");
require("./config/passport"); // Import passport config

const app = express();

app.use(cors({
    origin: "*"
}));
app.use(express.json());

// Session Middleware
app.use(session({
    secret: process.env.JWT_SECRET || "secret",
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/lost", lostRoutes);
app.use("/api/found", foundRoutes); // ✅ ADD THIS

app.use("/uploads", express.static("uploads"));
app.use("/api/matches", matchRoutes);
app.get("/", (req, res) => {
    res.send("API is running...");
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("GLOBAL ERROR:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
});

module.exports = app;