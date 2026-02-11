import 'dotenv/config';
import sendEmail from '../utils/sendEmail.js';

const testEmail = async () => {
    console.log("Starting email test...");
    console.log(`Using Email: ${process.env.EMAIL_USER}`);
    console.log(`Using App Password: ${process.env.EMAIL_APP_PASSWORD ? '********' : 'MISSING'}`);

    if (process.env.EMAIL_APP_PASSWORD === 'your-app-password') {
        console.error("ERROR: You are still using the placeholder 'your-app-password' in .env");
        return;
    }

    try {
        await sendEmail({
            email: process.env.EMAIL_USER,
            subject: "Money Manager - Test Email",
            message: "If you see this, your Gmail App Password configuration is working correctly!"
        });
        console.log("Test finished. Check the console for any errors or success messages from nodemailer.");
    } catch (error) {
        console.error("Test script caught an error:", error);
    }
};

testEmail();
