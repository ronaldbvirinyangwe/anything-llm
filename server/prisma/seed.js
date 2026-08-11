const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Running Prisma seed...");

  // System settings
  const settings = [
    { label: "multi_user_mode", value: "false" },
    { label: "logo_filename", value: "anything-llm.png" },
  ];

  for (let setting of settings) {
    const existing = await prisma.system_settings.findUnique({
      where: { label: setting.label },
    });
    if (!existing) {
      await prisma.system_settings.create({ data: setting });
      console.log(`✅ Created setting: ${setting.label}`);
    }
  }

  // Admin user
  const adminUsername = process.env.SEED_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const existingAdmin = await prisma.users.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    await prisma.users.create({
      data: {
        username: adminUsername,
        password: bcrypt.hashSync(adminPassword, 10),
        role: "admin",
        bio: "System administrator account",
      },
    });
    console.log("✅ Created admin account:", adminUsername);
  } else {
    console.log("ℹ️ Admin user already exists, skipping.");
  }

  console.log("🌱 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
