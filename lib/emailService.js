import { Resend } from 'resend';
import ReactDOMServer from 'react-dom/server';
import React from 'react';
import { EmailTemplates } from '../components/EmailTemplates';
import InvitationEmail from '../components/EmailTemplate';

const resend = new Resend(process.env.RESEND_API_KEY);

// Default email configuration
const DEFAULT_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL || 'noreply@aquafarm.au',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://aquafarm.au',
  adminName: 'Margaret River Aquafarm'
};

export const emailService = {
  // Core email sending function
  async sendEmail({ to, subject, html, from = DEFAULT_CONFIG.from, attachments = [] }) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
        attachments
      });
      
      if (error) {
        console.error('Resend error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }
      
      console.log('Email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  },

  // Send account confirmation email
  async sendConfirmationEmail(email, confirmationUrl) {
    try {
      const emailHtml = ReactDOMServer.renderToString(
        React.createElement(EmailTemplates.confirmAccount, {
          email: email,
          confirmationUrl: confirmationUrl
        })
      );
      
      return await this.sendEmail({
        to: email,
        subject: 'Confirm your Aquafarm account',
        html: emailHtml
      });
    } catch (error) {
      console.error('Confirmation email error:', error);
      throw error;
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(email, resetUrl) {
    try {
      const emailHtml = ReactDOMServer.renderToString(
        React.createElement(EmailTemplates.resetPassword, {
          email: email,
          resetUrl: resetUrl
        })
      );
      
      return await this.sendEmail({
        to: email,
        subject: 'Reset your Aquafarm password',
        html: emailHtml
      });
    } catch (error) {
      console.error('Password reset email error:', error);
      throw error;
    }
  },

  // Send application confirmation email
  async sendApplicationConfirmationEmail(email, applicationData) {
    try {
      const emailHtml = ReactDOMServer.renderToString(
        React.createElement(EmailTemplates.applicationConfirmation, {
          email: email,
          applicationData: applicationData
        })
      );
      
      return await this.sendEmail({
        to: email,
        subject: 'Your Aquafarm volunteer application has been received',
        html: emailHtml
      });
    } catch (error) {
      console.error('Application confirmation email error:', error);
      throw error;
    }
  },

  // Send user invitation email (for new users)
  async sendUserInvitation(email, invitationLink, adminName = DEFAULT_CONFIG.adminName) {
    try {
      const emailHtml = ReactDOMServer.renderToString(
        React.createElement(InvitationEmail, {
          invitationLink,
          adminName
        })
      );
      
      return await this.sendEmail({
        to: email,
        subject: 'Margaret River Aquafarm - Your Login Link',
        html: emailHtml
      });
    } catch (error) {
      console.error('User invitation email error:', error);
      throw error;
    }
  },

  // Send invitation resend email (for existing users)
  async sendInvitationResend(email, invitationLink, adminName = DEFAULT_CONFIG.adminName) {
    try {
      const emailHtml = ReactDOMServer.renderToString(
        React.createElement(InvitationEmail, {
          invitationLink,
          adminName
        })
      );
      
      return await this.sendEmail({
        to: email,
        subject: 'Welcome to Margaret River Aquafarm - Complete Your Account Setup',
        html: emailHtml
      });
    } catch (error) {
      console.error('Invitation resend email error:', error);
      throw error;
    }
  },

  // Send admin notification email
  async sendAdminNotification(adminEmail, subject, message, data = {}) {
    try {
      const emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; border: 1px solid #e9ecef;">
              <h1 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">${subject}</h1>
              <div style="font-size: 16px; margin-bottom: 20px;">
                ${message}
              </div>
              ${Object.keys(data).length > 0 ? `
                <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; margin-top: 20px;">
                  <h3 style="margin-top: 0;">Additional Information:</h3>
                  <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
                </div>
              ` : ''}
              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;" />
              <p style="font-size: 14px; color: #6c757d; text-align: center; font-weight: bold;">Margaret River Aquafarm</p>
            </div>
          </body>
        </html>
      `;
      
      return await this.sendEmail({
        to: adminEmail,
        subject: `Admin Notification: ${subject}`,
        html: emailHtml
      });
    } catch (error) {
      console.error('Admin notification email error:', error);
      throw error;
    }
  },

  // Send custom notification email
  async sendCustomNotification(email, subject, message, options = {}) {
    try {
      const {
        template = 'default',
        data = {},
        attachments = [],
        from = DEFAULT_CONFIG.from
      } = options;

      let emailHtml;
      
      if (template === 'default') {
        emailHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; border: 1px solid #e9ecef;">
                <h1 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">${subject}</h1>
                <div style="font-size: 16px; margin-bottom: 20px;">
                  ${message}
                </div>
                ${Object.keys(data).length > 0 ? `
                  <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; margin-top: 20px;">
                    <h3 style="margin-top: 0;">Additional Information:</h3>
                    <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
                  </div>
                ` : ''}
                <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;" />
                <p style="font-size: 14px; color: #6c757d; text-align: center; font-weight: bold;">Margaret River Aquafarm</p>
              </div>
            </body>
          </html>
        `;
      } else {
        // Use custom template if provided
        emailHtml = template;
      }
      
      return await this.sendEmail({
        to: email,
        subject,
        html: emailHtml,
        from,
        attachments
      });
    } catch (error) {
      console.error('Custom notification email error:', error);
      throw error;
    }
  },

  // Send bulk emails (with rate limiting)
  async sendBulkEmails(emails, subject, message, options = {}) {
    const results = [];
    const { delay = 1000, batchSize = 10 } = options; // 1 second delay between emails, 10 emails per batch
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (email) => {
        try {
          const result = await this.sendCustomNotification(email, subject, message, options);
          return { email, success: true, data: result };
        } catch (error) {
          return { email, success: false, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  },

  // Test email service
  async testEmail(email) {
    try {
      return await this.sendEmail({
        to: email,
        subject: 'Test Email from Aquafarm',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email to verify that Resend is working correctly.</p>
          <p>If you received this email, the email service is configured properly!</p>
        `
      });
    } catch (error) {
      console.error('Email service test error:', error);
      throw error;
    }
  },

  // Get email configuration
  getConfig() {
    return DEFAULT_CONFIG;
  },

  // Validate email address
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Admin notification methods
  async notifyAdminsOfNewUser(userData) {
    try {
      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length === 0) {
        console.warn('No admin emails found for new user notification');
        return;
      }

      const subject = 'New User Registration - Margaret River Aquafarm';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">🌱 New User Registration</h2>
          <p>A new user has registered on the Margaret River Aquafarm website.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">User Details:</h3>
            <p><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</p>
            <p><strong>Email:</strong> ${userData.email}</p>
            <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>You can review and manage users in the <a href="${DEFAULT_CONFIG.siteUrl}/admin/users" style="color: #007bff;">Admin Panel</a>.</p>
          
          <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
          <p style="color: #6c757d; font-size: 12px;">This is an automated notification from Margaret River Aquafarm.</p>
        </div>
      `;

      await this.sendBulkEmails(adminEmails, subject, html);
      console.log(`Admin notification sent for new user: ${userData.email}`);
    } catch (error) {
      console.error('Failed to send admin notification for new user:', error);
      throw new Error(`Failed to send admin notification: ${error.message}`);
    }
  },

  async notifyAdminsOfNewApplication(applicationData) {
    try {
      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length === 0) {
        console.warn('No admin emails found for new application notification');
        return;
      }

      const subject = 'New Volunteer Application - Margaret River Aquafarm';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">🌱 New Volunteer Application</h2>
          <p>A new volunteer application has been submitted on the Margaret River Aquafarm website.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Application Details:</h3>
            <p><strong>Applicant:</strong> ${applicationData.full_name}</p>
            <p><strong>Email:</strong> ${applicationData.email}</p>
            <p><strong>Phone:</strong> ${applicationData.phone_country_code} ${applicationData.phone_number}</p>
            <p><strong>Location:</strong> ${applicationData.current_city}, ${applicationData.current_country}</p>
            <p><strong>Age:</strong> ${applicationData.age}</p>
            <p><strong>Preferred Start Date:</strong> ${applicationData.preferred_start_date}</p>
            <p><strong>Application ID:</strong> ${applicationData.id}</p>
            <p><strong>Submission Date:</strong> ${new Date(applicationData.created_at).toLocaleDateString()}</p>
          </div>
          
          <p>You can review this application in the <a href="${DEFAULT_CONFIG.siteUrl}/volunteer-applications" style="color: #007bff;">Volunteer Applications</a> section.</p>
          
          <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
          <p style="color: #6c757d; font-size: 12px;">This is an automated notification from Margaret River Aquafarm.</p>
        </div>
      `;

      await this.sendBulkEmails(adminEmails, subject, html);
      console.log(`Admin notification sent for new application: ${applicationData.id}`);
    } catch (error) {
      console.error('Failed to send admin notification for new application:', error);
      throw new Error(`Failed to send admin notification: ${error.message}`);
    }
  },

  async notifyAdminsOfNewInduction(inductionData) {
    try {
      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length === 0) {
        console.warn('No admin emails found for new induction notification');
        return;
      }

      const subject = 'New Volunteer Induction - Margaret River Aquafarm';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">🌱 New Volunteer Induction</h2>
          <p>A new volunteer induction has been submitted on the Margaret River Aquafarm website.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Induction Details:</h3>
            <p><strong>Volunteer:</strong> ${inductionData.full_name}</p>
            <p><strong>Email:</strong> ${inductionData.email}</p>
            <p><strong>Induction ID:</strong> ${inductionData.id}</p>
            <p><strong>Submission Date:</strong> ${new Date(inductionData.created_at).toLocaleDateString()}</p>
          </div>
          
          <p>You can review this induction in the <a href="${DEFAULT_CONFIG.siteUrl}/volunteer-inductions" style="color: #007bff;">Volunteer Inductions</a> section.</p>
          
          <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
          <p style="color: #6c757d; font-size: 12px;">This is an automated notification from Margaret River Aquafarm.</p>
        </div>
      `;

      await this.sendBulkEmails(adminEmails, subject, html);
      console.log(`Admin notification sent for new induction: ${inductionData.id}`);
    } catch (error) {
      console.error('Failed to send admin notification for new induction:', error);
      throw new Error(`Failed to send admin notification: ${error.message}`);
    }
  },

  // Helper method to get admin emails from database
  async getAdminEmails() {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: admins, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'admin');

      if (error) {
        console.error('Error fetching admin emails:', error);
        return [];
      }

      return admins.map(admin => admin.email).filter(Boolean);
    } catch (error) {
      console.error('Failed to get admin emails:', error);
      return [];
    }
  },
}; 