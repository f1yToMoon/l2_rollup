import { useEffect, useState } from "react";
import { useLaunchParams, useInitData } from "@telegram-apps/sdk-react";

export interface TelegramUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

export function useTelegram() {
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [isTma, setIsTma] = useState(false);

  useEffect(() => {
    // Detect if running inside Telegram
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setIsTma(true);

      const user = tg.initDataUnsafe?.user;
      if (user) {
        setTgUser({
          id: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          photoUrl: user.photo_url,
        });
      }
    }
  }, []);

  const haptic = {
    impact: (style: "light" | "medium" | "heavy" = "medium") => {
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    },
    notification: (type: "error" | "success" | "warning") => {
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
    },
  };

  const showMainButton = (text: string, onClick: () => void) => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;
    tg.MainButton.setText(text);
    tg.MainButton.onClick(onClick);
    tg.MainButton.show();
  };

  const hideMainButton = () => {
    (window as any).Telegram?.WebApp?.MainButton?.hide();
  };

  return { tgUser, isTma, haptic, showMainButton, hideMainButton };
}
