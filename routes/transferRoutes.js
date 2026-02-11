import express from 'express';
import { createTransfer, listTransfers, deleteTransfer } from '../controllers/transferController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createTransfer);
router.get('/', protect, listTransfers);
router.delete('/:id', protect, deleteTransfer);

export default router;
