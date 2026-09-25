export type TelegramStatus = {
  configured: boolean;
  linked: boolean;
  botUsername: string | null;
  deepLink?: string | null;
  startCommand?: string | null;
};

export function telegramConnectHint(status: TelegramStatus): string {
  if (!status.configured) {
    return "Telegram is not enabled on this server yet.";
  }
  if (status.linked) {
    return "Linked. New mail spends will ask for a category in Telegram.";
  }
  return "Create a link, then open Telegram and tap Start.";
}
