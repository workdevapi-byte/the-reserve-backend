import Income from '../models/Income.js';
import Bank from '../models/Bank.js';
import mongoose from 'mongoose';

export const createIncome = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, source, amount, bank: bankId, date } = req.body;
    if (!name?.trim() || !source?.trim() || amount == null || !bankId || !date) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Name, source, amount, bank, and date are required' });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Check bank ownership
    const bank = await Bank.findOne({ _id: bankId, user: req.user.id }).session(session);
    if (!bank) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Bank not found' });
    }

    const income = await Income.create([{
      name: name.trim(),
      source: source.trim(),
      amount: numAmount,
      bank: bankId,
      date: new Date(date),
      user: req.user.id
    }], { session });

    await Bank.findByIdAndUpdate(bankId, { $inc: { balance: numAmount } }, { session });

    await session.commitTransaction();
    const populated = await Income.findById(income[0]._id).populate('bank', 'name balance');
    res.status(201).json(populated);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

export const getIncome = async (req, res) => {
  try {
    const income = await Income.find({ user: req.user.id })
      .populate('bank', 'name balance')
      .sort({ date: -1, amount: -1 });
    res.json(income);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateIncome = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { name, source, amount, bank: newBankId, date } = req.body;

    const existingIncome = await Income.findOne({ _id: id, user: req.user.id }).session(session);
    if (!existingIncome) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Income not found' });
    }

    const oldAmount = existingIncome.amount;
    const oldBankId = existingIncome.bank;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Revert old bank (deduct income)
    const oldBank = await Bank.findOne({ _id: oldBankId, user: req.user.id }).session(session);
    if (!oldBank) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Original bank not found' });
    }
    await Bank.findByIdAndUpdate(oldBankId, { $inc: { balance: -oldAmount } }, { session });

    // Add to new bank
    const newBank = await Bank.findOne({ _id: newBankId, user: req.user.id }).session(session);
    if (!newBank) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'New bank not found' });
    }
    await Bank.findByIdAndUpdate(newBankId, { $inc: { balance: numAmount } }, { session });

    const updatedIncome = await Income.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { name: name.trim(), source: source.trim(), amount: numAmount, bank: newBankId, date: new Date(date) },
      { new: true, session }
    ).populate('bank', 'name balance');

    await session.commitTransaction();
    res.json(updatedIncome);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

export const deleteIncome = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const income = await Income.findOne({ _id: id, user: req.user.id }).session(session);
    if (!income) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Income not found' });
    }

    // Revert balance (deduct income)
    await Bank.findByIdAndUpdate(income.bank, { $inc: { balance: -income.amount } }, { session });
    await Income.findOneAndDelete({ _id: id, user: req.user.id }).session(session);

    await session.commitTransaction();
    res.json({ message: 'Income deleted' });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};
