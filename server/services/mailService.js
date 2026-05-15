const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY || '';
const emailFrom = process.env.EMAIL_FROM || '';
const isProduction = process.env.NODE_ENV === 'production';

let resendClient = null;

if (resendApiKey) {
  resendClient = new Resend(resendApiKey);
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const subject = 'Resumatch: скидання пароля';
  const text = [
    'Ми отримали запит на скидання пароля для вашого акаунта Resumatch.',
    '',
    `Скинути пароль: ${resetUrl}`,
    '',
    'Посилання буде дійсне 30 хвилин.',
    'Якщо це були не ви, просто проігноруйте цей лист.',
  ].join('\n');

  const html = `
    <!doctype html>
    <html lang="uk">
      <body style="margin:0;padding:0;background:#0f1115;font-family:Inter,Arial,sans-serif;color:#e5e7eb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1115;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#080c10;border:1px solid rgba(59,130,246,0.18);border-radius:24px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 32px 20px;background:linear-gradient(180deg, rgba(59,130,246,0.16), rgba(8,12,16,0));">
                    <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;color:#e5e7eb;">
                      Resu<span style="color:#3b82f6;">match</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px;">
                    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-0.03em;color:#f9fafb;">
                      Запит на оновлення пароля
                    </h1>
                    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#cbd5e1;">
                      Ми отримали запит на скидання пароля для вашого акаунта Resumatch. Якщо це були ви, натисніть кнопку нижче.
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 20px;">
                      <tr>
                        <td>
                          <a href="${resetUrl}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#3b82f6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
                            Скинути пароль
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#94a3b8;">
                      Посилання буде дійсне <strong style="color:#e5e7eb;">30 хвилин</strong>.
                    </p>
                    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#94a3b8;">
                      Якщо ви не запитували скидання пароля, просто проігноруйте цей лист.
                    </p>
                    <div style="padding:14px 16px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">
                      <div style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#93c5fd;">
                        Пряме посилання
                      </div>
                      <div style="word-break:break-all;font-size:13px;line-height:1.6;color:#cbd5e1;">
                        ${resetUrl}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  if (!resendClient || !emailFrom) {
    if (isProduction) {
      throw new Error('Email delivery is not configured');
    }

    console.log('[MailService] Password reset email preview', {
      to,
      subject,
      resetUrl,
    });
    return;
  }

  await resendClient.emails.send({
    from: emailFrom,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendPasswordResetEmail,
};
