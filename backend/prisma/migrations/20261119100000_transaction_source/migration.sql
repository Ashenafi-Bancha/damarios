-- Finance entries remember where they came from, so automatic ones (order payments, training fees, payroll)
-- are only changed from the screen that made them.
CREATE TYPE "TxSource" AS ENUM ('MANUAL', 'ORDER', 'TRAINING', 'PAYROLL');

ALTER TABLE "Transaction" ADD COLUMN "source" "TxSource" NOT NULL DEFAULT 'MANUAL';

-- Existing automatic entries.
UPDATE "Transaction" SET "source" = 'ORDER' WHERE "orderId" IS NOT NULL AND "category" = 'Order payment';
UPDATE "Transaction" SET "source" = 'TRAINING' WHERE "category" = 'Training fees';
UPDATE "Transaction" SET "source" = 'PAYROLL' WHERE "category" = 'Salaries & payroll';
