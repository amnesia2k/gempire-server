import express from 'express'
import { getMetrics, getSalesByPeriod } from '../controllers/metrics-controller'

const router = express.Router()

router.get('/', getMetrics)
router.get('/sales', getSalesByPeriod)

export default router
