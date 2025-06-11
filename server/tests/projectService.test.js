import { jest } from '@jest/globals';
import projectService from '../services/projectService.js';

// Mock the Socket.IO sendNotification function
const mockSendNotification = jest.fn();
jest.unstable_mockModule('../utils/socketManager.js', () => ({
  sendNotification: mockSendNotification,
}));

// Mock the Project model
const mockProject = {
  _id: 'test-project-id',
  name: 'Test Project',
  owner: 'test-user-id',
  members: [{ user: 'test-member-id' }],
  save: jest.fn().mockResolvedValue(true),
};

const mockProjectCreate = jest.fn().mockResolvedValue(mockProject);
const mockProjectFindById = jest.fn().mockResolvedValue(mockProject);

jest.unstable_mockModule('../models/Project.js', () => ({
  default: {
    create: mockProjectCreate,
    findById: mockProjectFindById,
  },
}));

// Mock Task model
jest.unstable_mockModule('../models/Task.js', () => ({
  default: {
    insertMany: jest.fn().mockResolvedValue([]),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    aggregate: jest.fn().mockResolvedValue([]),
  },
}));

describe('ProjectService Socket.IO Integration', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createProject with Socket.IO notifications', () => {
    it('should send real-time notifications to team members when creating a project', async () => {
      // Mock req object with Socket.IO instance
      const mockIo = {
        emit: jest.fn(),
      };

      const mockReq = {
        app: {
          get: jest.fn().mockReturnValue(mockIo),
        },
      };

      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
        members: ['test-member-id'],
      };

      const userId = 'test-user-id';

      // Call the service method
      await projectService.createProject(projectData, userId, mockReq);

      // Verify that sendNotification was called
      expect(mockSendNotification).toHaveBeenCalledWith(
        mockIo,
        'test-member-id',
        expect.objectContaining({
          type: 'project_created',
          title: 'Added to New Project',
          message: expect.stringContaining('Test Project'),
          data: expect.objectContaining({
            projectId: mockProject._id,
            projectName: 'Test Project',
            createdBy: userId,
          }),
        })
      );
    });

    it('should not send notifications when Socket.IO is not available', async () => {
      // Mock req object without Socket.IO instance
      const mockReq = {
        app: {
          get: jest.fn().mockReturnValue(null),
        },
      };

      const projectData = {
        name: 'Test Project',
        members: ['test-member-id'],
      };

      const userId = 'test-user-id';

      // Call the service method
      await projectService.createProject(projectData, userId, mockReq);

      // Verify that sendNotification was NOT called
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should work when no req object is provided (backward compatibility)', async () => {
      const projectData = {
        name: 'Test Project',
        members: ['test-member-id'],
      };

      const userId = 'test-user-id';

      // Call the service method without req object
      const result = await projectService.createProject(projectData, userId);

      // Should still create the project
      expect(result).toBeDefined();
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('updateProject with Socket.IO notifications', () => {
    it('should send notifications when updating a project', async () => {
      // Mock project.userHasPermission to return true
      mockProject.userHasPermission = jest.fn().mockReturnValue(true);

      const mockIo = {
        emit: jest.fn(),
      };

      const mockReq = {
        app: {
          get: jest.fn().mockReturnValue(mockIo),
        },
      };

      const updates = { name: 'Updated Project Name' };
      const userId = 'test-user-id';

      await projectService.updateProject(
        'test-project-id',
        updates,
        userId,
        mockReq
      );

      // Verify notifications were sent to team members and owner
      expect(mockSendNotification).toHaveBeenCalledTimes(2); // 1 member + 1 owner
      expect(mockSendNotification).toHaveBeenCalledWith(
        mockIo,
        expect.any(String),
        expect.objectContaining({
          type: 'project_updated',
          title: 'Project Updated',
          message: expect.stringContaining('updated'),
        })
      );
    });
  });
});
