import React from 'react';

export const EmailTemplates = {
  // Account confirmation email template
  confirmAccount: ({ email, confirmationUrl }) => (
    <html>
      <body style={{ 
        fontFamily: 'Arial, sans-serif', 
        lineHeight: '1.6', 
        color: '#333',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '30px', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h1 style={{ 
            color: '#10b981', 
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Welcome to Aquafarm!
          </h1>
          
          <div style={{ 
            backgroundColor: '#ffffff', 
            padding: '20px', 
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>Confirm your account</h2>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Thank you for creating an account with Aquafarm. To complete your registration and access the volunteer application, please confirm your email address by clicking the button below:
            </p>
            
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <a 
                href={confirmationUrl}
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  padding: '12px 30px',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}
              >
                Confirm Account
              </a>
            </div>
            
            <p style={{ fontSize: '14px', marginBottom: '15px' }}>
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style={{ fontSize: '14px', wordBreak: 'break-all' }}>
              <a href={confirmationUrl} style={{ color: '#10b981' }}>{confirmationUrl}</a>
            </p>
            
            <p style={{ fontSize: '14px', color: '#6c757d', marginTop: '20px' }}>
              This link will expire in 24 hours for security reasons.
            </p>
            
            <p style={{ fontSize: '14px', color: '#6c757d' }}>
              If you didn't create an account with Aquafarm, you can safely ignore this email.
            </p>
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '30px 0' }} />
          
          <p style={{ fontSize: '14px', color: '#6c757d', textAlign: 'center', fontWeight: 'bold' }}>
            © 2024 Aquafarm. All rights reserved.
          </p>
          <p style={{ fontSize: '14px', color: '#6c757d', textAlign: 'center' }}>
            This email was sent to {email}
          </p>
        </div>
      </body>
    </html>
  ),

  // Password reset email template
  resetPassword: ({ email, resetUrl }) => (
    <html>
      <body style={{ 
        fontFamily: 'Arial, sans-serif', 
        lineHeight: '1.6', 
        color: '#333',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '30px', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h1 style={{ 
            color: '#10b981', 
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Password Reset Request
          </h1>
          
          <div style={{ 
            backgroundColor: '#ffffff', 
            padding: '20px', 
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>Reset your password</h2>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              We received a request to reset your password for your Aquafarm account. Click the button below to create a new password:
            </p>
            
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <a 
                href={resetUrl}
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  padding: '12px 30px',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}
              >
                Reset Password
              </a>
            </div>
            
            <p style={{ fontSize: '14px', marginBottom: '15px' }}>
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style={{ fontSize: '14px', wordBreak: 'break-all' }}>
              <a href={resetUrl} style={{ color: '#10b981' }}>{resetUrl}</a>
            </p>
            
            <p style={{ fontSize: '14px', color: '#6c757d', marginTop: '20px' }}>
              This link will expire in 1 hour for security reasons.
            </p>
            
            <p style={{ fontSize: '14px', color: '#6c757d' }}>
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '30px 0' }} />
          
          <p style={{ fontSize: '14px', color: '#6c757d', textAlign: 'center', fontWeight: 'bold' }}>
            © 2024 Aquafarm. All rights reserved.
          </p>
          <p style={{ fontSize: '14px', color: '#6c757d', textAlign: 'center' }}>
            This email was sent to {email}
          </p>
        </div>
      </body>
    </html>
  ),

  // Application confirmation email template
  applicationConfirmation: ({ email, applicationData }) => (
    <html>
      <body style={{ 
        fontFamily: 'Arial, sans-serif', 
        lineHeight: '1.6', 
        color: '#333',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '30px', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h1 style={{ 
            color: '#10b981', 
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Application Received!
          </h1>
          
          <div style={{ 
            backgroundColor: '#ffffff', 
            padding: '20px', 
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>Thank you for your application</h2>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Dear {applicationData.firstName} {applicationData.lastName},
            </p>
            
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              We have received your volunteer application for Aquafarm. Our team will review your application and get back to you within 5-7 business days.
            </p>
            
            <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>Application Details:</h3>
            <ul style={{ fontSize: '14px', marginBottom: '20px' }}>
              <li><strong>Name:</strong> {applicationData.firstName} {applicationData.lastName}</li>
              <li><strong>Email:</strong> {applicationData.email}</li>
              <li><strong>Age:</strong> {applicationData.age}</li>
              <li><strong>Current Location:</strong> {applicationData.currentLocation}</li>
              <li><strong>Country:</strong> {applicationData.country}</li>
            </ul>
            
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              If you have any questions about your application, please don't hesitate to contact us.
            </p>
            
            <p style={{ fontSize: '16px' }}>
              Best regards,<br />The Aquafarm Team
            </p>
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '30px 0' }} />
          
          <p style={{ fontSize: '14px', color: '#6c757d', textAlign: 'center', fontWeight: 'bold' }}>
            © 2024 Aquafarm. All rights reserved.
          </p>
          <p style={{ fontSize: '14px', color: '#6c757d', textAlign: 'center' }}>
            This email was sent to {email}
          </p>
        </div>
      </body>
    </html>
  )
}; 