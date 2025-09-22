import createApp from './createApp.js'

const PORT = process.env.PORT || 5000

const { app, prisma } = createApp({ enableSchedulers: true })

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
