/**
 * Script to set up Telegram webhook for support bot
 * 
 * Usage:
 *   npx ts-node scripts/setup-telegram-webhook.ts
 * 
 * Or with environment variables:
 *   TELEGRAM_SUPPORT_BOT_TOKEN=xxx WEBHOOK_URL=https://yourdomain.com npx ts-node scripts/setup-telegram-webhook.ts
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL || 'https://www.basecraft.ru';

async function setupWebhook() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_SUPPORT_BOT_TOKEN is not set');
    process.exit(1);
  }

  const webhookUrl = `${WEBHOOK_URL}/api/support/telegram-webhook`;
  
  console.log('🔧 Setting up Telegram webhook...');
  console.log(`📍 Webhook URL: ${webhookUrl}`);

  try {
    // First, delete any existing webhook
    const deleteResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`,
      { method: 'POST' }
    );
    const deleteResult = await deleteResponse.json();
    console.log('🗑️ Delete existing webhook:', deleteResult.ok ? 'OK' : deleteResult.description);

    // Set new webhook
    const setResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message'], // Only receive message updates
        }),
      }
    );
    const setResult = await setResponse.json();
    
    if (setResult.ok) {
      console.log('✅ Webhook set successfully!');
    } else {
      console.error('❌ Failed to set webhook:', setResult.description);
      process.exit(1);
    }

    // Get webhook info
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );
    const infoResult = await infoResponse.json();
    
    console.log('\n📊 Webhook Info:');
    console.log(`   URL: ${infoResult.result.url}`);
    console.log(`   Pending updates: ${infoResult.result.pending_update_count}`);
    if (infoResult.result.last_error_message) {
      console.log(`   Last error: ${infoResult.result.last_error_message}`);
    }

    console.log('\n✨ Done! Now when you reply to a support message in Telegram, the user will receive a notification.');
    
  } catch (error) {
    console.error('❌ Error setting up webhook:', error);
    process.exit(1);
  }
}

setupWebhook();
