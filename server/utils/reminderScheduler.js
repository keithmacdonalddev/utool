const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const { sendEmail } = require('./mailer');
const { logger } = require('./logger');

// Schedule job to run every day at 08:00 AM server time
function scheduleTaskReminders() {
  cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const start = new Date(tomorrow.setHours(0, 0, 0, 0));
        const end = new Date(tomorrow.setHours(23, 59, 59, 999));

        // Find tasks due tomorrow
        const tasks = await Task.find({
          dueDate: { $gte: start, $lte: end },
        }).populate('assignee', 'name email');

        for (const task of tasks) {
          const { name, email } = task.assignee;
          const subject = `Reminder: Task "${
            task.title
          }" due on ${task.dueDate.toDateString()}`;
          const text = `Hi ${name},\n\nYour task "${
            task.title
          }" is due on ${task.dueDate.toDateString()}. Please ensure it's completed by then.\n\nThanks.`;
          await sendEmail({ to: email, subject, text });
          logger.info(`Sent reminder for task ${task._id} to ${email}`);
        }
      } catch (err) {
        logger.error('Task reminder job error:', err);
      }
    },
    { timezone: process.env.SERVER_TIMEZONE || 'UTC' }
  );
}

module.exports = { scheduleTaskReminders };
