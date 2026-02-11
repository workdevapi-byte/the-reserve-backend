import Bank from '../models/Bank.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import mongoose from 'mongoose';

export const createBank = async (req, res) => {
  try {
    const { name, balance = 0 } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Bank name is required' });
    }
    const bank = await Bank.create({
      name: name.trim(),
      balance: Number(balance) || 0,
      user: req.user.id
    });
    res.status(201).json(bank);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBanks = async (req, res) => {
  try {
    const banks = await Bank.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(banks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBank = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, balance } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Invalid ID format' });
    }

    const bank = await Bank.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { name: name?.trim(), ...(balance !== undefined && { balance: Number(balance) }) },
      { new: true }
    );
    if (!bank) return res.status(404).json({ error: 'Bank not found' });
    res.json(bank);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBank = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Invalid ID format' });
    }

    const bank = await Bank.findOne({ _id: id, user: req.user.id }).session(session);
    if (!bank) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Bank not found' });
    }

    // Cascade Delete
    await Expense.deleteMany({ bank: id, user: req.user.id }).session(session);
    await Income.deleteMany({ bank: id, user: req.user.id }).session(session);

    await Bank.findOneAndDelete({ _id: id, user: req.user.id }).session(session);

    await session.commitTransaction();
    res.json({ message: 'Bank and associated transactions deleted' });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};
