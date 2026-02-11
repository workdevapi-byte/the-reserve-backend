import mongoose from 'mongoose';

const allocationSchema = new mongoose.Schema({
    bank: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bank',
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure uniqueness per bank-category-user
allocationSchema.index({ bank: 1, category: 1, user: 1 }, { unique: true });

export default mongoose.model('Allocation', allocationSchema);
