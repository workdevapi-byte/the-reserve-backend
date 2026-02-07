import Expense from '../models/Expense.js';
import mongoose from 'mongoose';

export const getCategoryTotals = async (req, res) => {
  try {
    const result = await Expense.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $project: { category: '$_id', total: 1, _id: 0 } },
    ]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTopCategory = async (req, res) => {
  try {
    const result = await Expense.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
      { $project: { category: '$_id', total: 1, _id: 0 } },
    ]);
    if (result.length === 0) {
      return res.json({ category: null, total: 0, message: 'No expenses yet' });
    }
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSpendingByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    if (!category?.trim()) {
      return res.status(400).json({ error: 'Category query is required' });
    }
    const escaped = category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const result = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          category: { $regex: new RegExp(`^${escaped}$`, 'i') }
        }
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $project: { category: '$_id', total: 1, _id: 0 } },
    ]);
    if (result.length === 0) {
      return res.json({ category: category.trim(), total: 0 });
    }
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
