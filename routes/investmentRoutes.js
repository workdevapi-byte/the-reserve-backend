import express from 'express';
import { createInvestment, listInvestments, updateInvestment, deleteInvestment, listCategories, createCategory, listInvestmentHistory } from '../controllers/investmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Categories
router.get('/categories', protect, listCategories);
router.post('/categories', protect, createCategory);

// Investments
router.post('/', protect, createInvestment);
router.get('/', protect, listInvestments);
router.get('/history', protect, listInvestmentHistory);
router.put('/:id', protect, updateInvestment);
router.delete('/:id', protect, deleteInvestment);

export default router;
