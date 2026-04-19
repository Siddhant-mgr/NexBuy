const nodemailer = require('nodemailer');

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendVerificationEmail = async ({ to, code, name }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials are not configured');
  }

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || `NexBuy <${process.env.SMTP_USER}>`;
  const subject = 'Verify your NexBuy email';
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const text = `${greeting}\n\nYour NexBuy verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family:Arial, sans-serif; color:#111827; line-height:1.5;">
      <p>${greeting}</p>
      <p>Your NexBuy verification code is:</p>
      <p style="font-size:22px; font-weight:700; letter-spacing:2px;">${code}</p>
      <p>This code expires in 10 minutes.</p>
      <p style="color:#6b7280; font-size:12px;">If you did not request this, please ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  });
};

module.exports = {
  sendVerificationEmail
};
