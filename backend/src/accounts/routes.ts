import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";
import { validate } from "../middleware/validate.js";
import { patchAccountBodySchema } from "../validators/accounts.js";

export const accountsRouter = Router();

accountsRouter.use(requireAuth);

accountsRouter.get("/bank-presets", async (_req, res) => {
  const store = await getStore();
  const presets = await store.listBankPresets();
  res.json({
    presets,
    notice:
      "Only these bank sender addresses are used in Gmail search. We never scrape or store non-bank mail.",
  });
});

accountsRouter.get("/", async (req, res) => {
  const store = await getStore();
  const accounts = await store.listAccounts(req.user!.id);
  res.json({ accounts });
});

accountsRouter.patch("/", validate(patchAccountBodySchema), async (req, res) => {
  const store = await getStore();
  const body = req.body as {
    bank?: string;
    label?: string;
    statementSenderEmails?: string[];
    createIfMissing?: boolean;
  };

  const bank = body.bank?.toUpperCase();
  let accounts = await store.listAccounts(req.user!.id);
  let account =
    (bank
      ? accounts.find((a) => a.bank.toUpperCase() === bank)
      : accounts[0]) ?? null;

  if (!account && body.createIfMissing) {
    const defaultPreset = await store.getDefaultBankPreset();
    const targetBank = bank ?? defaultPreset?.id;
    if (!targetBank) {
      throw AppError.badRequest("No bank presets are configured in the database.");
    }
    const preset = await store.getBankPreset(targetBank);
    account = await store.getOrCreateAccount(req.user!.id, targetBank);
    const emails =
      body.statementSenderEmails ?? preset?.defaultSenderEmails ?? [];
    account = await store.updateAccountMailSources(
      req.user!.id,
      account.id,
      {
        bank: targetBank,
        label: body.label ?? preset?.label ?? "Primary",
        statementSenderEmails: emails,
      },
    );
  } else if (!account) {
    throw AppError.badRequest(
      "No bank account configured. Select a bank and statement sender emails first.",
    );
  } else {
    const preset = body.bank
      ? await store.getBankPreset(body.bank)
      : await store.getBankPreset(account.bank);
    account = await store.updateAccountMailSources(req.user!.id, account.id, {
      bank: body.bank,
      label: body.label,
      statementSenderEmails:
        body.statementSenderEmails ??
        (body.bank && account.statementSenderEmails.length === 0
          ? preset?.defaultSenderEmails
          : undefined),
    });
  }

  if (!account) throw AppError.notFound("Account not found");

  await store.audit(req.user!.id, "account.mail_sources_updated", {
    accountId: account.id,
    bank: account.bank,
    senders: account.statementSenderEmails,
  });

  const preset = await store.getBankPreset(account.bank);

  res.json({
    account,
    preset,
    readyForPooling: account.statementSenderEmails.length > 0,
  });
});
