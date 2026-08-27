/*
  Warnings:

  - You are about to drop the column `reserveDriverId` on the `fantasy_teams` table. All the data in the column will be lost.
  - You are about to drop the `driver_swaps` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "driver_swaps" DROP CONSTRAINT "driver_swaps_activatedDriverId_fkey";

-- DropForeignKey
ALTER TABLE "driver_swaps" DROP CONSTRAINT "driver_swaps_droppedDriverId_fkey";

-- DropForeignKey
ALTER TABLE "driver_swaps" DROP CONSTRAINT "driver_swaps_fantasyTeamId_fkey";

-- DropForeignKey
ALTER TABLE "driver_swaps" DROP CONSTRAINT "driver_swaps_raceId_fkey";

-- DropForeignKey
ALTER TABLE "fantasy_teams" DROP CONSTRAINT "fantasy_teams_reserveDriverId_fkey";

-- AlterTable
ALTER TABLE "fantasy_teams" DROP COLUMN "reserveDriverId";

-- DropTable
DROP TABLE "driver_swaps";

-- DropEnum
DROP TYPE "SwapSlot";

-- DropEnum
DROP TYPE "SwapType";
