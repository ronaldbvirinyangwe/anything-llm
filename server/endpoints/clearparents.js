const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.parents.deleteMany({});
  console.log('All parents deleted.');
}

main().finally(() => prisma.$disconnect());
