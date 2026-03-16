// backend/src/shared/mailer.js
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendPasswordResetEmail(to, resetUrl) {
  await transporter.sendMail({
    from:    process.env.SMTP_FROM,
    to,
    subject: '✦ Logos — Redefinição de senha',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F9F6F0;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#FDFBF8;border-radius:16px;overflow:hidden;border:1px solid rgba(28,26,23,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#1C1A17;padding:32px;text-align:center;">
              <div style="font-size:28px;margin-bottom:8px;">✦</div>
              <div style="color:#B8965A;font-size:11px;letter-spacing:3px;font-weight:600;">LOGOS</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <h1 style="font-family:Georgia,serif;font-size:24px;color:#1C1A17;margin:0 0 16px;font-weight:600;">
                Redefinição de senha
              </h1>
              <p style="color:#4A4540;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Recebemos uma solicitação para redefinir a senha da sua conta Logos.
                Clique no botão abaixo para criar uma nova senha.
              </p>

              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}"
                   style="background:#1C1A17;color:#F9F6F0;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
                  Redefinir senha
                </a>
              </div>

              <p style="color:#9C9590;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Este link expira em <strong>1 hora</strong>.
              </p>
              <p style="color:#9C9590;font-size:13px;line-height:1.6;margin:0;">
                Se você não solicitou a redefinição, ignore este email.
                Sua senha permanece a mesma.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 48px;">
              <div style="height:1px;background:rgba(28,26,23,0.08);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px;text-align:center;">
              <p style="color:#9C9590;font-size:12px;margin:0;">
                ✦ Logos — Portal de Estudos Bíblicos
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  })
}
