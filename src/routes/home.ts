import express, { Request, Response } from 'express'
import { logger } from '../utils/logger'
import client, { connectRedis } from '../utils/redis'

const router = express.Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const acceptHeader = req.headers['accept'] || ''
    const wantsJSON = acceptHeader.includes('application/json')

    // Make sure Redis is connected before checking
    await connectRedis()

    // Quick Redis health check
    await client.set('healthcheck', 'ok')
    const redisValue = await client.get('healthcheck')
    const redisStatus = redisValue === 'ok' ? 'connected' : 'error'

    logger.info('Redis Value:', redisValue)
    logger.info('Redis Status:', redisStatus)

    const response = {
      status: 'success',
      message: '🧠 Gempire backend is alive!',
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    }

    if (wantsJSON) {
      res.json(response)
    } else {
      res.setHeader('Content-Type', 'text/html')
      res.send(`
        <h1>🧠 Gempire backend is alive!</h1>
        <p>Redis status: <strong>${redisStatus}</strong></p>
        <p>Timestamp: ${response.timestamp}</p>
      `)
    }
  } catch (error) {
    logger.error('Error handling request:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
