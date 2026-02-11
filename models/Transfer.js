import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema({
    fromBank: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bank',
        required: true,
    },
    toBank: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bank',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    notes: {
        type: String,
        trim: true,
        default: '',
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

export default mongoose.model('Transfer', transferSchema);
