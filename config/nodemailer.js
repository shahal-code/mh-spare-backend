import nodemailer from "nodemailer";

// Initialize the transporter using the credentials we will receive from the user
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const sendOtpEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your TechKart Premium OTP Code",
            text: `Your TechKart Premium verification code is: ${otp}. It will expire in 2 minutes.`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #0f1624; padding: 20px; text-align: center;">
                        <span style="font-size: 32px; color: #0055ff;">⚡</span>
                        <h2 style="color: white; margin-top: 10px; font-weight: 800; letter-spacing: -0.5px;">TechKart Premium</h2>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff; color: #333333;">
                        <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
                        <p style="font-size: 16px; margin-bottom: 30px;">Your secure verification code to join TechKart Premium is:</p>
                        <div style="text-align: center; margin-bottom: 30px;">
                            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0055ff; background-color: #f0f5ff; padding: 15px 30px; border-radius: 8px; display: inline-block;">${otp}</span>
                        </div>
                        <p style="font-size: 14px; color: #666666; margin-bottom: 10px;">This code will expire in exactly 2 minutes.</p>
                        <p style="font-size: 14px; color: #666666;">If you didn't request this code, you can safely ignore this email.</p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
                        <p>© 2024 TechKart Inc. All rights reserved.</p>
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: ", info.messageId, " - OTP:", otp);
        return true;
    } catch (error) {
        console.error("Error sending OTP email:", error);
        console.log(`------------- MOCK SENDING (Config required) -------------`);
        console.log(`To: ${email} | OTP: ${otp}`);
        console.log(`----------------------------------------------------------`);
        return false;
    }
};

export const sendVerificationLink = async (email, link) => {
    try {
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your new TechKart email address",
            text: `Please verify your new email address by clicking this link: ${link}. It will expire in 15 minutes.`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #0f1624; padding: 20px; text-align: center;">
                        <span style="font-size: 32px; color: #0055ff;">✉️</span>
                        <h2 style="color: white; margin-top: 10px; font-weight: 800; letter-spacing: -0.5px;">TechKart Premium</h2>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff; color: #333333;">
                        <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
                        <p style="font-size: 16px; margin-bottom: 30px;">We received a request to change your TechKart account email to this address. Please verify it by clicking the secure link below:</p>
                        <div style="text-align: center; margin-bottom: 30px;">
                            <a href="${link}" style="font-size: 16px; font-weight: 600; color: #ffffff; background-color: #0657f9; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block; transition: background-color 0.3s;">Verify Email Address</a>
                        </div>
                        <p style="font-size: 14px; color: #666666; margin-bottom: 10px;">This link will expire in exactly 15 minutes.</p>
                        <p style="font-size: 14px; color: #666666; margin-bottom: 20px;">If the button doesn't work, copy and paste this link into your browser: <br><a href="${link}" style="color: #0657f9; word-break: break-all;">${link}</a></p>
                        <p style="font-size: 14px; color: #666666;">If you didn't request this change, you can safely ignore this email.</p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
                        <p>© ${new Date().getFullYear()} TechKart Inc. All rights reserved.</p>
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: ", info.messageId, " - Link:", link);
        return true;
    } catch (error) {
        console.error("Error sending verification link email:", error);
        console.log(`------------- MOCK SENDING (Config required) -------------`);
        console.log(`To: ${email} | Link: ${link}`);
        console.log(`----------------------------------------------------------`);
        return false;
    }
};
