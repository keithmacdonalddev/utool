# Project-Only Tasks Implementation Guide

## Overview

This document outlines the implementation details for moving to a project-only task architecture. In this new architecture, tasks can only exist within the context of a project, and there are no standalone tasks.

## Architectural Changes

### Key Changes

1. **All tasks must belong to a project**

   - The Task model now strictly enforces project association with a pre-save hook
   - No standalone tasks are allowed

2. **Route Architecture**

   - Tasks are only accessible through nested project routes
   - Removed standalone task routes (`/api/v1/tasks`)
   - All task operations go through `/api/v1/projects/:projectId/tasks`

3. **Client-Side Navigation**

   - Removed standalone task routes from the UI
   - Tasks are only accessible through project details pages
   - Redirects from old task URLs to projects

4. **Data Migration**
   - Created migration script to move orphaned tasks to a default project

## Implementation Details

### Server-Side Changes

1. **Task Model**

   - Updated schema to require project field
   - Added pre-save middleware to validate project existence
   - Added index for efficient task queries by project

2. **Routes**

   - Removed standalone task routes
   - Added project context validation middleware
   - All task routes are now nested under project routes

3. **Controllers**
   - Updated controllers to validate project ownership
   - Added project context to all task operations
   - Added migration utility for orphaned tasks

### Client-Side Changes

1. **Redux Store**

   - Updated task slice to require project context
   - Modified all task operations to include projectId
   - Added projectId validation to all Redux thunks

2. **Navigation**

   - Removed standalone task links from sidebar
   - Redirected old task routes to the projects page
   - Enhanced project details page to manage tasks

3. **UI Components**
   - Task forms now require project selection
   - Task list shows project context

## Migration Path

For migrating existing data:

1. Run the `migrateOrphanedTasks.js` script to move orphaned tasks to a default project

   - Execute: `node server/scripts/migrateOrphanedTasks.js`
   - Add `--dry-run` flag to see what would happen without making changes
   - Use `--rollback <backup-file>` to revert changes if needed

2. Update client applications to use new routes
   - New task creation: `/api/v1/projects/:projectId/tasks`
   - Fetch tasks: `/api/v1/projects/:projectId/tasks`
   - Task operations: `/api/v1/projects/:projectId/tasks/:taskId`

## API Changes

### Removed Endpoints

- `GET /api/v1/tasks` - List all tasks
- `POST /api/v1/tasks` - Create a standalone task
- `GET /api/v1/tasks/:id` - Get a task by ID
- `PUT /api/v1/tasks/:id` - Update a task
- `DELETE /api/v1/tasks/:id` - Delete a task

### New Endpoints

All task endpoints are now nested under projects:

- `GET /api/v1/projects/:projectId/tasks` - List tasks for a project
- `POST /api/v1/projects/:projectId/tasks` - Create a task in a project
- `GET /api/v1/projects/:projectId/tasks/:id` - Get a task in a project
- `PUT /api/v1/projects/:projectId/tasks/:id` - Update a task in a project
- `DELETE /api/v1/projects/:projectId/tasks/:id` - Delete a task from a project
- `PUT /api/v1/projects/:projectId/tasks/bulk-update` - Bulk update tasks in a project

## Testing

### Test Scenarios

1. **Project Access**

   - Users should only see tasks from projects they belong to
   - Project owners and members should have appropriate permissions

2. **Task Operations**
   - Creating a task should require a valid project
   - All task operations should enforce project context
   - Batch operations should only work within a single project

### Test Cases

1. Attempt to create a task without a project (should fail)
2. Create a task within a project (should succeed)
3. Update a task while trying to change project (should fail)
4. List tasks from a project you don't belong to (should fail)
5. Delete a task from another user's project (should fail)
6. Migrate orphaned tasks (should succeed)

## Future Enhancements

1. **Project Templates**

   - Allow creating project templates with predefined tasks
   - Enable creating new projects from templates

2. **Task Dependencies**

   - Implement cross-project task dependencies
   - Add task dependency visualization

3. **Project-Based Reporting**
   - Add enhanced reporting for task progress by project
   - Task completion statistics by project

## References

- [Task Model Documentation](server/models/Task.js)
- [Project Routes](server/routes/projects.js)
- [Task Controller](server/controllers/taskController.js)
- [Client Task Slice](client/src/features/tasks/taskSlice.js)
