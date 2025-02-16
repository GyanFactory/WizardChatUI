import nodemailer from 'nodemailer';
import { User } from '@shared/schema';

// Create a test account for development
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(user: User, verificationToken: string) {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: '"Chatbot App" <noreply@chatbotapp.com>',
    to: user.email,
    subject: "Verify your email address",
    html: `
      <h1>Welcome to Chatbot App!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}
