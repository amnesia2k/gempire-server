import express from 'express'
import multer from 'multer'
import {
  createProduct,
  deleteProduct,
  editProduct,
  getAllProducts,
  getProductBySlug,
} from '../controllers/product-controller'
import { createRateLimiter } from '../utils/rate-limiter'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

const productRateLimiter = createRateLimiter('product', 5)

router.post('/', productRateLimiter, upload.array('files'), createProduct)
router.get('/all', getAllProducts)
router.get('/:slug', getProductBySlug)
router.patch('/:slug', productRateLimiter, upload.array('files'), editProduct)
router.delete('/:id', productRateLimiter, deleteProduct)

export default router
