CREATE EXTENSION IF NOT EXISTS vector;
CREATE SEQUENCE IF NOT EXISTS vector_table_id_seq;
CREATE TABLE "vector_table" (
    "id" TEXT NOT NULL DEFAULT nextval('vector_table_id_seq'::regclass),
    "name" TEXT NOT NULL,
    "embedding" vector(384) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vector_table_pkey" PRIMARY KEY ("id")
);
