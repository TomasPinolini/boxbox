-- DropForeignKey
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_leagueMemberId_fkey";

-- DropForeignKey
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_predictedPoleId_fkey";

-- DropForeignKey
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_predictedTopConstructorId_fkey";

-- DropForeignKey
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_predictedWinnerId_fkey";

-- DropForeignKey
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_raceId_fkey";

-- AlterTable
ALTER TABLE "league_standings" DROP COLUMN "predictionPoints";

-- AlterTable
ALTER TABLE "races" DROP COLUMN "lockDate";

-- DropTable
DROP TABLE "predictions";
