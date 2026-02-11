import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import bankRoutes from './routes/bankRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import incomeRoutes from './routes/incomeRoutes.js';
import insightsRoutes from './routes/insightsRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import investmentRoutes from './routes/investmentRoutes.js';
import allocationRoutes from './routes/allocationRoutes.js';


connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/banks', bankRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/allocations', allocationRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
