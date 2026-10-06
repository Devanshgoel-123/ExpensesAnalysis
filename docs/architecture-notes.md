# Architectural decisions worth talking about

These are choices in Ledgerline that are visible in the product, not a tour of folders. Each one can carry a post, a short video, or a chapter in a build log. The hook is the sentence you can open with. The rest is the idea, so the piece has something to say.

Shared facts if a piece needs them: the web app is Next.js, the API is Express, the ledger is Postgres. Bank mail and statement PDFs both become rows. The month on screen is computed from those rows when you open it.

## 1. The bank line is kept whole

A debit is stored as the amount the bank took. A split does not rewrite that number. Friends' shares sit beside the row, and the month subtracts them when it adds up spending. An investment stays a debit in the ledger and drops out of the spent total. A refund stays a credit and is taken off spend. Money you passed on, in and then out, is neither spend nor income.

Hook: "I stopped letting the dashboard edit the bank."

The content is the split between record and meaning. The row answers "what did HDFC post?" The summary answers "what did this month cost me?" Those are different questions, and most expense apps collapse them into one column. Your Invested tab, the "your share of" line, and the spent figure are all the same decision showing up in the UI.

## 2. The month is calculated, not saved

There is no spend-by-day table and no stored "total for August." Opening Overview runs the rows through one function: drop passed-on, drop investments, subtract refunds, use your share of a split, then build the bars, the heatmap, and the category totals.

Hook: "The chart is a question I ask the ledger, not a number I stored last Tuesday."

This is why a correction shows up everywhere without a re-import. It is also why the rules have to live in one place. A second formula on the phone, or in Telegram, would drift. Talk about the bug this prevents: a total that was right when you imported and wrong after you fixed a label.

## 3. A correction sticks, and it can teach the next row

Every row remembers who labeled it: the parser, the brand catalog, an amount band, the mail alert, a rule, you, or Telegram. If you set the category yourself, later imports and the chart's own guess are not allowed to paint over it. If you say the correction applies to the same UPI id, that becomes a rule, and the rule relabels other rows that you have not already corrected by hand.

Hook: "The app is allowed to guess. It is not allowed to undo me."

The content is priority. A known brand can win at import time. Your hand wins after that. A rule can fix the unlabeled cousins of a payment, and it stops at any row you already touched. That is the "correct it once" line in the product, stated as a rule about sources instead of a slogan.

## 4. Shops and people are not the same kind of name

Shops live in a catalog: canonical name, aliases, UPI handles, a category, a logo. A lot of Indian retail and D2C brands are already in there, shared by every account. People live in your rules: a name, friend or family or office, and the UPI id or narration that should match. One person can carry more than one id. A block tag means "this id is not that person," so you can drop a mismatched handle without deleting the person or the bank rows.

Hook: "Swiggy is a fact about India. My landlord is a fact about me."

The content is why a global catalog and a private address book should not be one table with a flag you forget to check. The catalog gets logos and categories for free. The address book is allowed to be wrong, and it has an undo that unlabeled the payments instead of erasing them.

## 5. The bank's sentence is not the merchant

An HDFC alert is a template. It names the bank, then a VPA, then a person in parentheses. The parser lifts the id and the name out of that sentence. When the chart resolves a row, a merchant that is just the account bank is thrown out and replaced with the counterparty. The original narration stays on the row for you to read.

Hook: "The email says HDFC. The coffee was Blue Tokai."

This is a parsing essay. Bank copy is written to be read by a person in a notification, not to be a primary key. If you store the subject line as the merchant, every chart becomes a chart of your bank.

## 6. Mail fills the ledger. The statement checks it.

Gmail, read-only, restricted to the sender addresses of the banks you picked, is what creates transactions. A statement PDF is a second document: its lines are stored on their own, and the match screen proposes vendor UPI ids. Approving an id labels ledger rows that already carry it, including months the PDF does not cover. The match helpers themselves do not invent spend. Gaps can be imported on purpose. They are not merged in silence.

Hook: "The alert is the diary. The statement is the auditor."

Two sources will disagree. Dates slip, a mail is missing, a narration is shorter than the PDF line. The product treats that as a review, not as a race to see which parser writes last. The Gmail query is part of the same idea: each sender is its own `from:` clause, because a grouped `from:(a OR b)` is parsed by Gmail as "from a, or anything." The allowlist is a query bug you fixed, and it is a privacy boundary.

## 7. The same payment must not become two rows

A row is identified by a fingerprint of date, type, amount, UPI id, and the narration with the spacing flattened. That fingerprint is unique per user. Mail that was already stored is skipped. A statement line has its own fingerprint, separate from the transaction, so the audit copy and the ledger copy can both exist. An expense you add by hand gets a random id as its fingerprint, so it cannot collide with a bank line and cannot be deduped away.

Hook: "Import is allowed to be run twice. The month is not allowed to double."

