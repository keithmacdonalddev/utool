import Project from '../models/Project.js';
import Task from '../models/Task.js';
// import { logger } from '../utils/logger.js';
import { sendNotification } from '../utils/socketManager.js';

// Temporary logger implementation until we have a proper logger
const logger = {
  info: (message, data = {}) => console.log('INFO:', message, data),
  error: (message, error = null) => console.error('ERROR:', message, error),
  warn: (message, data = {}) => console.warn('WARN:', message, data),
};

/**
 * ProjectService - Centralized business logic for project operations
 *
 * This service layer separates business logic from the controller,
 * making it easier to maintain, test, and reuse across different
 * parts of the application (e.g., API routes, background jobs, webhooks)
 */
class ProjectService {
  /**
   * Create a new project with initial setup
   *
   * @param {Object} projectData - Project information
   * @param {ObjectId} userId - ID of the user creating the project
   * @param {Object} req - Express request object (to access io instance)
   * @returns {Promise<Project>} The created project
   */
  async createProject(projectData, userId, req = null) {
    try {
      // Filter members to avoid duplicating the owner
      const filteredMembers =
        projectData.members?.filter(
          (m) => m.user.toString() !== userId.toString()
        ) || [];

      // Create the project with the user as owner
      const project = new Project({
        ...projectData,
        owner: userId,
        // Ensure the owner isn't duplicated in the members array
        members: filteredMembers,
        'activity.lastActivityAt': new Date(),
      });

      // Save the project first to get its ID
      await project.save();

      // Initialize project structure based on type
      await this.initializeProjectStructure(project);

      // Log the creation
      logger.info(`Project created: ${project._id} by user ${userId}`);

      // Send real-time notification to team members
      if (project.members.length > 0 && req?.app?.get('io')) {
        const io = req.app.get('io');
        const memberIds = project.members.map((m) => m.user);

        // Send notifications to each member
        for (const memberId of memberIds) {
          await sendNotification(io, memberId, {
            _id: `project_created_${project._id}_${Date.now()}`,
            type: 'project_created',
            title: 'Added to New Project',
            message: `You have been added to the project "${project.name}"`,
            data: {
              projectId: project._id,
              projectName: project.name,
              createdBy: userId,
            },
            createdAt: new Date().toISOString(),
          });
        }
      }

      return project;
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Initialize default project structure based on project type
   * Creates default tasks, categories, and settings
   *
   * @param {Project} project - The project to initialize
   * @private
   */
  async initializeProjectStructure(project) {
    try {
      // Define default structures for different project types
      const defaultStructures = {
        development: {
          tasks: [
            {
              title: 'Project Setup',
              description: 'Initialize repository and development environment',
              status: 'Not Started',
              priority: 'High',
            },
            {
              title: 'Requirements Analysis',
              description: 'Gather and document project requirements',
              status: 'Not Started',
              priority: 'High',
            },
            {
              title: 'Design Phase',
              description: 'Create wireframes and technical design',
              status: 'Not Started',
              priority: 'Medium',
            },
            {
              title: 'Implementation',
              description: 'Core development work',
              status: 'Not Started',
              priority: 'Medium',
            },
            {
              title: 'Testing',
              description: 'Unit tests and QA',
              status: 'Not Started',
              priority: 'Medium',
            },
            {
              title: 'Deployment',
              description: 'Deploy to production',
              status: 'Not Started',
              priority: 'High',
            },
          ],
          kanbanColumns: [
            { id: 'backlog', name: 'Backlog', color: '#6B7280', order: 0 },
            { id: 'todo', name: 'To Do', color: '#3B82F6', order: 1 },
            {
              id: 'in-progress',
              name: 'In Progress',
              color: '#F59E0B',
              order: 2,
            },
            { id: 'review', name: 'Review', color: '#8B5CF6', order: 3 },
            { id: 'done', name: 'Done', color: '#10B981', order: 4 },
          ],
        },
        marketing: {
          tasks: [
            {
              title: 'Market Research',
              description: 'Analyze target audience and competitors',
              status: 'Not Started',
              priority: 'High',
            },
            {
              title: 'Campaign Strategy',
              description: 'Develop marketing campaign strategy',
              status: 'Not Started',
              priority: 'High',
            },
            {
              title: 'Content Creation',
              description: 'Create marketing materials',
              status: 'Not Started',
              priority: 'Medium',
            },
            {
              title: 'Campaign Launch',
              description: 'Execute marketing campaign',
              status: 'Not Started',
              priority: 'Medium',
            },
            {
              title: 'Performance Analysis',
              description: 'Analyze campaign results',
              status: 'Not Started',
              priority: 'Medium',
            },
          ],
          kanbanColumns: [
            { id: 'ideas', name: 'Ideas', color: '#6B7280', order: 0 },
            { id: 'planning', name: 'Planning', color: '#3B82F6', order: 1 },
            {
              id: 'in-progress',
              name: 'In Progress',
              color: '#F59E0B',
              order: 2,
            },
            { id: 'completed', name: 'Completed', color: '#10B981', order: 3 },
          ],
        },
        default: {
          tasks: [
            {
              title: 'Project Kickoff',
              description: 'Initial project setup and planning',
              status: 'Not Started',
              priority: 'High',
            },
            {
              title: 'Define Objectives',
              description: 'Clear project goals and success criteria',
              status: 'Not Started',
              priority: 'High',
            },
          ],
          kanbanColumns: [
            { id: 'todo', name: 'To Do', color: '#3B82F6', order: 0 },
            {
              id: 'in-progress',
              name: 'In Progress',
              color: '#F59E0B',
              order: 1,
            },
            { id: 'done', name: 'Done', color: '#10B981', order: 2 },
          ],
        },
      };

      // Get the appropriate structure or use default
      const structure =
        defaultStructures[project.category] || defaultStructures.default;

      // Create default tasks
      if (structure.tasks && structure.tasks.length > 0) {
        const tasks = structure.tasks.map((taskData) => ({
          ...taskData,
          project: project._id,
          assignee: project.owner,
          createdBy: project.owner,
        }));

        await Task.insertMany(tasks);

        // Update project task metrics
        project.progress.metrics.totalTasks = tasks.length;
        project.progress.metrics.inProgressTasks = 0;
        project.progress.metrics.completedTasks = 0;
      }

      // Set up Kanban columns
      if (structure.kanbanColumns) {
        project.settings.kanbanColumns = structure.kanbanColumns;
      }

      // Save the updated project
      await project.save();
    } catch (error) {
      logger.error(
        `Error initializing project structure for ${project._id}:`,
        error
      );
      // Don't throw here - project creation should succeed even if initialization fails
    }
  }

  /**
   * Update project with validation and notifications
   *
   * @param {ObjectId} projectId - Project ID
   * @param {Object} updates - Fields to update
   * @param {ObjectId} userId - User making the update
   * @param {Object} req - Express request object (to access io instance)
   * @returns {Promise<Project>} Updated project
   */
  async updateProject(projectId, updates, userId, req = null) {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check permissions
      if (!this.hasPermission(project, userId, 'canEditProject')) {
        throw new Error('Insufficient permissions to edit project');
      }

      // Input validation and sanitization
      const allowedUpdates = [
        'name',
        'description',
        'status',
        'priority',
        'visibility',
        'category',
        'timeline',
        'features',
        'settings',
        'tags',
        'metadata',
      ];

      const sanitizedUpdates = {};

      for (const key of Object.keys(updates)) {
        if (allowedUpdates.includes(key)) {
          const value = updates[key];

          // Sanitize string inputs
          if (typeof value === 'string') {
            sanitizedUpdates[key] = value.trim();

            // Additional validation for specific fields
            if (
              key === 'name' &&
              (!value.trim() || value.trim().length > 100)
            ) {
              throw new Error(
                'Project name must be between 1 and 100 characters'
              );
            }
            if (key === 'description' && value.length > 2000) {
              throw new Error('Description cannot exceed 2000 characters');
            }
          } else if (typeof value === 'object' && value !== null) {
            // Handle nested objects (timeline, features, settings, etc.)
            sanitizedUpdates[key] = value;
          } else {
            sanitizedUpdates[key] = value;
          }
        } else {
          logger.warn(`Attempted to update disallowed field: ${key}`);
        }
      }

      // Validate enum values
      if (sanitizedUpdates.status) {
        const validStatuses = [
          'planning',
          'active',
          'on-hold',
          'completed',
          'archived',
        ];
        if (!validStatuses.includes(sanitizedUpdates.status)) {
          throw new Error(
            `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          );
        }
      }

      if (sanitizedUpdates.priority) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(sanitizedUpdates.priority)) {
          throw new Error(
            `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
          );
        }
      }

      if (sanitizedUpdates.visibility) {
        const validVisibilities = ['private', 'team', 'organization', 'public'];
        if (!validVisibilities.includes(sanitizedUpdates.visibility)) {
          throw new Error(
            `Invalid visibility. Must be one of: ${validVisibilities.join(
              ', '
            )}`
          );
        }
      }

      if (sanitizedUpdates.category) {
        const validCategories = [
          'development',
          'marketing',
          'design',
          'research',
          'operations',
          'other',
        ];
        if (!validCategories.includes(sanitizedUpdates.category)) {
          throw new Error(
            `Invalid category. Must be one of: ${validCategories.join(', ')}`
          );
        }
      }

      // Apply sanitized updates
      Object.assign(project, sanitizedUpdates);
      project.activity.lastActivityAt = new Date();

      await project.save();

      // Send notifications to team members
      if (req?.app?.get('io')) {
        const io = req.app.get('io');
        const memberIds = project.members.map((m) => m.user);
        const allRecipients = [...memberIds, project.owner];

        // Send notifications to each recipient
        for (const recipientId of allRecipients) {
          await sendNotification(io, recipientId, {
            _id: `project_updated_${project._id}_${Date.now()}`,
            type: 'project_updated',
            title: 'Project Updated',
            message: `The project "${project.name}" has been updated`,
            data: {
              projectId: project._id,
              projectName: project.name,
              updatedBy: userId,
              changes: Object.keys(sanitizedUpdates),
            },
            createdAt: new Date().toISOString(),
          });
        }
      }

      return project;
    } catch (error) {
      logger.error(`Error updating project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Add a member to a project
   *
   * @param {ObjectId} projectId - Project ID
   * @param {Object} memberData - Member information (user, role, permissions)
   * @param {ObjectId} invitedBy - User adding the member
   * @param {Object} req - Express request object (to access io instance)
   * @returns {Promise<Project>} Updated project
   */
  async addMember(projectId, memberData, invitedBy, req = null) {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check if user can manage members
      if (!this.hasPermission(project, invitedBy, 'canManageMembers')) {
        throw new Error('Insufficient permissions to manage members');
      }

      // Check if member already exists
      const existingMember = project.members.find(
        (m) => m.user.toString() === memberData.user.toString()
      );
      if (existingMember) {
        throw new Error('User is already a member of this project');
      }

      // Add the member
      project.members.push({
        ...memberData,
        invitedBy,
        joinedAt: new Date(),
      });

      await project.save();

      // Send notifications if socket.io is available
      if (req?.app?.get('io')) {
        const io = req.app.get('io');

        // Notify the new member
        await sendNotification(io, memberData.user, {
          _id: `added_to_project_${project._id}_${Date.now()}`,
          type: 'added_to_project',
          title: 'Added to Project',
          message: `You have been added to the project "${project.name}"`,
          data: {
            projectId: project._id,
            projectName: project.name,
            role: memberData.role,
            invitedBy,
          },
          createdAt: new Date().toISOString(),
        });

        // Notify other team members
        const otherMembers = project.members
          .filter((m) => m.user.toString() !== memberData.user.toString())
          .map((m) => m.user);
        const otherRecipients = [...otherMembers, project.owner];

        for (const recipientId of otherRecipients) {
          await sendNotification(io, recipientId, {
            _id: `member_added_${project._id}_${Date.now()}`,
            type: 'member_added',
            title: 'New Team Member',
            message: `A new member has been added to "${project.name}"`,
            data: {
              projectId: project._id,
              projectName: project.name,
              newMemberName: memberData.userName, // Assume this is passed
              addedBy: invitedBy,
            },
            createdAt: new Date().toISOString(),
          });
        }
      }

      return project;
    } catch (error) {
      logger.error(`Error adding member to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get project statistics and analytics
   *
   * @param {ObjectId} projectId - Project ID
   * @returns {Promise<Object>} Project statistics
   */
  async getProjectStats(projectId) {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Update progress metrics
      await project.calculateProgress();

      // Get additional statistics
      const taskStats = await Task.aggregate([
        { $match: { project: projectId } },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] },
            },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ['$dueDate', new Date()] },
                      { $ne: ['$status', 'Completed'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalEstimatedHours: { $sum: '$estimatedHours' },
            totalActualHours: { $sum: '$actualHours' },
          },
        },
      ]);

      return {
        project: {
          id: project._id,
          name: project.name,
          status: project.status,
          progress: project.progress,
          timeline: project.timeline,
          memberCount: project.members.length + 1, // +1 for owner
          isOverdue: project.isOverdue,
        },
        tasks: taskStats[0] || {
          totalTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          totalEstimatedHours: 0,
          totalActualHours: 0,
        },
        activity: {
          lastActivityAt: project.activity.lastActivityAt,
          totalActivities: project.activity.totalActivities,
        },
      };
    } catch (error) {
      logger.error(`Error getting stats for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Find a single project by ID with populated fields
   *
   * @param {string} projectId - Project ID
   * @returns {Promise<Project>} Project document with populated fields
   */
  async findProjectById(projectId) {
    const logPrefix = `[PROJECT_SERVICE][${new Date().toISOString()}] findProjectById:`;

    try {
      logger.info(
        `${logPrefix} Attempting to find project with ID: ${projectId}`
      );

      if (!projectId) {
        logger.error(`${logPrefix} Project ID is required`);
        throw new Error('Project ID is required');
      }

      // Find project with populated owner and member details
      const project = await Project.findById(projectId)
        .populate('owner', 'id name email')
        .populate('members.user', 'id name email');

      logger.info(
        `${logPrefix} Database query completed. Project found: ${!!project}`
      );

      if (project) {
        logger.info(
          `${logPrefix} Project data retrieved for ID: ${projectId}`,
          {
            projectName: project.name,
            owner: project.owner?._id || project.owner,
            memberCount: project.members?.length || 0,
          }
        );
      } else {
        logger.warn(`${logPrefix} No project found with ID: ${projectId}`);
      }

      return project;
    } catch (error) {
      logger.error(`${logPrefix} Error finding project ${projectId}:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  }

  /**
   * Check if a user has a specific permission on a project
   *
   * @param {Project} project - Project document
   * @param {ObjectId} userId - User ID
   * @param {String} permission - Permission to check
   * @returns {Boolean} Whether user has permission
   */
  hasPermission(project, userId, permission) {
    return project.userHasPermission(userId, permission);
  }

  /**
   * Archive a project and all related data
   *
   * @param {ObjectId} projectId - Project ID
   * @param {ObjectId} userId - User archiving the project
   * @param {Object} req - Express request object (to access io instance)
   * @returns {Promise<Project>} Archived project
   */
  async archiveProject(projectId, userId, req = null) {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check permissions
      if (!this.hasPermission(project, userId, 'canDeleteProject')) {
        throw new Error('Insufficient permissions to archive project');
      }

      // Update project status
      project.status = 'archived';
      project.activity.lastActivityAt = new Date();

      // Archive all tasks
      await Task.updateMany(
        { project: projectId },
        { $set: { archived: true } }
      );

      await project.save();

      // Notify team members
      if (req?.app?.get('io')) {
        const io = req.app.get('io');
        const memberIds = project.members.map((m) => m.user);
        const allRecipients = [...memberIds, project.owner];

        for (const recipientId of allRecipients) {
          await sendNotification(io, recipientId, {
            _id: `project_archived_${project._id}_${Date.now()}`,
            type: 'project_archived',
            title: 'Project Archived',
            message: `The project "${project.name}" has been archived`,
            data: {
              projectId: project._id,
              projectName: project.name,
              archivedBy: userId,
            },
            createdAt: new Date().toISOString(),
          });
        }
      }

      return project;
    } catch (error) {
      logger.error(`Error archiving project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get all projects accessible to a user
   *
   * @param {ObjectId} userId - User ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Array of projects
   */
  async getUserProjects(userId, filters = {}) {
    try {
      return await Project.findAccessible(userId, filters)
        .populate('owner', 'username email firstName lastName')
        .populate('members.user', 'username email firstName lastName')
        .sort({ 'activity.lastActivityAt': -1 });
    } catch (error) {
      logger.error(`Error getting projects for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a project permanently
   *
   * @param {ObjectId} projectId - Project ID
   * @param {ObjectId} userId - User deleting the project
   * @param {Object} req - Express request object (to access io instance)
   * @returns {Promise<Boolean>} Success status
   */
  async deleteProject(projectId, userId, req = null) {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check permissions - only owner can delete
      if (project.owner.toString() !== userId.toString()) {
        throw new Error('Only project owner can delete the project');
      }

      // Delete all related tasks
      await Task.deleteMany({ project: projectId });

      // Delete the project
      await Project.findByIdAndDelete(projectId);

      // Notify team members
      if (req?.app?.get('io')) {
        const io = req.app.get('io');
        const memberIds = project.members.map((m) => m.user);

        for (const memberId of memberIds) {
          await sendNotification(io, memberId, {
            _id: `project_deleted_${project._id}_${Date.now()}`,
            type: 'project_deleted',
            title: 'Project Deleted',
            message: `The project "${project.name}" has been deleted`,
            data: {
              projectName: project.name,
              deletedBy: userId,
            },
            createdAt: new Date().toISOString(),
          });
        }
      }

      logger.info(`Project deleted: ${projectId} by user ${userId}`);

      return true;
    } catch (error) {
      logger.error(`Error deleting project ${projectId}:`, error);
      throw error;
    }
  }
}

export default new ProjectService();
