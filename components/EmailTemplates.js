export const EmailTemplates = {
  // Account confirmation email template
  confirmAccount: (email, confirmationUrl) => ({
    from: 'Aquafarm <onboarding@resend.dev>',
    to: email,
    subject: 'Confirm your Aquafarm account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirm your Aquafarm account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Aquafarm!</h1>
            </div>
            <div class="content">
              <h2>Confirm your account</h2>
              <p>Thank you for creating an account with Aquafarm. To complete your registration and access the volunteer application, please confirm your email address by clicking the button below:</p>
              
              <a href="${confirmationUrl}" class="button">Confirm Account</a>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>
              
              <p>This link will expire in 24 hours for security reasons.</p>
              
              <p>If you didn't create an account with Aquafarm, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 Aquafarm. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  // Password reset email template
  resetPassword: (email, resetUrl) => ({
    from: 'Aquafarm <onboarding@resend.dev>',
    to: email,
    subject: 'Reset your Aquafarm password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your Aquafarm password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Reset your password</h2>
              <p>We received a request to reset your password for your Aquafarm account. Click the button below to create a new password:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              
              <p>This link will expire in 1 hour for security reasons.</p>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>© 2024 Aquafarm. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  // Application confirmation email template
  applicationConfirmation: (email, applicationData) => ({
    from: 'Aquafarm <onboarding@resend.dev>',
    to: email,
    subject: 'Your Aquafarm volunteer application has been received',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Application Received - Aquafarm</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Received!</h1>
            </div>
            <div class="content">
              <h2>Thank you for your application</h2>
              <p>Dear ${applicationData.firstName} ${applicationData.lastName},</p>
              
              <p>We have received your volunteer application for Aquafarm. Our team will review your application and get back to you within 5-7 business days.</p>
              
              <h3>Application Details:</h3>
              <ul>
                <li><strong>Name:</strong> ${applicationData.firstName} ${applicationData.lastName}</li>
                <li><strong>Email:</strong> ${applicationData.email}</li>
                <li><strong>Age:</strong> ${applicationData.age}</li>
                <li><strong>Current Location:</strong> ${applicationData.currentLocation}</li>
                <li><strong>Country:</strong> ${applicationData.country}</li>
              </ul>
              
              <p>If you have any questions about your application, please don't hesitate to contact us.</p>
              
              <p>Best regards,<br>The Aquafarm Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Aquafarm. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
      </html>
    `
  })
}; 