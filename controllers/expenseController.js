import Expense from '../models/Expense.js';
import Bank from '../models/Bank.js';
import mongoose from 'mongoose';

export const createExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, category, amount, bank: bankId, date } = req.body;
    if (!name?.trim() || !category?.trim() || amount == null || !bankId || !date) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Name, category, amount, bank, and date are required' });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Verify Bank belongs to user
    const bank = await Bank.findOne({ _id: bankId, user: req.user.id }).session(session);
    if (!bank) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Bank not found' });
    }
    if (bank.balance < numAmount) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Insufficient bank balance' });
    }

    const expense = await Expense.create([{
      name: name.trim(),
      category: category.trim(),
      amount: numAmount,
      bank: bankId,
      date: new Date(date),
      user: req.user.id
    }], { session });

    await Bank.findByIdAndUpdate(bankId, { $inc: { balance: -numAmount } }, { session });

    await session.commitTransaction();
    const populated = await Expense.findById(expense[0]._id).populate('bank', 'name balance');
    res.status(201).json(populated);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id })
      .populate('bank', 'name balance')
      .sort({ date: -1, amount: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { name, category, amount, bank: newBankId, date } = req.body;

    const existingExpense = await Expense.findOne({ _id: id, user: req.user.id }).session(session);
    if (!existingExpense) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Expense not found' });
    }

    const oldAmount = existingExpense.amount;
    const oldBankId = existingExpense.bank;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Revert old bank balance
    const oldBank = await Bank.findOne({ _id: oldBankId, user: req.user.id }).session(session);
    if (!oldBank) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Original bank not found' });
    }
    await Bank.findByIdAndUpdate(oldBankId, { $inc: { balance: oldAmount } }, { session });

    // Deduct from new bank
    const newBank = await Bank.findOne({ _id: newBankId, user: req.user.id }).session(session);
    if (!newBank) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'New bank not found' });
    }

    // Re-fetch newBank to get updated balance after refund
    const refreshedNewBank = await Bank.findById(newBankId).session(session);
    if (refreshedNewBank.balance < numAmount) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Insufficient bank balance for updated amount' });
    }

    await Bank.findByIdAndUpdate(newBankId, { $inc: { balance: -numAmount } }, { session });

    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { name: name.trim(), category: category.trim(), amount: numAmount, bank: newBankId, date: new Date(date) },
      { new: true, session }
    ).populate('bank', 'name balance');

    await session.commitTransaction();
    res.json(updatedExpense);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

export const deleteExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const expense = await Expense.findOne({ _id: id, user: req.user.id }).session(session);
    if (!expense) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Refund bank
    await Bank.findByIdAndUpdate(expense.bank, { $inc: { balance: expense.amount } }, { session });
    await Expense.findOneAndDelete({ _id: id, user: req.user.id }).session(session);

    await session.commitTransaction();
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};
