# Ledgerline demo script

About 8 minutes. Use your own month of data. Do not open someone else's statements, and do not read account numbers or full UPI ids out loud.

## Before you start

1. API on port 4000, web on http://localhost:3000, and you are signed in.
2. Pick a month that has a handful of real payments, a daily limit, and at least one day over or under that limit.
3. Gmail is already connected, and email alerts for transactions are already on in the bank app. Telegram is linked if you want to show the bot. If either is not ready, skip that section. Do not connect a new account live.
4. Close other tabs that show mail, bank sites, or this repo's `.env`.
5. Browser zoom at 100%. Sidebar visible. Start on Overview.

## 0:00 — What this is

Say:

> Most UPI apps tell you the payment went through. They do not tell you what the month actually felt like. Ledgerline reads the bank alerts you already get, turns them into categories, and shows the month as a spend picture. Those alerts have to be turned on in the bank app. If the mail is off, there is nothing to read. It is not a bank, and it does not hold a password.

Stay on Overview. Point at the month title and the total.

## 1:00 — The month

Say:

> This is one month. The total is money that left the account, after refunds. Received money sits on its own, so a transfer in does not look like you spent less.

Click the daily chart.

> Each bar is a day, starting on the 1st and filling to the right. The limit line is the daily cap from Settings. A tall day is the one that needs a look, not a lecture.

If a day is over the limit, hover it and read the category split. Do not read the merchant's full UPI id.

## 2:30 — Where it went

Open **Lifestyle**.

> Categories are the point. Food, travel, household, outing. The labels come from the narration and from rules you correct once.

Open **Apps**.

> Vendors are one kind of card. Name, what you spent, the category, and the UPI ids that should match that vendor. Change the category here and later payments follow it.

Open **People**.

> People are the payments that are not a shop. Rent, a friend, family. Those stay out of "I spent this on myself" if you mark them that way.

Open **Transactions** and filter or scroll to one payment you know.

> This is the ledger. Every row is one bank line. If the app guessed wrong, you correct the row. You do not re-import the month to fix a label.

## 5:00 — Where the data comes from

Open **Import**. Do not start a new scan unless you have already rehearsed it.

> There are two ways in. A statement PDF, or Gmail. Gmail is read-only, and only the bank senders you allow. In the bank app, email alerts for transactions have to be on. If those mails are off, a scan has nothing to import. The Google password stays with Google. A PDF password, if a file needs one, opens that file and is not saved.

Open **Statement match** only if you have a prepared match.

> Mail says what the alert said. The statement says what the bank posted. This screen is where those two get checked against each other, and where a vendor's UPI id gets confirmed.

## 6:30 — The phone, if Telegram is linked

On your phone, open the bot. Do not type a password into the chat.

> The same account is on Telegram, but only after the phone number is checked. The bot sends a code to the chat that Telegram says owns that number. A stranger who types your email cannot claim it.

Tap **Profile**, then mention sync.

> Sync updates one message with a percent. It does not dump a new keyboard under every reply. New mail is also pulled on a schedule, so the month does not stay empty until you press a button.

If the bot is not linked, say that and move on.

## 7:30 — Close

Open **Settings**.

> The limit, the photo, Telegram, and Gmail live here. Log out is here. Delete account is here, and it removes the login and the imported payments.

Stop on Overview.

> So the loop is: bank mail or a statement comes in, the ledger labels it, and the month shows you the shape of the spending. You correct a vendor once. You do not keep a spreadsheet, and you do not give Ledgerline a password.

## If something breaks

| What happened | What to say | What to do |
| --- | --- | --- |
| Overview is empty | "This month has no imported mail yet." | Switch to a month you already imported. Do not debug Gmail on stage. |
| A chart bar looks wrong | "That day is still labeled from the narration." | Open the transaction after the demo, not during it. |
| Telegram is slow | "The bot answers on Telegram's side." | Show Profile only, or skip the phone. |
| You are signed out | "The session is a week long, and this one expired." | Sign in again only if you already have the Google account in the browser. |

## What not to show

- `.env`, tokens, or the database URL
- A full statement PDF, or a password typed into Telegram
- Someone else's Gmail, even "just the bank label"
- The delete-account button, except to point at it