Talk about the failure mode of deduping on Gmail's message id alone: the same rupees also appear on the PDF, with no message id. And the opposite failure: deduping a hand-written dinner against a bank dinner of the same amount.

## 8. The PDF password opens the file and then disappears

Uploads sit in memory. The password is a field on that request so a protected HDFC PDF can be read. It is not a column. Gmail refresh tokens are the other secret, and those are stored, encrypted with AES-GCM, because the scan has to run again tomorrow. Production boot refuses the example secrets. An anonymous "parse this PDF and don't save it" route exists for a smoke test and is off unless you explicitly enable it. The production check fails if that switch is on.

Hook: "One secret is a key to a file. The other is a key to an inbox. Only one of them is still here after the request."

This is the security piece that is concrete. You can show the difference without showing a key.

## 9. India gets one clock

A transaction date is a calendar day, and a date with no time is midnight in IST. Gmail's after/before bounds are built from those days. Telegram reminders are "minutes after midnight IST," and a category nudge will not fire between 02:00 and 10:00 IST.

Hook: "A UPI payment at 12:30 a.m. in Delhi is not yesterday in UTC."

Short and sharp. Anyone who has grouped payments by `toISOString().slice(0, 10)` on a server in another region has shipped the bug where Saturday night becomes Sunday.

## 10. The scan does not live inside the click

The API serves the app. A separate worker wakes up, reads the allowlisted mail, and sends Telegram reminders. The browser polls for progress. ETags are off on the API, because a cached 304 kept telling the screen that a finished scan was still running.

Hook: "The button starts a job. It does not sit there holding the Gmail connection."

Two stories in one. First, why a request handler is the wrong place for a mailbox backfill. Second, a small caching bug: the honest progress endpoint was being cached into a lie. The two-bank cap belongs here too. One scan, at most two banks, so the job stays on the accounts you named.

## 11. Telegram is another door to the same ledger

The bot does not keep its own copy of August. Linking is a phone check: the code goes to the chat Telegram says owns that number, and a stranger who types your email does not get the account. Labels you set in the chat are stored as Telegram classifications, which the chart treats as your choice, same as a click in the web app. Sync edits one message instead of stacking a new keyboard under every reply.

Hook: "The phone is a client. The ledger stays on the server."

The content trap to avoid is a demo of bot commands. The decision is that a second surface is cheap only if it cannot disagree with the first. Quiet hours, one updating sync message, and "your label sticks" are the same architecture as the web app, reached through a chat.

## 12. A brand can be shared. A ledger cannot.

Categories and providers may be global, with no user attached, or private to one account. The India catalog is seeded for everyone. Your rules, your mail, your statement lines, and your transactions are keyed by user. Sign-in is an allowlist seeded from accounts that already exist, plus invite codes, not an open registration form. Deleting an account is a soft delete on the user and a removal of the imported payments.

Hook: "I was willing to share the list of coffee apps. I was not willing to share the month."

Useful if you talk about building in public. The catalog is the part you can open-source without opening anyone's statement. The allowlist is the part that admits this is a private beta that reads bank mail.

## 13. The bank parser is a slot. HDFC PDF is the piece that fits.

Statement text runs through adapters. An adapter says whether it recognizes the text, then extracts rows and a balance chain. Today the PDF path recognizes HDFC-style columns. Mail is a different parser: alert templates, not a table. You can still select two banks for mail, because mail only needs sender addresses and an alert shape. The PDF screen does not pretend every bank's PDF is solved.

Hook: "Supporting a bank is two problems. I only finished one of them for HDFC, and I labeled it that way."

This is an honest engineering post. The interface is the promise that ICICI can show up later. The UI copy, "HDFC password-protected statements," is the refusal to advertise the promise early.

## 14. Tests talk to the same contract as production

The API asks a store interface for users, transactions, rules, and mail. Production is Postgres. Tests set the database URL to `memory` and get an in-memory store with the same methods. Migrations still run. The Express app is built by a function that does not listen on a port, so a test can call it without starting the server.

Hook: "I did not want a Postgres container in the loop for every assertion about a refund."

Say what you gave up: the memory store can drift from a migration you only wrote in SQL. Say what you kept: the classification and the month math are tested against the same functions the API calls.

---

## Which pieces want which decision

| If the piece is about… | Start from |
| --- | --- |
| Why the spent number feels fair | 1, then 2 |
| "I fixed one Swiggy and it stayed fixed" | 3, then 4 |
| Parsing Indian bank alerts | 5, then 6 |
| Importing twice, privacy, passwords | 6, 7, 8 |
| Timezones and "the day the payment happened" | 9 |
| Background jobs and a lying spinner | 10 |
| Shipping a bot without a second database | 11 |
| Building a finance app in public | 12 |
| How far multi-bank support really goes | 13 |
| How you test it without a warehouse of PDFs | 14 |

A build-log series can run in that order. 1 through 3 are the product. 5 through 8 are the pipeline. 9 through 11 are the operating shape. 12 through 14 are how you kept it shippable.
