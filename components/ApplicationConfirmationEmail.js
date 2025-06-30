import React from 'react';

export default function ApplicationConfirmationEmail({ applicantName, applicationId, applicationDate }) {
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
            Volunteer Application Received
          </h1>
          
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            Dear {applicantName},
          </p>
          
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            Thank you for your interest in volunteering at Margaret River Aquafarm! We have successfully received your application.
          </p>
          
          <div style={{ 
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '6px',
            border: '2px solid #28a745',
            margin: '20px 0'
          }}>
            <h3 style={{ color: '#28a745', marginBottom: '15px' }}>Application Details:</h3>
            <p style={{ marginBottom: '8px' }}><strong>Application ID:</strong> {applicationId}</p>
            <p style={{ marginBottom: '8px' }}><strong>Submission Date:</strong> {applicationDate}</p>
            <p style={{ marginBottom: '0' }}><strong>Status:</strong> Under Review</p>
          </div>
          
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            Our team will review your application and get back to you within 5-7 business days. Please find attached a PDF copy of your application for your records.
          </p>
          
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            If you have any questions about your application, please don't hesitate to contact us.
          </p>
          
          <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '30px 0' }} />
          
          <p style={{ fontSize: '14px', color: '#6c757d', textAlign: 'center', fontWeight: 'bold' }}>
            Margaret River Aquafarm<br />
            Thank you for your interest in sustainable farming!
          </p>
        </div>
      </body>
    </html>
  );
} 