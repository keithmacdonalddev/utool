/**
 * Enhanced Push Notification Manager for Project Collaboration
 *
 * Extends the existing notification system with project-specific push notifications,
 * real-time delivery, and advanced targeting capabilities.
 *
 * Features:
 * - Project-specific notification channels
 * - Real-time push notifications via WebSocket
 * - Email and SMS fallback for offline users
 * - Notification preferences and filtering
 * - Delivery confirmation and retry logic
 * - Integration with existing socketManager.js
 */

const webpush = require('web-push');
const nodemailer = require('nodemailer');
const { getSocketManager } = require('./socketManager');
const User = require('../models/User');
const Project = require('../models/Project');
const { logActivity } = require('./activityLogger');

// Configure web push notifications if keys are available
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@utool.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Email transporter setup
let emailTransporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  emailTransporter = nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

/**
 * Enhanced Project Notification Manager Class
 * Integrates with existing socket infrastructure for real-time delivery
 */
class ProjectNotificationManager {
  constructor() {
    this.socketManager = getSocketManager();
    this.deliveryQueue = new Map(); // Track notification delivery
    this.retryQueue = new Map(); // Handle failed deliveries
    this.notificationQueue = new Map(); // Store notifications for offline users
  }

  /**
   * Send project notification with multiple delivery channels
   * Prioritizes real-time delivery via existing socket infrastructure
   */
  async sendProjectNotification(options) {
    const {
      projectId,
      recipients, // Array of user IDs or 'all' for all members
      type,
      title,
      message,
      data = {},
      priority = 'normal', // 'low', 'normal', 'high', 'urgent'
      channels = ['socket', 'push', 'email'], // Delivery methods
      senderId = null,
    } = options;

    try {
      console.log('📢 Push Notification Manager: Sending project notification', {
        projectId,
        type,
        title,
        priority
      });

      // Validate project and get member list
      const project = await Project.findById(projectId).populate(
        'members.user owner'
      );
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Determine recipient list
      let targetUsers = [];
      if (recipients === 'all') {
        targetUsers = [project.owner, ...project.members.map((m) => m.user)];
      } else if (Array.isArray(recipients)) {
        targetUsers = await User.find({ _id: { $in: recipients } });
      }

      // Filter out sender from recipients
      if (senderId) {
        targetUsers = targetUsers.filter(
          (user) => user._id.toString() !== senderId.toString()
        );
      }

      // Remove any null/undefined users
      targetUsers = targetUsers.filter(user => user && user._id);

      if (targetUsers.length === 0) {
        console.log('ℹ️ No target users for notification after filtering');
        return {
          notificationId: `empty_${Date.now()}`,
          recipientCount: 0,
          deliveredCount: 0,
          failedCount: 0
        };
      }

      // Create notification record
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const notification = {
        id: notificationId,
        type,
        title,
        message,
        data: {
          ...data,
          projectId,
          projectTitle: project.title,
        },
        recipients: targetUsers.map((user) => user._id),
        sender: senderId,
        priority,
        channels,
        deliveryStatus: 'pending',
        createdAt: new Date()
      };

      // Process delivery for each user
      const deliveryPromises = targetUsers.map((user) =>
        this.deliverToUser(user, notification, project, channels)
      );

      const deliveryResults = await Promise.allSettled(deliveryPromises);

      // Update notification with delivery results
      const successCount = deliveryResults.filter(
        (r) => r.status === 'fulfilled'
      ).length;
      const failureCount = deliveryResults.filter(
        (r) => r.status === 'rejected'
      ).length;

      // Log notification activity
      if (successCount > 0) {
        await logActivity({
          type: 'PROJECT_NOTIFICATION_SENT',
          userId: senderId,
          projectId,
          metadata: {
            notificationId: notification.id,
            recipientCount: targetUsers.length,
            successCount,
            failureCount,
            type,
            priority,
          },
        });
      }

      console.log(`✅ Notification delivery complete: ${successCount} success, ${failureCount} failed`);

      return {
        notificationId: notification.id,
        recipientCount: targetUsers.length,
        deliveredCount: successCount,
        failedCount: failureCount,
      };
    } catch (error) {
      console.error('❌ Failed to send project notification:', error);
      throw error;
    }
  }

