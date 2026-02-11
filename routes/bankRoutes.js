import express from 'express';
import { createBank, getBanks, updateBank, deleteBank } from '../controllers/bankController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect); // Protect all routes

router.post('/', createBank);
router.get('/', getBanks);
router.put('/:id', updateBank);
router.delete('/:id', deleteBank);

export default router;
