import mongoose from 'mongoose';
import AuditLog from './models/AuditLog.js';

async function countLogs() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/mern-productivity-app'
    );
    const count = await AuditLog.countDocuments();
    console.log('Total audit log entries in database:', count);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

countLogs();