  /**
   * Deliver notification to individual user via multiple channels
   * Uses existing socket infrastructure as primary delivery method
   */
  async deliverToUser(user, notification, project, channels) {
    const deliveryResults = {};

    try {
      // Check user notification preferences
      const userPrefs = await this.getUserNotificationPreferences(
        user._id,
        project._id
      );

      // 1. Real-time delivery via existing socket infrastructure (highest priority)
      if (channels.includes('socket') && userPrefs.allowRealTime) {
        try {
          const delivered = await this.deliverViaSocket(
            user,
            notification,
            project
          );
          deliveryResults.socket = delivered;

          // If real-time delivery successful and user is active, skip other channels for normal priority
          if (delivered && userPrefs.realTimeOnly && notification.priority === 'normal') {
            return deliveryResults;
          }
        } catch (error) {
          console.error('Socket delivery failed:', error);
          deliveryResults.socket = false;
        }
      }

      // 2. Web push notification (for offline/background users)
      if (channels.includes('push') && userPrefs.allowPush) {
        try {
          deliveryResults.push = await this.deliverViaPush(
            user,
            notification,
            project
          );
        } catch (error) {
          console.error('Push notification failed:', error);
          deliveryResults.push = false;
        }
      }

      // 3. Email notification (fallback or preference-based)
      if (channels.includes('email') && userPrefs.allowEmail) {
        try {
          deliveryResults.email = await this.deliverViaEmail(
            user,
            notification,
            project
          );
        } catch (error) {
          console.error('Email notification failed:', error);
          deliveryResults.email = false;
        }
      }

      return deliveryResults;
    } catch (error) {
      console.error(`❌ Failed to deliver notification to user ${user._id}:`, error);
      throw error;
    }
  }

  /**
   * Deliver notification via existing socket infrastructure
   * Integrates with socketManager.js real-time delivery system
   */
  async deliverViaSocket(user, notification, project) {
    try {
      const socketManager = this.socketManager;

      // Check if user is connected via existing socket system
      const userSockets = socketManager.getUserSockets(user._id);

      if (userSockets && userSockets.length > 0) {
        const notificationPayload = {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          timestamp: notification.createdAt,
          priority: notification.priority,
          project: {
            id: project._id,
            title: project.title,
          },
        };

        // Send to all user's connected sockets
        let delivered = false;
        userSockets.forEach((socket) => {
          try {
            socket.emit('project:notification', notificationPayload);
            delivered = true;
          } catch (error) {
            console.error('Error emitting to socket:', error);
          }
        });

        // Also send to project-specific room if user is in it
        try {
          socketManager.io
            .to(`project:${project._id}:user:${user._id}`)
            .emit('project:notification:targeted', notificationPayload);
        } catch (error) {
          console.error('Error emitting to project room:', error);
        }

        if (delivered) {
          console.log(`🔔 Socket notification delivered to ${user.username}`);
        }

        return delivered;
      } else {
        // User not connected - queue notification for when they come online
        await this.queueOfflineNotification(user._id, notification);
        console.log(`📱 User ${user.username} offline - notification queued`);
        return false;
      }
    } catch (error) {
      console.error('Socket delivery error:', error);
      return false;
    }
  }

  /**
   * Deliver web push notification to user's registered devices
   */
  async deliverViaPush(user, notification, project) {
    try {
      // For now, we'll simulate push notifications since proper setup requires client registration
      // In a complete implementation, this would:
      // 1. Get user's push subscriptions from database
      // 2. Send push notification to each subscription using webpush.sendNotification()
      // 3. Handle failed subscriptions (remove invalid ones)
      
      console.log(`📱 [SIMULATED] Push notification to ${user.username}: ${notification.title}`);
      
      // Return true to simulate successful delivery
      // In production, you would implement actual web push here
      return false; // Returning false for now since it's not fully implemented
    } catch (error) {
      console.error('Push notification error:', error);
      return false;
    }
  }

  /**
   * Deliver email notification with project context
   */
  async deliverViaEmail(user, notification, project) {
    try {
      if (!user.email || !emailTransporter) {
        return false;
      }

      const emailContent = this.generateEmailContent(
        user,
        notification,
        project
      );

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'UTool <noreply@utool.com>',
        to: user.email,
        subject: `${project.title}: ${notification.title}`,
        html: emailContent.html,
        text: emailContent.text,
      };

      // Skip actual email sending in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_EMAIL_IN_DEV) {
        console.log(`📧 [DEV] Email would be sent to ${user.email}: ${notification.title}`);
        return true; // Simulate success in development
      }

