import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.json({
    status: 'success',
    message: '🧠 Gempire backend is alive!',
    timestamp: new Date().toISOString(),
  })
})

export default router
