# Email Configuration Guide for DeployX

This guide explains how to configure email services for the password reset functionality.

## Current Configuration

The system is currently configured to use Gmail SMTP with the following settings:
- **SMTP Server**: smtp.gmail.com
- **Port**: 465 (SSL)
- **From Email**: deployx.support@mydomain.com (you need to change this)
- **Gmail Account**: parthshikhare21@gmail.com

## Setup Options

### Option 1: Gmail SMTP (Current Setup)

1. **Create a Gmail account** for your application
2. **Enable 2-Factor Authentication**
3. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
4. **Update the configuration** in `backend/app/auth/utils.py`:
   ```python
   # Replace these values
   GMAIL_USER = "your-app-email@gmail.com"
   GMAIL_APP_PASSWORD = "your-16-char-app-password"
   ```

### Option 2: Custom Domain Email (Recommended for Production)

#### Using Gmail with Custom Domain
1. **Set up Google Workspace** for your domain
2. **Create email**: deployx.support@yourdomain.com
3. **Configure SMTP** to use your domain email

#### Using AWS SES (Amazon Simple Email Service)
1. **Set up AWS SES** account
2. **Verify your domain** and email addresses
3. **Get SMTP credentials** from AWS console
4. **Update configuration**:
   ```python
   # AWS SES Configuration
   SMTP_SERVER = "email-smtp.us-east-1.amazonaws.com"
   SMTP_PORT = 587
   SMTP_USERNAME = "your-ses-smtp-username"
   SMTP_PASSWORD = "your-ses-smtp-password"
   ```

#### Using SendGrid
1. **Create SendGrid account**
2. **Verify sender identity** (domain or email)
3. **Get API key** or SMTP credentials
4. **Update configuration**:
   ```python
   # SendGrid Configuration
   SMTP_SERVER = "smtp.sendgrid.net"
   SMTP_PORT = 587
   SMTP_USERNAME = "apikey"
   SMTP_PASSWORD = "your-sendgrid-api-key"
   ```

## Domain Configuration

### SPF Record
Add this to your domain's DNS:
```
v=spf1 include:_spf.google.com ~all
```
(For Gmail/Google Workspace)

### DKIM Record
Configure DKIM signing with your email provider to improve deliverability.

### DMARC Record
Add a DMARC policy:
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

## Environment Variables (Recommended)

Create a `.env` file in your backend directory:

```env
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=deployx.support@yourdomain.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=deployx.support@yourdomain.com
FROM_NAME=DeployX Support

# Domain Configuration
FRONTEND_URL=https://yourdomain.com
```

## Security Considerations

1. **Never commit email credentials** to version control
2. **Use environment variables** for sensitive data
3. **Enable 2FA** on email accounts
4. **Use app-specific passwords** instead of main account passwords
5. **Monitor email sending** for abuse
6. **Set up rate limiting** to prevent spam

## Testing

Test the email functionality:

1. **Run the migration**:
   ```bash
   cd backend
   python migrate_password_reset.py
   ```

2. **Start the backend server**:
   ```bash
   uvicorn app.main:app --reload
   ```

3. **Test forgot password** from the frontend

4. **Check email delivery** in both inbox and spam folders

## Troubleshooting

### Common Issues

1. **"Authentication failed"**:
   - Check username/password
   - Ensure 2FA is enabled and app password is used
   - Verify SMTP settings

2. **"Connection refused"**:
   - Check firewall settings
   - Verify SMTP server and port
   - Try different ports (465, 587, 25)

3. **Emails going to spam**:
   - Set up SPF, DKIM, and DMARC records
   - Use a reputable email service
   - Avoid spam trigger words

4. **Rate limiting**:
   - Implement delays between emails
   - Use a professional email service
   - Monitor sending limits

## Production Checklist

- [ ] Set up custom domain email
- [ ] Configure SPF, DKIM, and DMARC records
- [ ] Use environment variables for credentials
- [ ] Set up email monitoring and logging
- [ ] Implement rate limiting
- [ ] Test email delivery thoroughly
- [ ] Set up email templates for different languages
- [ ] Configure email analytics and tracking

## Support

For issues with email configuration:
1. Check the email service provider's documentation
2. Verify DNS records using online tools
3. Test SMTP connection using telnet or online tools
4. Check server logs for detailed error messages
