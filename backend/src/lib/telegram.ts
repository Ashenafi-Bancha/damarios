import { config } from '../config';

/** Sends a message to the owner's Telegram, if a bot is configured. Failures are logged, not thrown. */
export async function notifyTelegram(text: string) {
  if (!config.telegram) return;
  const { token, chatId } = config.telegram;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error('Telegram alert failed', e);
  }
}