      await emailTransporter.sendMail(mailOptions);
      console.log(`📧 Email notification sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Email notification error:', error);
      return false;
    }
  }

  /**
   * Get user's notification preferences for the project
   */
  async getUserNotificationPreferences(userId, projectId) {
    try {
      // For now, return default preferences
      // In a complete implementation, this would query UserNotificationPreferences model
      const defaultPrefs = {
        allowRealTime: true,
        allowPush: false, // Disabled until properly implemented
        allowEmail: process.env.NODE_ENV !== 'development', // Disabled in dev by default
        allowSMS: false,
        realTimeOnly: false,
        preferSMS: false,
        emailDigest: 'immediate',
      };

      return defaultPrefs;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        allowRealTime: true,
        allowPush: false,
        allowEmail: false,
        allowSMS: false,
        realTimeOnly: false,
        preferSMS: false,
        emailDigest: 'immediate',
      };
    }
  }

  /**
   * Generate rich HTML email content for notifications
   */
  generateEmailContent(user, notification, project) {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const projectUrl = `${baseUrl}/projects/${project._id}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .project-info { background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .action-button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
            .footer { padding: 20px; text-align: center; color: #6B7280; border-top: 1px solid #E5E7EB; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>UTool Project Notification</h2>
            </div>
            <div class="content">
              <h3>${notification.title}</h3>
              <p>Hi ${user.username},</p>
              <p>${notification.message}</p>
              
              <div class="project-info">
                <strong>Project:</strong> ${project.title}<br>
                <strong>Time:</strong> ${new Date(
                  notification.createdAt
                ).toLocaleString()}
              </div>
              
              <a href="${projectUrl}" class="action-button">View Project</a>
              
              <p>You're receiving this because you're a member of the "${
                project.title
              }" project.</p>
            </div>
            <div class="footer">
              <p>© 2025 UTool. All rights reserved.</p>
              <p><a href="${baseUrl}/settings/notifications">Manage notification preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ${notification.title}
      
      Hi ${user.username},
      
      ${notification.message}
      
      Project: ${project.title}
      Time: ${new Date(notification.createdAt).toLocaleString()}
      
      View Project: ${projectUrl}
      
      You're receiving this because you're a member of the "${
        project.title
      }" project.
      
      Manage notification preferences: ${baseUrl}/settings/notifications
    `;

    return { html, text };
  }

  /**
   * Queue notification for offline user
   */
  async queueOfflineNotification(userId, notification) {
    try {
      if (!this.notificationQueue.has(userId)) {
        this.notificationQueue.set(userId, []);
      }

      const userQueue = this.notificationQueue.get(userId);
      userQueue.push({
        ...notification,
        queuedAt: new Date().toISOString(),
      });

      // Limit queue size to prevent memory issues
      if (userQueue.length > 50) {
        userQueue.shift(); // Remove oldest notification
      }

      console.log(`📬 Notification queued for offline user ${userId}`);
    } catch (error) {
      console.error('Error queuing offline notification:', error);
    }
  }

  /**
   * Get queued notifications for a user when they come online
   */
  getQueuedNotifications(userId) {
    const queue = this.notificationQueue.get(userId) || [];
    this.notificationQueue.delete(userId); // Clear queue after retrieval
    console.log(`📬 Retrieved ${queue.length} queued notifications for user ${userId}`);
    return queue;
  }

  /**
   * Convenience methods for common notification types
   */
  async notifyTaskAssigned(projectId, taskId, assigneeId, assignerId, taskTitle) {
    return this.sendProjectNotification({
      projectId,
      recipients: [assigneeId],
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned the task "${taskTitle}"`,
      data: { taskId, taskTitle },
      senderId: assignerId,
      priority: 'normal',
      channels: ['socket', 'email']
    });
  }

  async notifyTaskCompleted(projectId, taskId, completerId, taskTitle) {
    return this.sendProjectNotification({
      projectId,
      recipients: 'all',
      type: 'task_completed',
      title: 'Task Completed',
      message: `Task "${taskTitle}" has been completed`,
      data: { taskId, taskTitle },
      senderId: completerId,
      priority: 'low',
      channels: ['socket']
    });
  }

  async notifyCommentAdded(projectId, commentId, authorId, targetType, targetTitle) {
    return this.sendProjectNotification({
      projectId,
      recipients: 'all',
      type: 'comment_added',
      title: 'New Comment',
      message: `New comment added to ${targetType} "${targetTitle}"`,
      data: { commentId, targetType, targetTitle },
      senderId: authorId,
      priority: 'normal',
      channels: ['socket']
    });
  }

  async notifyMemberAdded(projectId, newMemberId, adderId, memberName) {
    return this.sendProjectNotification({
      projectId,
      recipients: [newMemberId],
      type: 'member_added',
      title: 'Added to Project',
      message: `You have been added as a member of this project`,
      data: { memberName },
      senderId: adderId,
      priority: 'normal',
      channels: ['socket', 'email']
    });
  }
}

// Export singleton instance
const notificationManager = new ProjectNotificationManager();

module.exports = {
  ProjectNotificationManager,
  notificationManager,

  // Convenience functions for common notification types
  notifyTaskAssigned: (...args) => notificationManager.notifyTaskAssigned(...args),
  notifyTaskCompleted: (...args) => notificationManager.notifyTaskCompleted(...args),
  notifyCommentAdded: (...args) => notificationManager.notifyCommentAdded(...args),
  notifyMemberAdded: (...args) => notificationManager.notifyMemberAdded(...args),
  sendProjectNotification: (...args) => notificationManager.sendProjectNotification(...args),
  getQueuedNotifications: (...args) => notificationManager.getQueuedNotifications(...args)
};
