import { randomInt } from "crypto";

export function generateCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function cleanupExpiredCodes(prisma) {
  try {
    await prisma.verificationCode.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch (error) {
    console.error("Cleanup verification codes error:", error);
  }
}
