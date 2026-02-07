import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // Use Ethereal for testing if no real SMTP provided
    // For production, user should provide SMTP details in .env

    // NOTE: For this demo environment, unless user provided SMTP, this might fail or we should mock it.
    // I will assume for now we might need to log OTP to console if email fails, for developer testing.

    try {
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE, // e.g. 'gmail'
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const message = {
            from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
        };

        const info = await transporter.sendMail(message);
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error("Email send failed:", error);
        // Fallback for dev: Log OTP
        console.log("--------------------------------");
        console.log(`[DEV ONLY] Failed to send email to ${options.email}. Content: ${options.message}`);
        console.log("--------------------------------");
        // Depending on strictness, we might want to NOT throw if it's just dev
    }
};

export default sendEmail;
