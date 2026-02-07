import Category from '../models/Category.js';

export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ user: req.user.id }).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createCategory = async (req, res) => {
    try {
        const { name, type } = req.body;
        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }
        // Check duplication per user
        const exists = await Category.findOne({ name, type, user: req.user.id });
        if (exists) {
            return res.status(400).json({ error: 'Category already exists' });
        }

        const category = await Category.create({ name, type, user: req.user.id });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findOneAndDelete({ _id: id, user: req.user.id });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
