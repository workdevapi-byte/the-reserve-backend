import Transfer from '../models/Transfer.js';
import Bank from '../models/Bank.js';

// Create a new transfer
export const createTransfer = async (req, res) => {
    try {
        const { fromBank, toBank, amount, notes, date } = req.body;
        const userId = req.user._id;

        // Validation
        if (!fromBank || !toBank || !amount || !date) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        if (fromBank === toBank) {
            return res.status(400).json({ error: 'Cannot transfer to the same account' });
        }

        // Verify both banks exist and belong to user
        const [sourceBank, destinationBank] = await Promise.all([
            Bank.findOne({ _id: fromBank, user: userId }),
            Bank.findOne({ _id: toBank, user: userId })
        ]);

        if (!sourceBank) {
            return res.status(404).json({ error: 'Source bank account not found' });
        }

        if (!destinationBank) {
            return res.status(404).json({ error: 'Destination bank account not found' });
        }

        // Check sufficient balance
        if (sourceBank.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance in source account' });
        }

        // Update balances
        sourceBank.balance -= amount;
        destinationBank.balance += amount;

        await Promise.all([
            sourceBank.save(),
            destinationBank.save()
        ]);

        // Create transfer record
        const transfer = await Transfer.create({
            fromBank,
            toBank,
            amount,
            notes: notes || '',
            user: userId,
            date: new Date(date)
        });

        const populatedTransfer = await Transfer.findById(transfer._id)
            .populate('fromBank', 'name')
            .populate('toBank', 'name');

        res.status(201).json(populatedTransfer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all transfers for the user
export const listTransfers = async (req, res) => {
    try {
        const userId = req.user._id;
        const transfers = await Transfer.find({ user: userId })
            .populate('fromBank', 'name')
            .populate('toBank', 'name')
            .sort({ date: -1 });
        res.json(transfers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a transfer and reverse the transaction
export const deleteTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const transfer = await Transfer.findOne({ _id: id, user: userId });
        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found' });
        }

        // Reverse the transfer
        const [sourceBank, destinationBank] = await Promise.all([
            Bank.findById(transfer.fromBank),
            Bank.findById(transfer.toBank)
        ]);

        if (sourceBank && destinationBank) {
            sourceBank.balance += transfer.amount;
            destinationBank.balance -= transfer.amount;
            await Promise.all([
                sourceBank.save(),
                destinationBank.save()
            ]);
        }

        await Transfer.findByIdAndDelete(id);
        res.json({ message: 'Transfer deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
