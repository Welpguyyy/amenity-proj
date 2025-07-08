import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email configuration - secure via env in real projects
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'amenity.web11@gmail.com',
    pass: process.env.SMTP_PASS || 'mcyo izuy hjrr tlbq',
  },
  // Add additional options for better compatibility
  secure: false,
  tls: {
    rejectUnauthorized: false
  }
};

// Create transporter with verification
const transporter = nodemailer.createTransport(emailConfig);

// Verify transporter connection
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email transporter verification failed:', error);
    return false;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`🔐 Sending password reset email to ${email} for user ${username}`);
    console.log(`📧 Using email config:`, {
      user: emailConfig.auth.user,
      service: emailConfig.service,
      hasPass: !!emailConfig.auth.pass
    });

    // Verify transporter before sending
    const isVerified = await verifyTransporter();
    if (!isVerified) {
      return NextResponse.json({
        error: 'Email service not available',
        details: 'Failed to verify email transporter'
      }, { status: 500 });
    }

    // Send Email
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'dayonotmaryclaire@gmail.com',
        to: email,
        subject: 'Your Amenity Account Password Has Been Reset',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0B1532; text-align: center;">Amenity - Password Reset</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p>Hello <b>${username}</b>,</p>
              <p>Your password has been reset. Your new password is:</p>
              <div style="background-color: #0B1532; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">${password}</h1>
              </div>
              <p>Please log in and change your password as soon as possible.</p>
            </div>
            <p style="text-align: center; font-size: 12px;">Amenity - Community Platform</p>
          </div>
        `,
        text: `Hello ${username},\n\nYour password has been reset. Your new password is: ${password}\n\nPlease log in and change your password as soon as possible.`,
      };

      console.log('📤 Attempting to send email...');
      const result = await transporter.sendMail(mailOptions);
      
      console.log('✅ Password reset email sent successfully');
      console.log('📧 Email result:', result.messageId);
      
      return NextResponse.json({
        success: true,
        message: 'Password reset email sent successfully',
        messageId: result.messageId
      });
      
    } catch (emailError: unknown) {
      console.error('⚠️ Email sending failed:', emailError);
      console.error('📧 Email error details:', {
        code: (emailError as any)?.code,
        command: (emailError as any)?.command,
        response: (emailError as any)?.response,
        responseCode: (emailError as any)?.responseCode
      });
      
      return NextResponse.json({
        error: 'Failed to send email.',
        details: emailError,
        code: (emailError as any)?.code
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Error in password reset email:', error);
    return NextResponse.json({
      error: (error as any)?.message || 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? (error as any)?.stack : undefined,
    }, { status: 500 });
  }
} 