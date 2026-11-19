import { config } from '../config';
import { prisma } from './prisma';

/** The alerts the owner can switch on or off in Settings › Notifications. */
export type AlertKind = 'newRequest' | 'newApplication' | 'payment' | 'lowStock';

/**
 * Sends a message to the owner's Telegram, if a bot is configured (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)
 * and this kind of alert is switched on. Never blocks or fails the request: problems are only logged.
 */
export function notifyTelegram(kind: AlertKind, text: string): void {
  if (!config.telegram) return;
  const { token, chatId } = config.telegram;
  void (async () => {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: 'notifications' } });
      const switches = (setting?.value ?? {}) as Record<string, unknown>;
      if (switches[kind] === false) return;
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000) }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) console.error('Telegram alert failed', res.status);
    } catch (e) {
      console.error('Telegram alert failed', e instanceof Error ? e.message : e);
    }
  })();
}
