import mongoose from 'mongoose';

const investmentCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index to ensure name is unique per user
investmentCategorySchema.index({ name: 1, user: 1 }, { unique: true });

export default mongoose.model('InvestmentCategory', investmentCategorySchema);
