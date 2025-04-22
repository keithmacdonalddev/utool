# PROJECT-ONLY TASKS IMPLEMENTATION SPECIFICATION

## Core Requirement
Restructure the entire application to make tasks exclusively project-based with zero standalone task functionality.

## Implementation Details

### 1. Architectural Changes
- Remove all standalone task routes/pages
- Modify all task components to require project context
- Update all API endpoints to mandate project ID
- Enforce project association at database/model level

### 2. Client-Side Requirements
```markdown
- [ ] Remove TasksPage and related standalone components
- [ ] Modify TaskCreateModal to require project selection
- [ ] Update QuickTaskWidget to work only within project views
- [ ] Revise taskSlice.js to handle project-scoped operations
- [ ] Update App.js routing to remove standalone task routes
- [ ] Modify Sidebar to remove standalone tasks link
- [ ] Update Dashboard to show project-scoped tasks only
```

### 3. Server-Side Requirements
```markdown
- [ ] Update Task model to enforce project association
- [ ] Modify taskController.js to validate project ownership
- [ ] Update tasks.js routes to require project ID parameter
- [ ] Add middleware for project validation
```

### 4. Data Migration
```markdown
- [ ] Create migration script for orphaned tasks
- [ ] Assign to default project
- [ ] Handle edge cases
- [ ] Provide detailed logging
- [ ] Include rollback capability
```

### 5. Verification Checks
```markdown
- [ ] Confirm no standalone task routes exist
- [ ] Verify API endpoints reject requests without project ID
- [ ] Check all UI paths enforce project context
- [ ] Validate model associations
- [ ] Test all task flows within project scope
```

### Implementation Rules
1. Atomic, incremental changes
2. Backward compatibility during transition
3. Comprehensive logging
4. Zero tolerance for orphaned tasks
5. Strict project validation at all layers
