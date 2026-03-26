import nodemailer from "nodemailer";

type SendEmailOptions = {
  to: string;
  subject: string;
  text?: string;
  htmlContent?: string;
  title?: string;
  preheader?: string;
};

const emailTemplate = (title: string, content: string, preheader = "") => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%); margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: none; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 48px; text-align: center; color: white; }
    .logo { color: #ffffff; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-decoration: none; font-style: normal; display: inline-block; }
    .logo span { color: #ffeb3b; } /* Bright yellow accent */
    .tagline { font-size: 12px; text-transform: uppercase; letter-spacing: 0.4em; color: rgba(255,255,255,0.8); font-weight: 700; margin-top: 8px; }
    .content { padding: 48px; color: #2d3748; line-height: 1.7; font-size: 16px; background: #ffffff; }
    .footer { padding: 32px 48px; text-align: center; background-color: #f7fafc; color: #718096; font-size: 12px; border-top: 1px solid #edf2f7; line-height: 1.8; }
    .footer p { margin: 4px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; padding: 16px 36px; border-radius: 50px; text-decoration: none; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; margin: 24px 0; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
    .otp-box { background: linear-gradient(to right, #fdfbfb, #ebedee); border: 2px dashed #cbd5e0; padding: 32px; text-align: center; border-radius: 16px; margin: 24px 0; }
    .otp-code { font-size: 42px; font-weight: 900; letter-spacing: 16px; color: #4a5568; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; text-shadow: 2px 2px 4px rgba(0,0,0,0.05); }
    h1 { margin-top: 0; font-size: 28px; font-weight: 800; color: #2d3748; letter-spacing: -0.5px; line-height: 1.3; }
    .meta { font-size: 14px; color: #718096; font-weight: 600; margin-bottom: 24px; display: block; text-transform: uppercase; letter-spacing: 1px; }
    .muted { color: #a0aec0; font-size: 14px; }
    .card { border: 1px solid #e2e8f0; border-left: 4px solid #667eea; border-radius: 12px; padding: 24px; background: #ebedee; margin: 24px 0; }
    .divider { border-top: 2px solid #edf2f7; margin: 32px 0; }
    .list { padding-left: 24px; margin: 16px 0; color: #4a5568; }
    .list li { margin-bottom: 12px; font-weight: 500; }
    .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
    a { color: #667eea; font-weight: 700; text-decoration: none; border-bottom: 2px solid rgba(102, 126, 234, 0.3); padding-bottom: 2px; transition: border-color 0.2s; }
    a:hover { border-color: #667eea; }
  </style>
</head>
<body>
  ${preheader ? `<span class="preheader">${preheader}</span>` : ""}
  <div class="container">
    <div class="header">
      <a href="${process.env.CLIENT_URL || "https://shopluxe.com"}" class="logo">ShopLuxe<span>.</span></a>
      <div class="tagline">Premium Retail</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ShopLuxe. All rights reserved.</p>
      <p>Zone 7, Ota-Efun Osogbo, Osun, Nigeria</p>
    </div>
  </div>
</body>
</html>
`;


export default async function sendEmail({
  to,
  subject,
  text,
  htmlContent,
  title,
  preheader,
}: SendEmailOptions) {
  try {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
    if (!smtpUser || !smtpPass) {
      throw new Error("SMTP credentials are missing");
    }

    const smtpService = process.env.SMTP_SERVICE;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpSecure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : smtpPort === 465;
    const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || smtpUser;
    const smtpReplyTo = process.env.SMTP_REPLY_TO;

    const transporter = nodemailer.createTransport(
      smtpHost
        ? {
            host: smtpHost,
            port: smtpPort || (smtpSecure ? 465 : 587),
            secure: smtpSecure,
            auth: { user: smtpUser, pass: smtpPass },
          }
        : {
            service: smtpService || "gmail",
            auth: { user: smtpUser, pass: smtpPass },
          }
    );

    await transporter.verify();

    const finalHtml = htmlContent ? emailTemplate(title || subject, htmlContent, preheader) : undefined;

    const senderName = process.env.APP_NAME || "ShopLuxe";
    await transporter.sendMail({
      from: `"${senderName}" <${smtpFrom}>`,
      to,
      subject,
      text,
      html: finalHtml,
      ...(smtpReplyTo ? { replyTo: smtpReplyTo } : {}),
    });
  } catch (error: any) {
    console.error("Email sending failed:", {
      message: error?.message,
      code: error?.code,
      response: error?.response,
      responseCode: error?.responseCode,
      command: error?.command,
    });
    throw new Error("Email could not be sent");
  }
}
