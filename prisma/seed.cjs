const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = "Passw0rd!";
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: "host@usiu.app" },
    update: {},
    create: { email: "host@usiu.app", fullName: "Host User", role: "HOST", passwordHash: hash },
  });

  await prisma.user.upsert({
    where: { email: "security@usiu.app" },
    update: {},
    create: { email: "security@usiu.app", fullName: "Gate Security", role: "SECURITY", passwordHash: hash },
  });

  await prisma.user.upsert({
    where: { email: "admin@usiu.app" },
    update: {},
    create: { email: "admin@usiu.app", fullName: "Head of Security", role: "ADMIN", passwordHash: hash },
  });

  console.log("Seeded users:");
  console.log("host@usiu.app / Passw0rd!");
  console.log("security@usiu.app / Passw0rd!");
  console.log("admin@usiu.app / Passw0rd!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
