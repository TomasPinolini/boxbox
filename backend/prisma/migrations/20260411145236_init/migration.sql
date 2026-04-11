-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('UPCOMING', 'QUALIFYING_LOCKED', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'LIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'LEFT', 'KICKED');

-- CreateEnum
CREATE TYPE "SwapSlot" AS ENUM ('DRIVER_1', 'DRIVER_2');

-- CreateEnum
CREATE TYPE "SwapType" AS ENUM ('MANUAL', 'AUTO_DNF');

-- CreateEnum
CREATE TYPE "RaceResultStatus" AS ENUM ('CLASSIFIED', 'DNF', 'DSQ', 'DNS');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('DRIVERS', 'CONSTRUCTORS', 'CIRCUITS', 'RACES', 'RESULTS');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "headshotUrl" TEXT,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constructors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "logoUrl" TEXT,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "constructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circuits" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "circuitLength" DOUBLE PRECISION,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "circuits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "driverCount" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_seasons" (
    "id" SERIAL NOT NULL,
    "driverId" INTEGER NOT NULL,
    "constructorId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,

    CONSTRAINT "driver_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "races" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "qualifyingDate" TIMESTAMP(3),
    "sprintDate" TIMESTAMP(3),
    "lockDate" TIMESTAMP(3) NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "circuitId" INTEGER NOT NULL,
    "status" "RaceStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 11,
    "seasonId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "draftStatus" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "status" "LeagueStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_members" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_teams" (
    "id" SERIAL NOT NULL,
    "leagueMemberId" INTEGER NOT NULL,
    "driver1Id" INTEGER,
    "driver2Id" INTEGER,
    "reserveDriverId" INTEGER,
    "constructorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fantasy_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_picks" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "leagueMemberId" INTEGER NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "driverId" INTEGER,
    "constructorId" INTEGER,
    "pickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_swaps" (
    "id" SERIAL NOT NULL,
    "fantasyTeamId" INTEGER NOT NULL,
    "raceId" INTEGER NOT NULL,
    "slot" "SwapSlot" NOT NULL,
    "droppedDriverId" INTEGER NOT NULL,
    "activatedDriverId" INTEGER NOT NULL,
    "type" "SwapType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_swaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_results" (
    "id" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "position" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "gridPosition" INTEGER,
    "fastestLap" BOOLEAN NOT NULL DEFAULT false,
    "status" "RaceResultStatus" NOT NULL DEFAULT 'CLASSIFIED',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "race_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constructor_results" (
    "id" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "constructorId" INTEGER NOT NULL,
    "driver1Points" INTEGER NOT NULL DEFAULT 0,
    "driver2Points" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "constructor_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" SERIAL NOT NULL,
    "leagueMemberId" INTEGER NOT NULL,
    "raceId" INTEGER NOT NULL,
    "predictedWinnerId" INTEGER,
    "predictedPoleId" INTEGER,
    "predictedTopConstructorId" INTEGER,
    "winnerCorrect" BOOLEAN,
    "poleCorrect" BOOLEAN,
    "topConstructorCorrect" BOOLEAN,
    "bonusPoints" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_standings" (
    "id" SERIAL NOT NULL,
    "leagueMemberId" INTEGER NOT NULL,
    "raceId" INTEGER NOT NULL,
    "driverPoints" INTEGER NOT NULL DEFAULT 0,
    "constructorPoints" INTEGER NOT NULL DEFAULT 0,
    "predictionPoints" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL,
    "positionChange" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" SERIAL NOT NULL,
    "type" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "triggeredById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_externalId_key" ON "drivers"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "constructors_externalId_key" ON "constructors"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "circuits_externalId_key" ON "circuits"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_year_key" ON "seasons"("year");

-- CreateIndex
CREATE UNIQUE INDEX "driver_seasons_driverId_seasonId_key" ON "driver_seasons"("driverId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "races_seasonId_round_key" ON "races"("seasonId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_inviteCode_key" ON "leagues"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "league_members_leagueId_userId_key" ON "league_members"("leagueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_teams_leagueMemberId_key" ON "fantasy_teams"("leagueMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "race_results_raceId_driverId_key" ON "race_results"("raceId", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "constructor_results_raceId_constructorId_key" ON "constructor_results"("raceId", "constructorId");

-- CreateIndex
CREATE UNIQUE INDEX "predictions_leagueMemberId_raceId_key" ON "predictions"("leagueMemberId", "raceId");

-- CreateIndex
CREATE UNIQUE INDEX "league_standings_leagueMemberId_raceId_key" ON "league_standings"("leagueMemberId", "raceId");

-- AddForeignKey
ALTER TABLE "driver_seasons" ADD CONSTRAINT "driver_seasons_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_seasons" ADD CONSTRAINT "driver_seasons_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_seasons" ADD CONSTRAINT "driver_seasons_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "races" ADD CONSTRAINT "races_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "races" ADD CONSTRAINT "races_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "circuits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_leagueMemberId_fkey" FOREIGN KEY ("leagueMemberId") REFERENCES "league_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_driver1Id_fkey" FOREIGN KEY ("driver1Id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_driver2Id_fkey" FOREIGN KEY ("driver2Id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_reserveDriverId_fkey" FOREIGN KEY ("reserveDriverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_leagueMemberId_fkey" FOREIGN KEY ("leagueMemberId") REFERENCES "league_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_swaps" ADD CONSTRAINT "driver_swaps_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_swaps" ADD CONSTRAINT "driver_swaps_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_swaps" ADD CONSTRAINT "driver_swaps_droppedDriverId_fkey" FOREIGN KEY ("droppedDriverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_swaps" ADD CONSTRAINT "driver_swaps_activatedDriverId_fkey" FOREIGN KEY ("activatedDriverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constructor_results" ADD CONSTRAINT "constructor_results_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constructor_results" ADD CONSTRAINT "constructor_results_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_leagueMemberId_fkey" FOREIGN KEY ("leagueMemberId") REFERENCES "league_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_predictedWinnerId_fkey" FOREIGN KEY ("predictedWinnerId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_predictedPoleId_fkey" FOREIGN KEY ("predictedPoleId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_predictedTopConstructorId_fkey" FOREIGN KEY ("predictedTopConstructorId") REFERENCES "constructors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_standings" ADD CONSTRAINT "league_standings_leagueMemberId_fkey" FOREIGN KEY ("leagueMemberId") REFERENCES "league_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_standings" ADD CONSTRAINT "league_standings_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
