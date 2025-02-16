import sgMail from '@sendgrid/mail';
import { User } from '@shared/schema';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendVerificationEmail(user: { email: string }, verificationToken: string) {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;

  const msg = {
    to: user.email,
    from: 'admin@marathiboli.com', // Updated sender email
    subject: 'Verify your email address',
    html: `
      <h1>Welcome to End User Guide!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log('Verification email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    if (error instanceof Error && 'response' in error) {
      const response = (error as any).response;
      if (response?.body) {
        console.error('SendGrid error response:', response.body);
      }
    }
    return false;
  }
}