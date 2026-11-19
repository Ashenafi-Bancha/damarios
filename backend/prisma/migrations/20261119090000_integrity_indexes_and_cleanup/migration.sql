-- Data integrity, indexes and removal of unused fashion-house tables.
-- History (payroll, production output, stock movements, training fees) can no longer be deleted by removing a parent record.

-- AlterEnum
BEGIN;
CREATE TYPE "OrderType_new" AS ENUM ('CUSTOM_DESIGN', 'BESPOKE', 'CULTURAL', 'PRODUCTION', 'WHOLESALE', 'EXPORT');
ALTER TABLE "Order" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Request" ALTER COLUMN "type" TYPE "OrderType_new" USING ("type"::text::"OrderType_new");
ALTER TABLE "Order" ALTER COLUMN "type" TYPE "OrderType_new" USING ("type"::text::"OrderType_new");
ALTER TYPE "OrderType" RENAME TO "OrderType_old";
ALTER TYPE "OrderType_new" RENAME TO "OrderType";
DROP TYPE "OrderType_old";
ALTER TABLE "Order" ALTER COLUMN "type" SET DEFAULT 'CUSTOM_DESIGN';
COMMIT;

-- AlterEnum: daily workers are paid per day worked (was PER_BOOKING); existing rows keep their value
ALTER TYPE "PayType" RENAME VALUE 'PER_BOOKING' TO 'DAILY';

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_classId_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "FeePayment" DROP CONSTRAINT "FeePayment_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "Look" DROP CONSTRAINT "Look_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "OutputLog" DROP CONSTRAINT "OutputLog_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollItem" DROP CONSTRAINT "PayrollItem_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_itemId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingClass" DROP CONSTRAINT "TrainingClass_courseId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_lineId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Collection";

-- DropTable
DROP TABLE "FashionModel";

-- DropTable
DROP TABLE "Look";

-- DropTable
DROP TABLE "ModelBooking";

-- DropEnum
DROP TYPE "LookCategory";

-- DropEnum
DROP TYPE "PayStatus";

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "Applicant_jobId_idx" ON "Applicant"("jobId");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");

-- CreateIndex
CREATE INDEX "FeePayment_enrollmentId_idx" ON "FeePayment"("enrollmentId");

-- CreateIndex
CREATE INDEX "FeePayment_date_idx" ON "FeePayment"("date");

-- CreateIndex
CREATE INDEX "InventoryItem_supplierId_idx" ON "InventoryItem"("supplierId");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");

-- CreateIndex
CREATE INDEX "Order_stage_createdAt_idx" ON "Order"("stage", "createdAt");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_idx" ON "OrderEvent"("orderId");

-- CreateIndex
CREATE INDEX "OutputLog_workOrderId_idx" ON "OutputLog"("workOrderId");

-- CreateIndex
CREATE INDEX "OutputLog_employeeId_createdAt_idx" ON "OutputLog"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "PayrollItem_employeeId_idx" ON "PayrollItem"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_runId_employeeId_key" ON "PayrollItem"("runId", "employeeId");

-- CreateIndex
CREATE INDEX "Request_status_createdAt_idx" ON "Request"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_itemId_createdAt_idx" ON "StockMovement"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "Student_phone_idx" ON "Student"("phone");

-- CreateIndex
CREATE INDEX "TrainingApplication_status_createdAt_idx" ON "TrainingApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingClass_courseId_idx" ON "TrainingClass"("courseId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_orderId_idx" ON "Transaction"("orderId");

-- CreateIndex
CREATE INDEX "WorkOrder_lineId_idx" ON "WorkOrder"("lineId");

-- CreateIndex
CREATE INDEX "WorkOrder_orderId_idx" ON "WorkOrder"("orderId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputLog" ADD CONSTRAINT "OutputLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingClass" ADD CONSTRAINT "TrainingClass_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "TrainingClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

