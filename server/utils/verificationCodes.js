export function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function cleanupExpiredCodes(prisma) {
  try {
    await prisma.verificationCode.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    })
  } catch (error) {
    console.error('Cleanup verification codes error:', error)
  }
}
