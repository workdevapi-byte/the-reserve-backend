import express from 'express';
import { getCategoryTotals, getTopCategory, getSpendingByCategory } from '../controllers/insightsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/category', getCategoryTotals);
router.get('/top-category', getTopCategory);
router.get('/category-spending', getSpendingByCategory);

export default router;
