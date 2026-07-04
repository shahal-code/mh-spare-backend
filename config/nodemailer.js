import nodemailer from "nodemailer";

// Initialize the transporter using the credentials we will receive from the user
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
    }
});

export const sendOtpEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: `"MH SPARE HUB" <${process.env.NODEMAILER_EMAIL}>`,
            to: email,
            subject: "Your MH SPARE HUB Verification Code",
            text: `Your MH SPARE HUB verification code is: ${otp}. It will expire in 2 minutes.`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; color: #ffffff;">
                    <div style="padding: 32px 24px; text-align: center; border-bottom: 1px solid #27272a;">
                        <div style="display: inline-block; background-color: rgba(6, 87, 249, 0.1); padding: 8px 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid rgba(6, 87, 249, 0.2);">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0657f9; letter-spacing: 1px;">MH <span style="color: #ffffff;">SPARE HUB</span></h1>
                        </div>
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Verify Your Identity</h2>
                    </div>
                    <div style="padding: 32px 24px;">
                        <p style="font-size: 16px; color: #a1a1aa; margin-bottom: 24px; text-align: center; line-height: 1.5;">You are one step away from accessing your <strong style="color: white;">MH SPARE HUB</strong> account. Enter the verification code below.</p>
                        <div style="text-align: center; margin-bottom: 32px;">
                            <div style="display: inline-block; background-color: rgba(6, 87, 249, 0.1); border: 1px solid rgba(6, 87, 249, 0.3); padding: 16px 32px; border-radius: 12px;">
                                <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #0657f9;">${otp}</span>
                            </div>
                        </div>
                        <p style="font-size: 14px; color: #71717a; text-align: center; margin-bottom: 8px;">This code will expire in 2 minutes.</p>
                        <p style="font-size: 14px; color: #71717a; text-align: center; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
                    </div>
                    <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #27272a;">
                        <p style="color: #71717a; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MH SPARE HUB. All rights reserved.</p>
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
            from: `"MH SPARE HUB" <${process.env.NODEMAILER_EMAIL}>`,
            to: email,
            subject: "Verify your new MH SPARE HUB email address",
            text: `Please verify your new email address by clicking this link: ${link}. It will expire in 15 minutes.`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; color: #ffffff;">
                    <div style="padding: 32px 24px; text-align: center; border-bottom: 1px solid #27272a;">
                        <div style="display: inline-block; background-color: rgba(6, 87, 249, 0.1); padding: 8px 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid rgba(6, 87, 249, 0.2);">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0657f9; letter-spacing: 1px;">MH <span style="color: #ffffff;">SPARE HUB</span></h1>
                        </div>
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Email Update Request</h2>
                    </div>
                    <div style="padding: 32px 24px;">
                        <p style="font-size: 16px; color: #a1a1aa; margin-bottom: 32px; text-align: center; line-height: 1.6;">We received a request to change your <strong style="color: white;">MH SPARE HUB</strong> account email to this address. Please verify it by clicking the secure button below.</p>
                        <div style="text-align: center; margin-bottom: 32px;">
                            <a href="${link}" style="display: inline-block; background-color: #0657f9; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 32px; border-radius: 12px; transition: opacity 0.2s;">Verify Email Address</a>
                        </div>
                        <p style="font-size: 14px; color: #71717a; text-align: center; margin-bottom: 16px;">This link will expire in exactly 15 minutes.</p>
                        <p style="font-size: 12px; color: #52525b; text-align: center; margin-bottom: 16px; word-break: break-all;">Or copy and paste this link: <br><a href="${link}" style="color: #0657f9; text-decoration: none;">${link}</a></p>
                        <p style="font-size: 14px; color: #71717a; text-align: center; margin: 0;">If you didn't request this change, you can safely ignore this email.</p>
                    </div>
                    <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #27272a;">
                        <p style="color: #71717a; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MH SPARE HUB. All rights reserved.</p>
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
