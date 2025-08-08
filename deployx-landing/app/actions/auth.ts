'use server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(email: string) {
  try {
    // Generate a secure reset token (in production, store this in database)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

    const { data, error } = await resend.emails.send({
      from: 'DeployX <noreply@deployx.ai>',
      to: [email],
      subject: 'Reset Your DeployX Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - DeployX</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
              margin: 0;
              padding: 0;
              color: #ffffff;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              background: linear-gradient(45deg, #22d3ee, #3b82f6, #8b5cf6);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              margin-bottom: 10px;
            }
            .card {
              background: rgba(255, 255, 255, 0.05);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(34, 211, 238, 0.3);
              border-radius: 16px;
              padding: 40px;
              text-align: center;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #22d3ee;
            }
            .message {
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 30px;
              color: #d1d5db;
            }
            .button {
              display: inline-block;
              background: linear-gradient(45deg, #22d3ee, #3b82f6, #8b5cf6);
              color: white;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 50px;
              font-weight: bold;
              font-size: 16px;
              transition: all 0.3s ease;
              box-shadow: 0 4px 15px rgba(34, 211, 238, 0.3);
            }
            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(34, 211, 238, 0.4);
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 14px;
              color: #9ca3af;
            }
            .security-note {
              background: rgba(34, 211, 238, 0.1);
              border: 1px solid rgba(34, 211, 238, 0.3);
              border-radius: 8px;
              padding: 20px;
              margin-top: 30px;
              font-size: 14px;
              color: #d1d5db;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">DeployX</div>
              <p style="color: #9ca3af; margin: 0;">Quantum-Powered Deployment Platform</p>
            </div>
            
            <div class="card">
              <h1 class="title">🔐 Password Reset Request</h1>
              
              <p class="message">
                We received a request to reset your DeployX account password. 
                Click the button below to create a new password for your account.
              </p>
              
              <a href="${resetUrl}" class="button">
                Reset My Password
              </a>
              
              <div class="security-note">
                <strong>🛡️ Security Notice:</strong><br>
                This link will expire in 1 hour for your security. If you didn't request this reset, 
                please ignore this email and your password will remain unchanged.
              </div>
            </div>
            
            <div class="footer">
              <p>
                This email was sent by DeployX Security System<br>
                If you have any questions, contact us at security@deployx.ai
              </p>
              <p style="margin-top: 20px; font-size: 12px;">
                © 2024 DeployX. All rights reserved.<br>
                Powered by Quantum AI Technology
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Email sending error:', error)
      return { success: false, error: 'Failed to send email' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Password reset error:', error)
    return { success: false, error: 'Failed to send reset email' }
  }
}
