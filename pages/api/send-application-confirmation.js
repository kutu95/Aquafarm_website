import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import ReactDOMServer from 'react-dom/server';
import React from 'react';
import puppeteer from 'puppeteer';
import ApplicationConfirmationEmail from '@/components/ApplicationConfirmationEmail';

// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

if (!process.env.RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY environment variable');
}

if (!process.env.RESEND_FROM_EMAIL) {
  console.error('Missing RESEND_FROM_EMAIL environment variable');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

// Function to generate PDF from application data
async function generateApplicationPDF(applicationData) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Create HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Volunteer Application - ${applicationData.full_name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2c3e50;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section h2 {
              color: #2c3e50;
              border-bottom: 1px solid #e9ecef;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .field {
              margin-bottom: 15px;
            }
            .field label {
              font-weight: bold;
              display: block;
              margin-bottom: 5px;
              color: #495057;
            }
            .field value {
              display: block;
              padding: 8px;
              background-color: #f8f9fa;
              border-radius: 4px;
              border-left: 4px solid #007bff;
            }
            .files-section {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 6px;
              margin-top: 20px;
            }
            .file-item {
              margin-bottom: 8px;
              padding: 5px 0;
            }
            @media print {
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🌱 Margaret River Aquafarm</h1>
            <h2>Volunteer Application</h2>
            <p><strong>Application ID:</strong> ${applicationData.id}</p>
            <p><strong>Submission Date:</strong> ${new Date(applicationData.created_at).toLocaleDateString()}</p>
          </div>

          <div class="section">
            <h2>1. Personal Information</h2>
            <div class="field">
              <label>Full Name:</label>
              <value>${applicationData.full_name}</value>
            </div>
            <div class="field">
              <label>Email:</label>
              <value>${applicationData.email}</value>
            </div>
            <div class="field">
              <label>Phone:</label>
              <value>${applicationData.phone_country_code} ${applicationData.phone_number}</value>
            </div>
            <div class="field">
              <label>Current Location:</label>
              <value>${applicationData.current_city}, ${applicationData.current_country}</value>
            </div>
            <div class="field">
              <label>Age:</label>
              <value>${applicationData.age}</value>
            </div>
          </div>

          <div class="section">
            <h2>2. Availability & Stay Preferences</h2>
            <div class="field">
              <label>Preferred Start Date:</label>
              <value>${applicationData.preferred_start_date}</value>
            </div>
            <div class="field">
              <label>Stay Details:</label>
              <value>${applicationData.stay_details}</value>
            </div>
          </div>

          <div class="section">
            <h2>3. Skills & Experience</h2>
            <div class="field">
              <label>Relevant Skills:</label>
              <value>${applicationData.relevant_skills}</value>
            </div>
            <div class="field">
              <label>Languages Spoken:</label>
              <value>${applicationData.languages_spoken}</value>
            </div>
          </div>

          <div class="section">
            <h2>4. Motivation & Expectations</h2>
            <div class="field">
              <label>Why Applying:</label>
              <value>${applicationData.why_applying}</value>
            </div>
          </div>

          <div class="section">
            <h2>5. Work Preferences</h2>
            <div class="field">
              <label>Preferred Work Areas:</label>
              <value>${applicationData.preferred_work_areas}</value>
            </div>
            <div class="field">
              <label>Physical Limitations:</label>
              <value>${applicationData.physical_limitations}</value>
            </div>
            <div class="field">
              <label>Comfortable with Shared Chores:</label>
              <value>${applicationData.comfortable_shared_chores}</value>
            </div>
          </div>

          <div class="section">
            <h2>6. Practical Details</h2>
            <div class="field">
              <label>Transport Ownership:</label>
              <value>${applicationData.transport_ownership}</value>
            </div>
            <div class="field">
              <label>Visa Status:</label>
              <value>${applicationData.visa_status}</value>
            </div>
          </div>

          <div class="section">
            <h2>7. Community & Cultural Fit</h2>
            <div class="field">
              <label>Cultural Exchange Meaning:</label>
              <value>${applicationData.cultural_exchange_meaning}</value>
            </div>
            <div class="field">
              <label>Comfortable with Shared Household:</label>
              <value>${applicationData.comfortable_shared_household}</value>
            </div>
            <div class="field">
              <label>How to Handle Challenges:</label>
              <value>${applicationData.handle_challenges}</value>
            </div>
          </div>

          <div class="section">
            <h2>8. References</h2>
            <div class="field">
              <label>References:</label>
              <value>${applicationData.references}</value>
            </div>
          </div>

          ${applicationData.gallery_images && applicationData.gallery_images.length > 0 ? `
          <div class="section">
            <h2>9. Attached Files</h2>
            <div class="files-section">
              <h3>Gallery Images (${applicationData.gallery_images.length} files):</h3>
              ${applicationData.gallery_images.map((image, index) => `
                <div class="file-item">• Image ${index + 1}: ${image.split('/').pop()}</div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          ${applicationData.cv_file ? `
          <div class="section">
            <h2>10. CV/Resume</h2>
            <div class="files-section">
              <div class="file-item">• CV File: ${applicationData.cv_file.split('/').pop()}</div>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <h2>Application Status</h2>
            <div class="field">
              <label>Status:</label>
              <value style="color: #ffc107; font-weight: bold;">Under Review</value>
            </div>
            <p style="font-style: italic; color: #6c757d;">
              This application will be reviewed by our team. You will be contacted within 5-7 business days.
            </p>
          </div>
        </body>
      </html>
    `;

    await page.setContent(htmlContent);
    
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    // Fetch the application data from the database
    const { data: application, error: fetchError } = await supabase
      .from('volunteer_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      console.error('Error fetching application:', fetchError);
      return res.status(404).json({ error: 'Application not found' });
    }

    // Generate PDF
    const pdfBuffer = await generateApplicationPDF(application);

    // Convert React component to HTML string
    const emailHtml = ReactDOMServer.renderToString(
      React.createElement(ApplicationConfirmationEmail, {
        applicantName: application.full_name,
        applicationId: application.id,
        applicationDate: new Date(application.created_at).toLocaleDateString()
      })
    );

    // Send email with PDF attachment
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: application.email,
      subject: 'Volunteer Application Received - Margaret River Aquafarm',
      html: emailHtml,
      attachments: [
        {
          filename: `volunteer-application-${application.id}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ error: `Failed to send confirmation email: ${emailError.message}` });
    }

    console.log('Application confirmation email sent successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'Application confirmation email sent successfully' 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
} 