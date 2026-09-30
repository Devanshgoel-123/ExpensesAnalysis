export type TelegramVerifyState = {
  phone: string;
  codeSent: boolean;
  expiresAt: string | null;
  botUrl: string | null;
};

export type TelegramStatus = {
  configured: boolean;
  linked: boolean;
  botUsername: string | null;
  phone?: string | null;
  verify?: TelegramVerifyState | null;
  deepLink?: string | null;
  startCommand?: string | null;
};

export function telegramConnectHint(status: TelegramStatus): string {
  if (!status.configured) {
    return "Telegram is not enabled on this server yet.";
  }
  if (status.linked) {
    return status.phone
      ? `Linked to ${status.phone}. This chat is your account.`
      : "Linked. This chat is your account. Send /sync to pull Gmail, or a statement PDF.";
  }
  if (status.verify?.codeSent) {
    return `Code sent to ${status.verify.phone}. Enter it here. It expires in 10 minutes.`;
  }
  if (status.verify) {
    return `Waiting for ${status.verify.phone}. Open Telegram and tap Share my number. The code is sent only after Telegram confirms that number.`;
  }
  return "Enter the mobile number on your Telegram account. We'll send a code in that chat after you share the number with the bot.";
}
