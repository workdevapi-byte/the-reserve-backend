import express from 'express';
import { getBankAllocations, updateBankAllocations } from '../controllers/allocationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/:bankId', getBankAllocations);
router.post('/:bankId', updateBankAllocations);

export default router;
