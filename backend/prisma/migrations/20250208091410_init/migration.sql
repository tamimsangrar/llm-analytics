-- CreateTable
CREATE TABLE "QueryMetric" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "success" BOOLEAN NOT NULL,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "error" TEXT,

    CONSTRAINT "QueryMetric_pkey" PRIMARY KEY ("id")
);
