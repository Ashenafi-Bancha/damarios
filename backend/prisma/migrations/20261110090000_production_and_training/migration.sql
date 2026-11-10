-- CreateEnum
CREATE TYPE "Division" AS ENUM ('GARMENT', 'SPICE');

-- CreateEnum
CREATE TYPE "TrainingDept" AS ENUM ('FASHION', 'CULINARY', 'BEAUTY');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'ACCEPTED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "GalleryCategory_new" AS ENUM ('GARMENTS', 'SPICES', 'TRAINING', 'EVENTS');
ALTER TABLE "GalleryItem" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "GalleryItem" ALTER COLUMN "category" TYPE "GalleryCategory_new" USING ("category"::text::"GalleryCategory_new");
ALTER TYPE "GalleryCategory" RENAME TO "GalleryCategory_old";
ALTER TYPE "GalleryCategory_new" RENAME TO "GalleryCategory";
DROP TYPE "GalleryCategory_old";
ALTER TABLE "GalleryItem" ALTER COLUMN "category" SET DEFAULT 'GARMENTS';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderType" ADD VALUE 'WHOLESALE';
ALTER TYPE "OrderType" ADD VALUE 'EXPORT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockCategory" ADD VALUE 'RAW_SPICE';
ALTER TYPE "StockCategory" ADD VALUE 'PACKED_SPICE';
ALTER TYPE "StockCategory" ADD VALUE 'TRAINING_SUPPLIES';

-- AlterTable
ALTER TABLE "GalleryItem" ALTER COLUMN "category" SET DEFAULT 'GARMENTS';

-- AlterTable
ALTER TABLE "ProductionLine" ADD COLUMN     "division" "Division" NOT NULL DEFAULT 'GARMENT';

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "company" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "product" TEXT,
ADD COLUMN     "quantity" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'pcs';

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "division" "Division" NOT NULL DEFAULT 'GARMENT',
    "description" TEXT NOT NULL DEFAULT '',
    "packSizes" TEXT NOT NULL DEFAULT '',
    "markets" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'News',
    "body" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" "TrainingDept" NOT NULL,
    "duration" TEXT NOT NULL DEFAULT '',
    "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingClass" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructor" TEXT NOT NULL DEFAULT '',
    "schedule" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "TrainingClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" TEXT,
    "age" INTEGER,
    "education" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "attendancePct" INTEGER,
    "result" TEXT,
    "certificateNo" TEXT,
    "certificateDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PayMethod" NOT NULL DEFAULT 'CASH',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingApplication" (
    "id" TEXT NOT NULL,
    "department" "TrainingDept" NOT NULL,
    "courseId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredTime" TEXT,
    "education" TEXT,
    "age" INTEGER,
    "message" TEXT NOT NULL DEFAULT '',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_code_key" ON "Student"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_certificateNo_key" ON "Enrollment"("certificateNo");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_classId_key" ON "Enrollment"("studentId", "classId");

-- AddForeignKey
ALTER TABLE "TrainingClass" ADD CONSTRAINT "TrainingClass_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "TrainingClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingApplication" ADD CONSTRAINT "TrainingApplication_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

