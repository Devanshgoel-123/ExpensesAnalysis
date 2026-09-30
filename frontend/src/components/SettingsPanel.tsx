"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DailyLimitForm, useSaveDailyLimit } from "@/components/DailyLimitForm";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { pathForView } from "@/lib/dashboardViews";
import { telegramConnectHint, type TelegramStatus } from "@/lib/telegram";

function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image"));
        return;
      }
      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    image.src = url;
  });
}

function ruleMatchLabel(rule: Record<string, unknown>): string {
  if (rule.matchUpiId) return `UPI: ${String(rule.matchUpiId)}`;
  if (rule.matchNarrationRe) return `contains: ${String(rule.matchNarrationRe)}`;
  if (rule.matchMerchantAlias) return `merchant: ${String(rule.matchMerchantAlias)}`;
  return "custom match";
}

export function SettingsPanel({ onChanged }: { onChanged?: () => void }) {
  const api = useApi();
  const { logout, destroyAccount, user, saveProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const saveLimit = useSaveDailyLimit();
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDanger, setShowDanger] = useState(false);
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [telegramBusy, setTelegramBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      const [rulesRes, prefsRes, telegramRes] = await Promise.all([
        api.listRules(),
        api.fetchPreferences(),
        api.telegramStatus().catch(() => null),
      ]);
      setRules(rulesRes.rules);
      setDailyLimit(prefsRes.dailySpendLimit);
      setTelegram(telegramRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    }
  }, [api]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  const waitingForShare = Boolean(
    telegram?.verify && !telegram.verify.codeSent && !telegram.linked,
  );

  useEffect(() => {
    if (!api || !waitingForShare) return;
    const timer = window.setInterval(() => {
      void api
        .telegramStatus()
        .then(setTelegram)
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [api, waitingForShare]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!api || cancelled) return;
      await refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [api, refresh]);

  if (!api) return null;

  return (
    <div className="settings-sections">
      <header>
        <h2 className="month-label">Settings</h2>
        <p className="meta" style={{ marginTop: "0.35rem" }}>
          Signed in as {user?.email}
        </p>
      </header>

      {(message || error) && (
        <div className="panel" style={{ marginBottom: 0 }}>
          {message ? <p className="meta">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      )}

      <section className="settings-section">
        <h3 className="ui-header">Profile</h3>
        <p className="meta">
          Your name and photo show in the sidebar and header.
        </p>
        <form
          className="profile-form"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setMessage(null);
            void saveProfile({ displayName: displayName.trim() || null })
              .then(() => setMessage("Profile saved"))
              .catch((err) =>
                setError(err instanceof Error ? err.message : "Could not save profile"),
              );
          }}
        >
          <label className="field">
            <span>Name</span>
            <input
              value={displayName}
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
            />
          </label>
          <div className="profile-photo-row">
            <label className="ghost profile-photo-btn">
              {avatarBusy ? "Saving photo…" : "Upload photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={avatarBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setAvatarBusy(true);
                  setError(null);
                  void resizeAvatar(file)
                    .then((avatarUrl) => saveProfile({ avatarUrl }))
                    .then(() => setMessage("Photo updated"))
                    .catch((err) =>
                      setError(err instanceof Error ? err.message : "Could not save photo"),
                    )
                    .finally(() => setAvatarBusy(false));
                }}
              />
            </label>
            {user?.avatarUrl ? (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setError(null);
                  void saveProfile({ avatarUrl: null })
                    .then(() => setMessage("Photo removed"))
                    .catch((err) =>
                      setError(err instanceof Error ? err.message : "Could not remove photo"),
                    );
                }}
              >
                Remove photo
              </button>
            ) : null}
          </div>
          <button type="submit" className="cta">
            Save name
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h3 className="ui-header">Daily limit</h3>
        <p className="meta">
          Cap debit spend per day. Overview and Daily Limit use this as a calm
          health signal.
        </p>
        <DailyLimitForm
          limit={dailyLimit}
          onSave={async (next) => {
            const applied = await saveLimit(next);
            setDailyLimit(applied);
            onChanged?.();
          }}
        />
      </section>

      <section className="settings-section">
        <h3 className="ui-header">Telegram</h3>
        <p className="meta">
          {telegram
            ? telegramConnectHint(telegram)
            : "Link the mobile number on your Telegram account to this Gmail login."}
        </p>
        {telegram?.linked ? (
          <div className="sort-bar" style={{ marginTop: "0.75rem" }}>
            <button
              type="button"
              className="ghost"
              onClick={async () => {
                try {
                  setError(null);
                  const next = await api.unlinkTelegram();
                  setTelegram(next);
                  setPhone("");
                  setCode("");
                  setMessage("Telegram disconnected");
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Could not disconnect Telegram",
                  );
                }
              }}
            >
              Disconnect Telegram
            </button>
          </div>
        ) : (
          <>
            <form
              className="profile-form"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                setMessage(null);
                setTelegramBusy(true);
                void api
                  .requestTelegramPhone(phone)
                  .then((next) => {
                    setTelegram(next);
                    setMessage(
                      next.verify?.codeSent
                        ? "Code sent on Telegram"
                        : "Open Telegram and tap Share my number",
                    );
                  })
                  .catch((err) =>
                    setError(err instanceof Error ? err.message : "Could not send a code"),
                  )
                  .finally(() => setTelegramBusy(false));
              }}
            >
              <label className="field">
                <span>Mobile number on Telegram</span>
                <input
                  value={phone}
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                  placeholder="98765 43210"
                  disabled={telegram?.configured === false || telegramBusy}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="cta"
                disabled={telegram?.configured === false || telegramBusy || phone.trim().length < 8}
              >
                {telegramBusy ? "Sending…" : "Send code"}
              </button>
            </form>
            {telegram?.verify?.codeSent ? (
              <form
                className="profile-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError(null);
                  setMessage(null);
                  setTelegramBusy(true);
                  void api
                    .confirmTelegramPhone(code)
                    .then((next) => {
                      setTelegram(next);
                      setCode("");
                      setMessage(next.linked ? "Telegram linked" : "Code not accepted");
                    })
                    .catch((err) =>
                      setError(err instanceof Error ? err.message : "Could not verify that code"),
                    )
                    .finally(() => setTelegramBusy(false));
                }}
              >
                <label className="field">
                  <span>Code from Telegram</span>
                  <input
                    value={code}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="6-digit code"
                    disabled={telegramBusy}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </label>
                <button type="submit" className="cta" disabled={telegramBusy || code.length !== 6}>
                  Link account
                </button>
              </form>
            ) : null}
            {telegram?.verify?.botUrl ? (
              <div className="sort-bar" style={{ marginTop: "0.75rem" }}>
                <a
                  className="cta inline-flex"
                  href={telegram.verify.botUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Telegram
                </a>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="settings-section">
        <h3 className="ui-header">Gmail connection</h3>
        <p className="meta">
          Connect Gmail and scan bank mail on Import.
        </p>
        <Link href={pathForView("import")} className="cta inline-flex">
          Manage Gmail import
        </Link>
      </section>

      {rules.some((rule) => !rule.setPayeeName) ? (
        <section className="settings-section">
          <h3 className="ui-header">Other rules</h3>
          <p className="meta">People are added on the People page.</p>
          <ul className="upi-list" style={{ marginTop: "1rem", maxHeight: 180 }}>
            {rules
              .filter((rule) => !rule.setPayeeName)
              .map((rule) => (
                <li key={String(rule.id)} className="upi-row">
                  <span className="upi-rank">rule</span>
                  <div className="upi-meta">
                    <strong>{String(rule.name)}</strong>
                    <span className="meta">
                      {String(rule.setCategorySlug || "custom")} · {ruleMatchLabel(rule)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ghost"
                    onClick={async () => {
                      await api.deleteRule(String(rule.id));
                      await refresh();
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section className="settings-section">
        <h3 className="ui-header">Account</h3>
        <p className="meta">Session and privacy controls.</p>
        <div className="sort-bar">
          <button
            type="button"
            className="ghost"
            onClick={async () => {
              if (
                !confirm(
                  "Delete every imported transaction and mail record? Your account and Gmail stay.",
                )
              ) {
                return;
              }
              try {
                setError(null);
                const result = await api.clearImportedData();
                setMessage(
                  `Removed ${result.deleted.transactions} transactions from this account.`,
                );
                onChanged?.();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Could not clear data",
                );
              }
            }}
          >
            Clear imported data
          </button>
          <button type="button" className="ghost" onClick={logout}>
            Log out
          </button>
          <Link href="/privacy" className="ghost">
            Privacy policy
          </Link>
          <button
            type="button"
            className="ghost"
            onClick={() => setShowDanger((v) => !v)}
          >
            {showDanger ? "Hide delete options" : "Delete account…"}
          </button>
        </div>
        {showDanger ? (
          <div
            className="import-privacy"
            style={{
              marginTop: "0.85rem",
              background: "var(--danger-soft)",
              color: "var(--danger)",
            }}
          >
            <p className="meta" style={{ color: "inherit", marginBottom: "0.65rem" }}>
              This permanently deletes your account and financial data.
            </p>
            <button
              type="button"
              className="ghost"
              onClick={async () => {
                if (!confirm("Delete your account and all financial data?")) return;
                await destroyAccount();
              }}
            >
              Confirm delete account
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
