const mongoose = require("mongoose");
const User = require("../backend/models/User");
require("dotenv").config({ path: "./backend/.env" });

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const email = "admin.lostandfound@pccoepune.org";
        const user = await User.findOne({ email });
        
        if (user) {
            console.log("Found User:", {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                hasPassword: !!user.password,
                googleId: user.googleId
            });
        } else {
            console.log("User not found:", email);
        }
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

checkUser();
