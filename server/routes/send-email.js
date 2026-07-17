/**
 * POST /api/send-email — same contract as web/backend/server.js
 * Ops integration — see GAP-EMAIL-001 in gap-log.md.
 */
import { Router } from 'express';
import { getEmailTransporter } from '../lib/email-transporter.js';

const router = Router();

function toEmailList(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

router.post('/', async (req, res) => {
  try {
    const { to, cc, bcc, subject, html, text, attachments: rawAttachments } = req.body || {};
    const toList = toEmailList(to);

    if (!toList.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one "to" recipient is required',
      });
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required',
      });
    }

    const hasHtml = typeof html === 'string' && html.trim();
    const hasText = typeof text === 'string' && text.trim();
    if (!hasHtml && !hasText) {
      return res.status(400).json({
        success: false,
        message: 'Either "html" or "text" content is required',
      });
    }

    const tx = getEmailTransporter();
    if (!tx) {
      return res.status(500).json({
        success: false,
        message: 'SENDGRID_API_KEY is not configured on the backend',
      });
    }

    const attachments = Array.isArray(rawAttachments)
      ? rawAttachments
          .filter((a) => a && typeof a.filename === 'string' && typeof a.content === 'string')
          .map((a) => ({
            filename: a.filename,
            content: a.content,
            encoding: 'base64',
            contentType: typeof a.contentType === 'string' ? a.contentType : undefined,
          }))
      : [];

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@grow24.ai',
      to: toList,
      subject: subject.trim(),
      html: hasHtml ? html : undefined,
      text: hasText ? text : undefined,
      attachments: attachments.length ? attachments : undefined,
      headers: {
        'X-SMTPAPI': JSON.stringify({
          filters: {
            clicktrack: { settings: { enable: 0 } },
          },
        }),
      },
    };

    const ccList = toEmailList(cc);
    if (ccList.length) mailOptions.cc = ccList;

    const bccList = toEmailList(bcc);
    if (bccList.length) mailOptions.bcc = bccList;

    await tx.sendMail(mailOptions);

    return res.json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Send email error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send email',
    });
  }
});

export default router;
