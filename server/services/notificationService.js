/**
 * Notification Service
 *
 * Centralized notification delivery system for project collaboration features.
 */

const { getSocketManager } = require('../utils/socketManager');
const User = require('../models/User');
const Project = require('../models/Project');

class NotificationService {
  constructor() {
    this.socketManager = getSocketManager();
  }

  /**
   * Send notification to project members
   */
  async sendProjectNotification({
    projectId,
    recipients,
    type,
    title,
    message,
    data = {},
    priority = 'normal',
    channels = ['socket'],
    senderId = null,
  }) {
    try {
      console.log('📢 Sending project notification:', {
        projectId,
        type,
        title,
      });

      const project = await Project.findById(projectId)
        .populate('owner')
        .populate('members.user');

      if (!project) {
        throw new Error('Project not found');
      }

      let targetUsers = [];
      if (recipients === 'all') {
        targetUsers = [project.owner, ...project.members.map((m) => m.user)];
      } else if (Array.isArray(recipients)) {
        targetUsers = await User.find({ _id: { $in: recipients } });
      }

      if (senderId) {
        targetUsers = targetUsers.filter(
          (user) => user._id.toString() !== senderId.toString()
        );
      }

      targetUsers = targetUsers.filter((user) => user && user._id);

      if (targetUsers.length === 0) {
        return { success: true, recipientCount: 0 };
      }

      const notificationData = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        type,
        title,
        message,
        data: { ...data, projectTitle: project.title, projectId: project._id },
        priority,
        createdAt: new Date().toISOString(),
        senderId,
      };

      const deliveryPromises = targetUsers.map((user) =>
        this.deliverToUser(user, notificationData, project, channels)
      );

      const results = await Promise.allSettled(deliveryPromises);

      const successCount = results.filter(
        (r) => r.status === 'fulfilled'
      ).length;
      const failureCount = results.filter(
        (r) => r.status === 'rejected'
      ).length;

      return {
        success: true,
        recipientCount: targetUsers.length,
        successCount,
        failureCount,
      };
    } catch (error) {
      console.error('❌ Failed to send project notification:', error);
      throw error;
    }
  }

  async deliverToUser(user, notification, project, channels) {
    const results = {};

    if (channels.includes('socket')) {
      results.socket = await this.deliverViaSocket(user, notification, project);
    }

    return results;
  }

  async deliverViaSocket(user, notification, project) {
    try {
      if (!this.socketManager) {
        return false;
      }

      const userSockets = this.socketManager.getUserSockets(user._id);

      if (!userSockets || userSockets.length === 0) {
        return false;
      }

      const socketPayload = {
        ...notification,
        project: { id: project._id, title: project.title },
        user: { id: user._id, username: user.username },
      };

      let delivered = false;
      userSockets.forEach((socket) => {
        try {
          socket.emit('project:notification', socketPayload);
          delivered = true;
        } catch (error) {
          console.error('Error emitting to socket:', error);
        }
      });

      return delivered;
    } catch (error) {
      console.error('Socket delivery error:', error);
      return false;
    }
  }

  // Convenience methods
  async notifyTaskAssigned(
    projectId,
    taskId,
    assigneeId,
    assignerId,
    taskTitle
  ) {
    return this.sendProjectNotification({
      projectId,
      recipients: [assigneeId],
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned the task "${taskTitle}"`,
      data: { taskId, taskTitle },
      senderId: assignerId,
    });
  }

  async notifyCommentAdded(
    projectId,
    commentId,
    authorId,
    targetType,
    targetTitle
  ) {
    return this.sendProjectNotification({
      projectId,
      recipients: 'all',
      type: 'comment_added',
      title: 'New Comment',
      message: `New comment added to ${targetType} "${targetTitle}"`,
      data: { commentId, targetType, targetTitle },
      senderId: authorId,
    });
  }
}

const notificationService = new NotificationService();

module.exports = {
  NotificationService,
  notificationService,
  sendProjectNotification: (...args) =>
    notificationService.sendProjectNotification(...args),
  notifyTaskAssigned: (...args) =>
    notificationService.notifyTaskAssigned(...args),
  notifyCommentAdded: (...args) =>
    notificationService.notifyCommentAdded(...args),
};
