/**
 * SendGrid SMTP transporter (same as web/backend).
 * Ops integration — see GAP-EMAIL-001 in gap-log.md.
 */
import nodemailer from 'nodemailer';

let transporter = null;

export function getEmailTransporter() {
  if (!process.env.SENDGRID_API_KEY) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }
  return transporter;
}

export function verifyEmailTransporter() {
  const tx = getEmailTransporter();
  if (!tx) {
    console.log('Email not configured — SENDGRID_API_KEY not set');
    return;
  }
  tx.verify((error) => {
    if (error) {
      console.log('SendGrid configuration error:', error.message);
    } else {
      console.log('SendGrid email server is ready');
    }
  });
}
