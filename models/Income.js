import mongoose from 'mongoose';

const incomeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  source: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  bank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bank',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Income', incomeSchema);
