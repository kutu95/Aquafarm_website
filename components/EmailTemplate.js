import React from 'react';

export default function InvitationEmail({ invitationLink, adminName }) {
  return (
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
            color: '#2c3e50', 
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Welcome to Margaret River Aquafarm!
          </h1>
          
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            Hello,
          </p>
          
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            {adminName} has invited you to join Margaret River Aquafarm. Click the button below to access your account.
          </p>
          
          <div style={{ 
            textAlign: 'center', 
            margin: '30px 0',
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            border: '2px solid #007bff'
          }}>
            <a 
              href={invitationLink}
              style={{
                backgroundColor: '#007bff',
                color: '#ffffff',
                padding: '12px 30px',
                textDecoration: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'inline-block'
              }}
            >
              Access Your Account
            </a>
          </div>
          
          <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '20px' }}>
            This login link will expire in 24 hours. If you have any issues, please contact your administrator.
          </p>
          
          <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '30px 0' }} />
          
          <p style={{ fontSize: '14px', color: '#6c757d', textAlign: 'center', fontWeight: 'bold' }}>
            Margaret River Aquafarm
          </p>
        </div>
      </body>
    </html>
  );
} 