import 'dotenv/config';
import mongoose from 'mongoose';
import Bank from '../models/Bank.js';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/money-manager');
    await Bank.deleteMany({});
    await Bank.insertMany([
      { name: 'HDFC', balance: 50000 },
      { name: 'Canara', balance: 25000 },
    ]);
    console.log('Seed data created: 2 banks (HDFC, Canara)');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
