import { Router } from 'express'
import adminRoute from './admin-route'
import catRoute from './category-route'
import healthRoute from './health-route'
import homeRoute from './home'
import metricsRoute from './metrics-route'
import orderRoute from './order-route'
import productRoute from './product-route'
import promoRoute from './promotion-route'

const router = Router()

router.use('/admin', adminRoute)
router.use('/category', catRoute)
router.use('/health', healthRoute)
router.use('/', homeRoute)
router.use('/metrics', metricsRoute)
router.use('/order', orderRoute)
router.use('/product', productRoute)
router.use('/promo', promoRoute)

export default router
