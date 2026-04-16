const nodemailer = require("nodemailer");

// Configure the transporter
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send OTP Verification Email
 * @param {string} email 
 * @param {string} otp 
 */
exports.sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"Smart Lost and Found System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Email Verification OTP",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4A90E2; text-align: center;">Email Verification</h2>
                <p>Hello,</p>
                <p>Your OTP for <strong>Smart Lost and Found System</strong> is:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; display: inline-block;">${otp}</span>
                </div>
                <p>This OTP is valid for <strong>5 minutes</strong>. Please do not share this with anyone.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2024-2025 Smart Lost and Found System. All rights reserved.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error sending OTP email:", error);
        throw new Error("Could not send OTP email");
    }
};

/**
 * Send Welcome Email
 * @param {string} email 
 * @param {string} name 
 */
exports.sendWelcomeEmail = async (email, name) => {
    const mailOptions = {
        from: `"Smart Lost and Found System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome to Smart Lost and Found System 🎉",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4A90E2; text-align: center;">Welcome, ${name}!</h2>
                <p>Congratulations! Your account has been successfully created on <strong>Smart Lost and Found System</strong>.</p>
                <p>You can now log in and start using the platform to report and track lost items.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/user-login.html" style="background-color: #4A90E2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login Now</a>
                </div>
                <p>If you have any questions, feel free to contact our support team.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2024-2025 Smart Lost and Found System. All rights reserved.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error sending welcome email:", error);
        // We don't necessarily want to throw here as the account is already created
    }
};
