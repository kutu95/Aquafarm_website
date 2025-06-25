export function InvitationEmailTemplate({ userName, invitationLink, siteName }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${siteName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #1f2937;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          background-color: #3b82f6;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .button:hover {
          background-color: #2563eb;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to ${siteName}</h1>
      </div>
      
      <div class="content">
        <p>Hello${userName ? ` ${userName}` : ''},</p>
        
        <p>You have been invited to join ${siteName}. An administrator has created an account for you using this email address.</p>
        
        <p>To complete your account setup and set your password, please click the button below:</p>
        
        <div style="text-align: center;">
          <a href="${invitationLink}" class="button">Complete Account Setup</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${invitationLink}</p>
        
        <p>This link will expire in 24 hours for security reasons.</p>
        
        <p>If you have any questions, please contact the administrator.</p>
        
        <p>Best regards,<br>The ${siteName} Team</p>
      </div>
      
      <div class="footer">
        <p>This email was sent to you because an administrator invited you to join ${siteName}.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;
} 