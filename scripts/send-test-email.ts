import * as nodemailer from 'nodemailer';

// SMTP конфигурация из Supabase
// Укажите ваши SMTP данные из Supabase Dashboard -> Settings -> Auth -> SMTP Settings
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'BASE <noreply@base.app>';

async function sendTestEmail() {
  console.log('🚀 Отправка тестового письма...\n');

  if (!SMTP_USER || !SMTP_PASS) {
    console.log('❌ Ошибка: Укажите SMTP_USER и SMTP_PASS');
    console.log('\nИспользование:');
    console.log('SMTP_HOST=smtp.example.com SMTP_PORT=587 SMTP_USER=user SMTP_PASS=pass npx ts-node scripts/send-test-email.ts');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #252525;">
  <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #101010; border-radius: 20px; padding: 40px;">
    <tr>
      <td>
        <h1 style="color: #ffffff; font-size: 32px; margin: 0 0 24px 0; font-weight: 700;">
          Того этого 🎯
        </h1>
        
        <div style="color: #f0f0f5; font-size: 16px; line-height: 1.7;">
          <p style="margin-bottom: 20px; font-weight: 600; font-size: 18px;">
            Что значит эта фраза?
          </p>
          
          <p style="margin-bottom: 16px;">
            <strong style="color: #ffffff;">«Того этого»</strong> — это разговорное выражение-паразит из русского языка, 
            которое используется как универсальное слово-заполнитель.
          </p>
          
          <p style="margin-bottom: 16px; color: #c0c0c0;">
            Используется когда человек:
          </p>
          
          <ul style="color: #a0a0a0; margin-bottom: 20px; padding-left: 20px;">
            <li style="margin-bottom: 10px;">🤔 Затрудняется подобрать нужное слово</li>
            <li style="margin-bottom: 10px;">⏸️ Делает паузу, чтобы собраться с мыслями</li>
            <li style="margin-bottom: 10px;">😏 Намекает на что-то, не желая произносить прямо</li>
            <li style="margin-bottom: 10px;">🃏 Заменяет любое действие или предмет, понятный из контекста</li>
          </ul>
          
          <div style="background-color: #1a1a1a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #888888; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
              Примеры использования:
            </p>
            <p style="color: #e0e0e0; margin: 0 0 8px 0;">
              • «Ну ты это... <em style="color: #ffcc00;">того этого</em>» = «Ну ты понял»
            </p>
            <p style="color: #e0e0e0; margin: 0 0 8px 0;">
              • «Он там <em style="color: #ffcc00;">того этого</em>» = «Он там что-то делает»
            </p>
            <p style="color: #e0e0e0; margin: 0;">
              • «Давай <em style="color: #ffcc00;">того этого</em>» = «Давай сделаем это»
            </p>
          </div>
          
          <p style="color: #909090; font-style: italic;">
            Это универсальный «джокер» в разговорной речи, который может означать 
            практически что угодно в зависимости от ситуации и интонации.
          </p>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333333; text-align: center;">
          <p style="color: #656565; font-size: 14px; margin: 0;">
            © 2025 BASE • AI Generation Platform
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const textContent = `
ТОГО ЭТОГО 🎯

Что значит эта фраза?

«Того этого» — это разговорное выражение-паразит из русского языка, которое используется как универсальное слово-заполнитель.

Используется когда человек:
- Затрудняется подобрать нужное слово
- Делает паузу, чтобы собраться с мыслями
- Намекает на что-то, не желая произносить прямо
- Заменяет любое действие или предмет, понятный из контекста

Примеры использования:
• «Ну ты это... того этого» = «Ну ты понял»
• «Он там того этого» = «Он там что-то делает»
• «Давай того этого» = «Давай сделаем это»

Это универсальный «джокер» в разговорной речи, который может означать практически что угодно в зависимости от ситуации и интонации.

---
© 2025 BASE • AI Generation Platform
`;

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: 'art.bashkirov@gmail.com',
      subject: 'Того этого',
      text: textContent,
      html: htmlContent,
    });

    console.log('✅ Письмо успешно отправлено!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📬 Получатель: art.bashkirov@gmail.com`);
  } catch (error) {
    console.error('❌ Ошибка отправки:', error);
    process.exit(1);
  }
}

sendTestEmail();







