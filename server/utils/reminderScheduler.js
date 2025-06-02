import cron from 'node-cron';
import Task from '../models/Task.js';
import Note from '../models/Note.js';
import User from '../models/User.js';
import { sendEmail } from './mailer.js';
import { logger } from './logger.js';
import {
  createReminderNotification,
  processUnsentNotifications,
} from '../controllers/notificationController.js';

// Schedule for running task reminders (every hour)
const scheduleTaskReminders = () => {
  logger.info('Setting up task reminder scheduler - runs every hour');

  cron.schedule('0 * * * *', async () => {
    const startTime = Date.now();
    logger.info('Task reminder scheduler started');

    try {
      const now = new Date();
      // Find tasks due in the next hour that haven't had reminder sent
      const tasks = await Task.find({
        dueDate: {
          $gte: now,
          $lte: new Date(now.getTime() + 60 * 60 * 1000), // +1 hour
        },
        reminderSent: false,
      }).populate('user', 'username firstName lastName email');

      logger.verbose(
        `Found ${tasks.length} tasks due in the next hour that need reminders`
      );

      for (const task of tasks) {
        try {
          // Skip tasks with no user (shouldn't happen, but just in case)
          if (!task.user) {
            logger.warn(
              `Task ${task._id} has no associated user, skipping reminder`
            );
            continue;
          }

          logger.verbose(`Processing reminder for task: ${task._id}`, {
            taskId: task._id,
            userId: task.user._id,
            title: task.title,
            dueDate: task.dueDate,
          });

          // Create notification
          const notification = await createReminderNotification(
            task.user,
            'Task Due Soon',
            `Your task "${task.title}" is due soon.`,
            task._id,
            'Task',
            `/tasks/${task._id}`
          );

          // Send email notification
          const emailSent = await sendEmail({
            to: task.user.email,
            subject: 'Task Due Soon',
            text: `Your task "${task.title}" is due soon.`,
            html: `
              <h2>Task Reminder</h2>
              <p>Hello ${task.user.firstName || task.user.username},</p>
              <p>Your task <strong>${task.title}</strong> is due soon.</p>
              <p>Due Date: ${task.dueDate.toLocaleString()}</p>
              <p>Description: ${
                task.description || 'No description provided'
              }</p>
              <p>Status: ${task.status}</p>
              <p>Priority: ${task.priority || 'Not set'}</p>
              <p><a href="${process.env.FRONTEND_URL}/tasks/${
              task._id
            }">View Task</a></p>
            `,
          });

          // Mark reminder as sent
          task.reminderSent = true;
          await task.save();

          logger.info(`Task reminder sent for task ${task._id}`, {
            taskId: task._id,
            userId: task.user._id,
            title: task.title,
            notificationId: notification._id,
            emailSent: Boolean(emailSent),
          });
        } catch (err) {
          logger.error(`Error processing reminder for task ${task._id}:`, {
            error: err.message,
            stack: err.stack,
            taskId: task._id,
          });
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info(`Task reminder scheduler completed in ${processingTime}ms`, {
        processedTasks: tasks.length,
        processingTimeMs: processingTime,
      });
    } catch (err) {
      logger.error('Error in task reminder scheduler:', {
        error: err.message,
        stack: err.stack,
      });
    }
  });
};

// Schedule for running note reminders (every hour)
const scheduleNoteReminders = () => {
  logger.info('Setting up note reminder scheduler - runs every hour');

  cron.schedule('30 * * * *', async () => {
    const startTime = Date.now();
    logger.info('Note reminder scheduler started');

    try {
      const now = new Date();
      // Find notes with reminders due in the next hour that haven't had reminder sent
      const notes = await Note.find({
        'reminder.date': {
          $gte: now,
          $lte: new Date(now.getTime() + 60 * 60 * 1000), // +1 hour
        },
        'reminder.sent': false,
      }).populate('user', 'username firstName lastName email');

      logger.verbose(
        `Found ${notes.length} notes with reminders due in the next hour`
      );

      for (const note of notes) {
        try {
          // Skip notes with no user (shouldn't happen, but just in case)
          if (!note.user) {
            logger.warn(
              `Note ${note._id} has no associated user, skipping reminder`
            );
            continue;
          }

          logger.verbose(`Processing reminder for note: ${note._id}`, {
            noteId: note._id,
            userId: note.user._id,
            title: note.title,
            reminderDate: note.reminder.date,
          });

          // Create notification
          const notification = await createReminderNotification(
            note.user,
            'Note Reminder',
            `Reminder for your note: "${note.title}"`,
            note._id,
            'Note',
            `/notes/${note._id}`
          );

          // Send email notification
          const emailSent = await sendEmail({
            to: note.user.email,
            subject: 'Note Reminder',
            text: `Reminder for your note: "${note.title}"`,
            html: `
              <h2>Note Reminder</h2>
              <p>Hello ${note.user.firstName || note.user.username},</p>
              <p>This is a reminder for your note: <strong>${
                note.title
              }</strong></p>
              <p>Reminder set for: ${note.reminder.date.toLocaleString()}</p>
              <p><a href="${process.env.FRONTEND_URL}/notes/${
              note._id
            }">View Note</a></p>
            `,
          });

          // Mark reminder as sent
          note.reminder.sent = true;
          await note.save();

          logger.info(`Note reminder sent for note ${note._id}`, {
            noteId: note._id,
            userId: note.user._id,
            title: note.title,
            notificationId: notification._id,
            emailSent: Boolean(emailSent),
          });
        } catch (err) {
          logger.error(`Error processing reminder for note ${note._id}:`, {
            error: err.message,
            stack: err.stack,
            noteId: note._id,
          });
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info(`Note reminder scheduler completed in ${processingTime}ms`, {
        processedNotes: notes.length,
        processingTimeMs: processingTime,
      });
    } catch (err) {
      logger.error('Error in note reminder scheduler:', {
        error: err.message,
        stack: err.stack,
      });
    }
  });
};

// Schedule for checking and sending unsent notifications (every minute)
const scheduleNotificationProcessor = (io) => {
  logger.info('Setting up notification processor - runs every minute');

  // Store the io instance for later use
  let socketIO = io;

  // Allow the io instance to be updated later if needed
  const updateSocketIO = (newIO) => {
    logger.info('Updating socket.io instance in notification processor');
    socketIO = newIO;
  };

  cron.schedule('* * * * *', async () => {
    logger.verbose('Notification processor scheduled job starting');
    try {
      await processUnsentNotifications(socketIO);
    } catch (err) {
      logger.error('Error in notification processor scheduler:', {
        error: err.message,
        stack: err.stack,
      });
    }
  });

  return { updateSocketIO };
};

export {
  scheduleTaskReminders,
  scheduleNoteReminders,
  scheduleNotificationProcessor,
};
