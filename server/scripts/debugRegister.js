import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.user.create({
      data: {
        email: `codex-debug-${Date.now()}@example.com`,
        name: "Debug User",
        password: "placeholder",
        firstName: "Debug",
        lastName: "User",
        phone:
          "+1555555" +
          Math.floor(Math.random() * 1000000)
            .toString()
            .padStart(6, "0"),
      },
    });
    console.log("Created user", result.id);
  } catch (err) {
    console.error("Create failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
