import Investment from '../models/Investment.js';
import InvestmentCategory from '../models/InvestmentCategory.js';
import InvestmentTransaction from '../models/InvestmentTransaction.js';
import Bank from '../models/Bank.js';
import mongoose from 'mongoose';

// --- Category Controllers ---

// List all investment categories for a user
export const listCategories = async (req, res) => {
    try {
        const userId = req.user._id;
        const categories = await InvestmentCategory.find({ user: userId }).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new investment category
export const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user._id;

        if (!name) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        // Check if category already exists for this user
        const existingCategory = await InvestmentCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, user: userId });
        if (existingCategory) {
            return res.status(400).json({ error: 'Category already exists' });
        }

        const category = await InvestmentCategory.create({ name, user: userId });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Investment Controllers ---

// Create or update (aggregate) an investment and log history
export const createInvestment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { categoryId, newCategoryName, amount, date, name, notes, bankId } = req.body;
        const userId = req.user._id;

        if (amount === undefined || amount === null || amount <= 0) {
            return res.status(400).json({ error: 'Please provide a valid investment amount' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Please provide a name for this transaction' });
        }

        if (!bankId) {
            return res.status(400).json({ error: 'Please select a bank account' });
        }

        // 1. Verify and Update Bank Balance
        const bank = await Bank.findOne({ _id: bankId, user: userId }).session(session);
        if (!bank) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Bank not found' });
        }

        if (bank.balance < amount) {
            await session.abortTransaction();
            return res.status(400).json({ error: `Insufficient balance in ${bank.name}` });
        }

        bank.balance -= Number(amount);
        await bank.save({ session });

        let category;

        // 2. Handle Category Selection/Creation
        if (newCategoryName) {
            category = await InvestmentCategory.findOne({
                name: { $regex: new RegExp(`^${newCategoryName}$`, 'i') },
                user: userId
            }).session(session);

            if (!category) {
                category = await InvestmentCategory.create([{ name: newCategoryName, user: userId }], { session });
                category = category[0];
            }
        } else if (categoryId) {
            category = await InvestmentCategory.findOne({ _id: categoryId, user: userId }).session(session);
            if (!category) {
                await session.abortTransaction();
                return res.status(404).json({ error: 'Category not found' });
            }
        } else {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Please provide a category' });
        }

        // 3. Aggregate Investment Logic (per category AND bank)
        let investment = await Investment.findOne({ category: category._id, bank: bankId, user: userId }).session(session);

        if (investment) {
            investment.amount += Number(amount);
            investment.date = date ? new Date(date) : investment.date;
            await investment.save({ session });
        } else {
            investment = await Investment.create([{
                category: category._id,
                bank: bankId,
                amount: Number(amount),
                user: userId,
                date: date ? new Date(date) : new Date()
            }], { session });
            investment = investment[0];
        }

        // 4. Create Transaction History Record
        await InvestmentTransaction.create([{
            investment: investment._id,
            bank: bankId,
            amount: Number(amount),
            name,
            notes,
            user: userId,
            date: date ? new Date(date) : new Date()
        }], { session });

        await session.commitTransaction();

        const populatedInvestment = await Investment.findById(investment._id).populate('category').populate('bank');
        res.status(201).json(populatedInvestment);
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

// Get all investments for the user (populated)
export const listInvestments = async (req, res) => {
    try {
        const userId = req.user._id;
        const investments = await Investment.find({ user: userId })
            .populate('category')
            .populate('bank')
            .sort({ date: -1 });
        res.json(investments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// List all investment transactions (history)
export const listInvestmentHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const history = await InvestmentTransaction.find({ user: userId })
            .populate({
                path: 'investment',
                populate: [{ path: 'category' }, { path: 'bank' }]
            })
            .populate('bank')
            .sort({ date: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update an investment (manual correction of total amount)
export const updateInvestment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, date } = req.body;
        const userId = req.user._id;

        let investment = await Investment.findOne({ _id: id, user: userId }).populate('category');
        if (!investment) {
            return res.status(404).json({ error: 'Investment not found' });
        }

        investment.amount = amount !== undefined ? Number(amount) : investment.amount;
        investment.date = date ? new Date(date) : investment.date;

        await investment.save();
        res.json(investment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete an investment record (also cleans up history and refunds bank balance)
export const deleteInvestment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // 1. Find the investment
        const investment = await Investment.findOne({ _id: id, user: userId }).session(session);
        if (!investment) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Investment not found' });
        }

        // 2. Refund the bank balance
        const bank = await Bank.findOne({ _id: investment.bank, user: userId }).session(session);
        if (bank) {
            bank.balance += investment.amount;
            await bank.save({ session });
        }

        // 3. Deleteassociated transactions and the investment itself
        await InvestmentTransaction.deleteMany({ investment: id, user: userId }, { session });
        await Investment.findOneAndDelete({ _id: id, user: userId }, { session });

        await session.commitTransaction();
        res.json({ message: 'Investment record deleted and balance refunded' });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ error: error.message });
    } finally {
        session.endSession();
    }
};
