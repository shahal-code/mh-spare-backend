import ContactInquiry from "../../models/contactInquiryModel.js";
import { sendContactInquiryEmail } from "../../config/nodemailer.js";

export const submitContactInquiry = async (req, res) => {
  try {
    const { name, email, phone, orderId, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required."
      });
    }

    // Save to DB
    const inquiry = await ContactInquiry.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : "",
      orderId: orderId ? orderId.trim() : "",
      message: message.trim()
    });

    // Send email to mhspare@gmail.com + user auto-reply
    await sendContactInquiryEmail({ name, email, phone, orderId, message });

    return res.status(201).json({
      success: true,
      message: "Your inquiry has been sent successfully to mhspare@gmail.com!",
      data: inquiry
    });
  } catch (error) {
    console.error("Contact Inquiry Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error submitting inquiry."
    });
  }
};
