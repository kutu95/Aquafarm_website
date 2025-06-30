import { Resend } from 'resend';
import { EmailTemplates } from '../components/EmailTemplates';

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailService = {
  // Send account confirmation email
  async sendConfirmationEmail(email, confirmationUrl) {
    try {
      const emailData = EmailTemplates.confirmAccount(email, confirmationUrl);
      
      const { data, error } = await resend.emails.send(emailData);
      
      if (error) {
        console.error('Resend error:', error);
        throw new Error(`Failed to send confirmation email: ${error.message}`);
      }
      
      console.log('Confirmation email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(email, resetUrl) {
    try {
      const emailData = EmailTemplates.resetPassword(email, resetUrl);
      
      const { data, error } = await resend.emails.send(emailData);
      
      if (error) {
        console.error('Resend error:', error);
        throw new Error(`Failed to send password reset email: ${error.message}`);
      }
      
      console.log('Password reset email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  },

  // Send application confirmation email
  async sendApplicationConfirmationEmail(email, applicationData) {
    try {
      const emailData = EmailTemplates.applicationConfirmation(email, applicationData);
      
      const { data, error } = await resend.emails.send(emailData);
      
      if (error) {
        console.error('Resend error:', error);
        throw new Error(`Failed to send application confirmation email: ${error.message}`);
      }
      
      console.log('Application confirmation email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  },

  // Test email service
  async testEmail(email) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Aquafarm <onboarding@resend.dev>',
        to: email,
        subject: 'Test Email from Aquafarm',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email to verify that Resend is working correctly.</p>
          <p>If you received this email, the email service is configured properly!</p>
        `
      });
      
      if (error) {
        console.error('Resend test error:', error);
        throw new Error(`Test email failed: ${error.message}`);
      }
      
      console.log('Test email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service test error:', error);
      throw error;
    }
  }
}; 