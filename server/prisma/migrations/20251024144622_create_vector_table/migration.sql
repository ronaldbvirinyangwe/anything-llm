CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE "vector_table" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "embedding" vector(384) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vector_table_pkey" PRIMARY KEY ("id")
);
