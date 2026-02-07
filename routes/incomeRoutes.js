import express from 'express';
import { createIncome, getIncome, updateIncome, deleteIncome } from '../controllers/incomeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.post('/', createIncome);
router.get('/', getIncome);
router.put('/:id', updateIncome);
router.delete('/:id', deleteIncome);

export default router;
