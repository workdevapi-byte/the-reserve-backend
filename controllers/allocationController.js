import Allocation from '../models/Allocation.js';
import Bank from '../models/Bank.js';
import mongoose from 'mongoose';

export const getBankAllocations = async (req, res) => {
    try {
        const { bankId } = req.params;
        const allocations = await Allocation.find({
            bank: bankId,
            user: req.user.id
        }).populate('category', 'name');

        res.json(allocations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateBankAllocations = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { bankId } = req.params;
        const { allocations } = req.body; // Array of { categoryId, amount }

        if (!allocations || !Array.isArray(allocations)) {
            throw new Error('Invalid allocations data');
        }

        const bank = await Bank.findOne({ _id: bankId, user: req.user.id }).session(session);
        if (!bank) {
            throw new Error('Bank not found');
        }

        const totalAllocated = allocations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        if (totalAllocated > bank.balance) {
            throw new Error('Total allocated amount exceeds bank balance');
        }

        // Delete existing and bulk write new ones (simplified approach)
        await Allocation.deleteMany({ bank: bankId, user: req.user.id }).session(session);

        const newAllocations = allocations
            .filter(item => Number(item.amount) > 0)
            .map(item => ({
                bank: bankId,
                category: item.categoryId,
                amount: Number(item.amount),
                user: req.user.id,
                updatedAt: new Date()
            }));

        if (newAllocations.length > 0) {
            await Allocation.insertMany(newAllocations, { session });
        }

        await session.commitTransaction();
        res.json({ message: 'Allocations updated successfully' });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};
