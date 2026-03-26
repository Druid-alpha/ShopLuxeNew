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
  <title>\${title}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f9; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #f1f1f3; }
    .header { background: #ffffff; padding: 40px 48px; text-align: center; border-bottom: 1px solid #f1f1f3; }
    .logo { color: #000000; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-decoration: none; font-style: normal; display: inline-block; }
    .logo span { color: #ff3366; } /* Premium accent */
    .tagline { font-size: 11px; text-transform: uppercase; letter-spacing: 0.3em; color: #8e8e93; font-weight: 700; margin-top: 8px; }
    .content { padding: 48px; color: #1c1c1e; line-height: 1.6; font-size: 16px; background: #ffffff; }
    .footer { padding: 32px 48px; text-align: center; background-color: #fafafa; color: #8e8e93; font-size: 12px; border-top: 1px solid #f1f1f3; line-height: 1.8; }
    .footer p { margin: 4px 0; }
    .button { display: inline-block; background: #000000; color: #ffffff !important; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; text-transform: none; letter-spacing: 0.5px; font-size: 15px; margin: 24px 0; transition: transform 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .otp-box { background: #fbfbfc; border: 1px solid #ebebf0; padding: 24px; text-align: center; border-radius: 12px; margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #000000; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    h1 { margin-top: 0; font-size: 26px; font-weight: 800; color: #000000; letter-spacing: -0.5px; line-height: 1.3; }
    .meta { font-size: 13px; color: #8e8e93; font-weight: 500; margin-bottom: 24px; display: block; }
    .muted { color: #8e8e93; font-size: 14px; }
    .card { border: 1px solid #ebebf0; border-radius: 12px; padding: 24px; background: #fcfcfd; margin: 24px 0; }
    .divider { border-top: 1px solid #ebebf0; margin: 32px 0; }
    .list { padding-left: 24px; margin: 16px 0; color: #3a3a3c; }
    .list li { margin-bottom: 8px; }
    .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
    a { color: #000000; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; }
  </style>
</head>
<body>
  \${preheader ? \`<span class="preheader">\${preheader}</span>\` : ""}
  <div class="container">
    <div class="header">
      <a href="\${process.env.CLIENT_URL || "https://shopluxe.com"}" class="logo">ShopLuxe<span>.</span></a>
      <div class="tagline">Premium Retail</div>
    </div>
    <div class="content">
      \${content}
    </div>
    <div class="footer">
      <p>&copy; \${new Date().getFullYear()} ShopLuxe. All rights reserved.</p>
      <p>Zone 7, Ota-Efun Osogbo, Osun, Nigeria</p>
    </div>
  </div>
</body>
</html>
\`;


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

    await transporter.sendMail({
      from: `"${process.env.APP_NAME || "ShopLuxe."}" <${smtpFrom}>`,
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
