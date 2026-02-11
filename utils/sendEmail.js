import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // Use Ethereal for testing if no real SMTP provided
    // For production, user should provide SMTP details in .env

    // NOTE: For this demo environment, unless user provided SMTP, this might fail or we should mock it.
    // I will assume for now we might need to log OTP to console if email fails, for developer testing.

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
        });

        const message = {
            from: `"Money Manager" <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: `<div>${options.message.replace(/\n/g, '<br>')}</div>`
        };

        const info = await transporter.sendMail(message);
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error("Email send failed:", error);
        // Fallback for dev: Log OTP
        console.log("--------------------------------");
        console.log(`[DEV ONLY] Failed to send email to ${options.email}. Content: ${options.message}`);
        console.log("--------------------------------");
    }
};

export default sendEmail;
