# Email Service Guide

This guide explains how to use the reusable email service for the Aquafarm website. The email service is located in `lib/emailService.js` and provides a centralized way to send all types of emails.

## Overview

The email service uses Resend as the email provider and provides methods for:
- User invitations and account management
- Application confirmations
- **Admin notifications** (NEW!)
- Custom notifications
- Bulk email sending
- Email validation

## Available Methods

### Core Email Function

#### `sendEmail({ to, subject, html, from, attachments })`
The core function that handles all email sending.

**Parameters:**
- `to` (string): Recipient email address
- `subject` (string): Email subject line
- `html` (string): HTML content of the email
- `from` (string, optional): Sender email address (defaults to environment variable)
- `attachments` (array, optional): Array of attachment objects

**Returns:** Promise with Resend response data

### User Management Emails

#### `sendInvitationEmail(email, invitationUrl)`
Sends an invitation email to a new user with a magic link.

#### `sendConfirmationEmail(email, confirmationUrl)`
Sends an email confirmation link to newly registered users.

#### `sendPasswordResetEmail(email, resetUrl)`
Sends password reset emails.

**Usage:**
```javascript
await emailService.sendPasswordResetEmail('user@example.com', 'https://example.com/reset?token=abc123');
```

#### `sendUserInvitation(email, invitationLink, adminName)`
Sends invitation emails for new users.

**Usage:**
```javascript
await emailService.sendUserInvitation('newuser@example.com', 'https://example.com/invite?token=abc123', 'Admin Name');
```

#### `sendInvitationResend(email, invitationLink, adminName)`
Sends invitation resend emails for existing users.

**Usage:**
```javascript
await emailService.sendInvitationResend('existinguser@example.com', 'https://example.com/invite?token=abc123', 'Admin Name');
```

### Application Emails

#### `sendApplicationConfirmationEmail(applicationData, pdfBuffer)`
Sends a confirmation email with PDF attachment for volunteer applications.

### Admin Notification Emails (NEW!)

#### `notifyAdminsOfNewUser(userData)`
Sends notification to all admin users when a new user registers.

**Parameters:**
- `userData` (object): Object containing `firstName`, `lastName`, `email`

**Example:**
```javascript
await emailService.notifyAdminsOfNewUser({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});
```

#### `notifyAdminsOfNewApplication(applicationData)`
Sends notification to all admin users when a new volunteer application is submitted.

**Parameters:**
- `applicationData` (object): Complete application data from database

**Example:**
```javascript
await emailService.notifyAdminsOfNewApplication(applicationRecord);
```

#### `notifyAdminsOfNewInduction(inductionData)`
Sends notification to all admin users when a new volunteer induction is submitted.

**Parameters:**
- `inductionData` (object): Induction data containing `id`, `full_name`, `email`, `created_at`

**Example:**
```javascript
await emailService.notifyAdminsOfNewInduction({
  id: '123',
  full_name: 'John Doe',
  email: 'john@example.com',
  created_at: '2024-01-01T00:00:00Z'
});
```

### Custom Notifications

#### `sendCustomNotification(to, subject, message, options = {})`
Sends a custom notification email with optional template data.

**Parameters:**
- `to` (string): Recipient email
- `subject` (string): Email subject
- `message` (string): Email message
- `options` (object, optional): Additional options including template data

### Bulk Email Functions

#### `sendBulkEmails(emails, subject, html, options = {})`
Sends the same email to multiple recipients with rate limiting.

**Parameters:**
- `emails` (array): Array of email addresses
- `subject` (string): Email subject
- `html` (string): Email HTML content
- `options` (object, optional): Additional options

### Utility Functions

#### `validateEmail(email)`
Validates an email address format.

#### `getAdminEmails()`
Retrieves all admin email addresses from the database.

## API Endpoints

### Admin Notification Endpoints

#### `POST /api/notify-admin-application`
Sends admin notification for new volunteer applications.

**Request Body:**
```json
{
  "applicationData": {
    "id": "123",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone_country_code": "+1",
    "phone_number": "1234567890",
    "current_city": "New York",
    "current_country": "USA",
    "age": 25,
    "preferred_start_date": "2024-06-01",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### `POST /api/notify-admin-induction`
Sends admin notification for new volunteer inductions.

**Request Body:**
```json
{
  "inductionData": {
    "id": "123",
    "full_name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

## Integration Examples

### 1. User Registration with Admin Notification
```javascript
// In pages/api/auth/register.js
try {
  await emailService.sendConfirmationEmail(email, confirmationUrl);
  
  // Send admin notification
  await emailService.notifyAdminsOfNewUser({
    firstName,
    lastName,
    email
  });
} catch (error) {
  console.error('Email error:', error);
}
```

### 2. Volunteer Application with Admin Notification
```javascript
// In pages/volunteer-application.js
// After successful application submission
const adminResponse = await fetch('/api/notify-admin-application', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ applicationData: data[0] })
});
```

### 3. Volunteer Induction with Admin Notification
```javascript
// In pages/volunteer-induction.js
// After successful induction submission (new applications only)
if (!existingApplication) {
  const adminResponse = await fetch('/api/notify-admin-induction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inductionData: { ... } })
  });
}
```

## Configuration

### Environment Variables
- `RESEND_API_KEY`: Your Resend API key
- `RESEND_FROM_EMAIL`: Default sender email address
- `NEXT_PUBLIC_SITE_URL`: Your website URL for links in emails

### Default Configuration
```javascript
const DEFAULT_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL || 'noreply@aquafarm.au',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://aquafarm.au',
  adminName: 'Margaret River Aquafarm'
};
```

## Error Handling

All email methods include comprehensive error handling:
- Logs errors to console
- Returns meaningful error messages
- Graceful degradation (doesn't break main functionality)
- Rate limiting for bulk emails

## Testing

You can test the email service using the example endpoint:
```bash
curl -X POST http://localhost:3000/api/example-email-usage \
  -H "Content-Type: application/json" \
  -d '{"action": "admin-notification", "email": "test@example.com"}'
```

## Best Practices

1. **Always wrap email calls in try-catch blocks**
2. **Don't let email failures break main functionality**
3. **Use the bulk email function for multiple recipients**
4. **Validate email addresses before sending**
5. **Test email templates thoroughly**
6. **Monitor email delivery rates and bounces**

## Migration from Old Code

If you have existing email code, you can easily migrate to use the email service:

**Before:**
```javascript
const { data, error } = await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: email,
  subject: 'Welcome',
  html: emailHtml
});
```

**After:**
```javascript
await emailService.sendCustomNotification(email, 'Welcome', 'Welcome message');
```

This centralized approach makes email functionality more maintainable and consistent across your application. 