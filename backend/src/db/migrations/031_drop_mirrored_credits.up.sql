-- A statement or account-update credit that matches a debit of the same
-- amount on the same day is the same payment stored twice. Bank inflows
-- (salary, NEFT, IMPS, refunds) are a different event and stay.
DELETE FROM transactions AS credit_row
WHERE credit_row.type = 'credit'
  AND credit_row.description !~* '(neft|imps|rtgs|refund|payroll|salary)'
  AND EXISTS (
    SELECT 1
    FROM transactions AS debit_row
    WHERE debit_row.user_id = credit_row.user_id
      AND debit_row.type = 'debit'
      AND debit_row.date = credit_row.date
      AND debit_row.amount = credit_row.amount
      AND debit_row.id <> credit_row.id
  );
