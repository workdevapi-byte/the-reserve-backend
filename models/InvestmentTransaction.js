import mongoose from 'mongoose';

const investmentTransactionSchema = new mongoose.Schema({
    investment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Investment',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    notes: {
        type: String,
        trim: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    bank: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bank',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('InvestmentTransaction', investmentTransactionSchema);
