# PROJECTS FEATURE REORGANIZATION - MILESTONE 4

## Project Templates & Basic Automation (Week 9-10) - SCOPED FOR DELIVERY

**Risk:** Medium | **Value:** High Productivity Gains | **Complexity:** High
**Status:** Planning Phase - PRIORITIZED SCOPE

---

### Overview - UPDATED SCOPE MANAGEMENT

This milestone introduces **essential template and basic automation features** with a **phased approach** to ensure realistic delivery within the 2-week timeframe. The full enterprise-grade features identified in the original scope will be implemented across M4 (core) and M6 (advanced).

**CRITICAL SCOPE ADJUSTMENT:** The original schema included enterprise-level features (versioning system, marketplace, full security pipeline, internationalization) that represent 4-6 weeks of work. This updated plan focuses on **core functionality first** with a clear path to enhancement.

### Implementation Phases Within M4

#### 🔴 MUST-HAVE (Week 9 - Core Templates)

- Basic project template creation and application
- Essential template schema (no versioning yet)
- Simple template gallery UI
- Core automation rules (basic triggers/actions)

#### 🟡 SHOULD-HAVE (Week 10 - Enhanced Features)

- Template management interface
- Basic automation builder UI
- Simple template sharing
- Basic rule execution engine

#### 🟢 DEFERRED TO M6 (Weeks 13-16 - Enterprise Features)

- Full versioning system with snapshots
- Marketplace features and discovery
- Advanced security validation pipeline
- Internationalization support
- Complex automation workflows

### Integration with Existing Codebase

**Existing Files to Enhance/Modify:**

- `server/models/Project.js` - Add template-related fields
- `server/models/Task.js` - Support template tasks
- `client/src/pages/CreateProjectPage.js` - Current project creation
- `server/controllers/projectController.js` - Project creation logic
- `client/src/features/projects/projectsSlice.js` - Redux state

**New Components to Create:**

- Template management system
- Automation rule builder
- Workflow engine
- Template marketplace UI
- Automation dashboard

**Patterns We'll Maintain:**

- MongoDB for template storage
- Redux for state management
- Existing API patterns
- Tailwind CSS styling
- Lucide React icons

---

## 📊 DELIVERABLES - PRIORITIZED IMPLEMENTATION

### 🔴 CORE DELIVERABLES (Week 9 - Must-Have)

#### 1. Basic Project Template Schema

**File: `server/models/ProjectTemplate.js` (Core Version)**

```javascript
import mongoose from 'mongoose';

/**
 * ProjectTemplate Schema - CORE VERSION
 *
 * Essential template functionality for M4 delivery.
 * Advanced features (versioning, marketplace, security) deferred to M6.
 */
const projectTemplateSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100,
    index: true,
  },
  description: {
    type: String,
    maxLength: 1000,
  },
  category: {
    type: String,
    enum: [
      'development',
      'marketing',
      'event',
      'personal',
      'design',
      'research',
      'other',
    ],
    default: 'other',
  },

  // Ownership & Sharing
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },

  // Template Structure (Core)
  projectData: {
    title: String,
    description: String,
    type: String,
    features: {
      tasks: { type: Boolean, default: true },
      notes: { type: Boolean, default: true },
      files: { type: Boolean, default: true },
      calendar: { type: Boolean, default: true },
      kanban: { type: Boolean, default: true },
    },
    settings: {
      kanbanColumns: [
        {
          name: String,
          status: String,
          order: Number,
        },
      ],
    },
  },

  // Template Tasks (Core)
  taskTemplates: [
    {
      title: { type: String, required: true },
      description: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      estimatedHours: Number,
      assigneeRole: String, // 'owner', 'admin', 'member'
      dependencies: [{ type: Number }], // References to other task templates by index
      dueOffset: Number, // Days from project start
    },
  ],

  // Usage & Metadata (Core)
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsed: Date,

  // Core Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// DEFERRED TO M6: versioning, security validation, marketplace features, internationalization
```

#### 2. Basic Automation Rule Schema

**File: `server/models/AutomationRule.js` (Core Version)**

```javascript
import mongoose from 'mongoose';

/**
 * AutomationRule Schema - CORE VERSION
 *
 * Basic automation functionality for M4.
 * Advanced workflows and complex actions deferred to M6.
 */
const automationRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100,
  },
  description: {
    type: String,
    maxLength: 500,
  },

  // Ownership
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Core Trigger (Simplified)
  trigger: {
    event: {
      type: String,
      enum: [
        'task_created',
        'task_completed',
        'task_overdue',
        'project_status_changed',
      ],
      required: true,
    },
    conditions: [
      {
        field: String,
        operator: {
          type: String,
          enum: ['equals', 'contains', 'greater_than', 'less_than'],
        },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },

  // Core Actions (Simplified)
  actions: [
    {
      type: {
        type: String,
        enum: [
          'create_task',
          'update_task',
          'send_notification',
          'assign_user',
        ],
        required: true,
      },
      config: mongoose.Schema.Types.Mixed, // Action-specific configuration
    },
  ],

  // Control
  isActive: {
    type: Boolean,
    default: true,
  },

  // Core Metadata
  executionCount: { type: Number, default: 0 },
  lastExecuted: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// DEFERRED TO M6: Complex workflows, rate limiting, advanced metrics, script execution
```

#### 3. Core Template Gallery UI

**File: `client/src/components/projects/organisms/TemplateGallery.js` (Core Version)**

```javascript
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Plus, Grid, List, Tag, User } from 'lucide-react';
import {
  fetchTemplates,
  createProjectFromTemplate,
} from '../../../features/templates/templatesSlice';

/**
 * TemplateGallery - CORE VERSION
 *
 * Essential template discovery and selection.
 * Advanced features (marketplace, ratings, advanced search) deferred to M6.
 */
const TemplateGallery = ({ onClose, onTemplateSelect }) => {
  const dispatch = useDispatch();
  const { templates, loading, error } = useSelector((state) => state.templates);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateProject = async (template) => {
    try {
      await dispatch(createProjectFromTemplate(template._id));
      onClose();
    } catch (error) {
      console.error('Failed to create project from template:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Project Templates
        </h2>
        <p className="text-gray-600">
          Choose a template to quickly set up your project
        </p>
      </div>

      {/* Search and Filters - CORE VERSION */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="development">Development</option>
            <option value="marketing">Marketing</option>
            <option value="event">Event</option>
            <option value="personal">Personal</option>
            <option value="design">Design</option>
            <option value="research">Research</option>
            <option value="other">Other</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid/List - CORE VERSION */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading templates...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">Error loading templates: {error}</p>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
              viewMode={viewMode}
              onUse={() => handleCreateProject(template)}
              onSelect={() => onTemplateSelect(template)}
            />
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No templates found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
};

// Core Template Card Component
const TemplateCard = ({ template, viewMode, onUse, onSelect }) => {
  const cardClasses =
    viewMode === 'grid'
      ? 'bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer'
      : 'bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer flex items-center space-x-4';

  return (
    <div className={cardClasses} onClick={onSelect}>
      {/* Template Icon/Preview */}
      <div
        className={
          viewMode === 'grid'
            ? 'w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4'
            : 'w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0'
        }
      >
        <Tag className="w-6 h-6 text-blue-600" />
      </div>

      <div className="flex-1">
        {/* Template Name */}
        <h3
          className={
            viewMode === 'grid'
              ? 'font-semibold text-gray-900 mb-2'
              : 'font-semibold text-gray-900'
          }
        >
          {template.name}
        </h3>

        {/* Template Description */}
        {template.description && (
          <p
            className={`text-gray-600 text-sm ${
              viewMode === 'grid' ? 'mb-4 line-clamp-2' : 'line-clamp-1'
            }`}
          >
            {template.description}
          </p>
        )}

        {/* Template Metadata */}
        <div
          className={`flex items-center justify-between ${
            viewMode === 'grid' ? 'mt-4' : ''
          }`}
        >
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span>{template.usageCount || 0} uses</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onUse();
            }}
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            Use Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateGallery;

// DEFERRED TO M6: Advanced search, ratings/reviews, template marketplace features, preview mode
```

### 🟡 ENHANCED DELIVERABLES (Week 10 - Should-Have)

#### 4. Basic Automation Builder UI

**File: `client/src/components/projects/organisms/AutomationBuilder.js` (Core Version)**

```javascript
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Save, Plus, Trash2, Play, Pause } from 'lucide-react';
import {
  createAutomationRule,
  updateAutomationRule,
} from '../../../features/automation/automationSlice';

/**
 * AutomationBuilder - CORE VERSION
 *
 * Basic rule creation interface for M4.
 * Advanced workflow builder and visual editor deferred to M6.
 */
const AutomationBuilder = ({ projectId, rule = null, onClose }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    trigger: rule?.trigger || {
      event: 'task_created',
      conditions: [],
    },
    actions: rule?.actions || [{ type: 'send_notification', config: {} }],
    isActive: rule?.isActive ?? true,
  });

  const triggerEvents = [
    { value: 'task_created', label: 'Task Created' },
    { value: 'task_completed', label: 'Task Completed' },
    { value: 'task_overdue', label: 'Task Overdue' },
    { value: 'project_status_changed', label: 'Project Status Changed' },
  ];

  const actionTypes = [
    { value: 'create_task', label: 'Create Task' },
    { value: 'update_task', label: 'Update Task' },
    { value: 'send_notification', label: 'Send Notification' },
    { value: 'assign_user', label: 'Assign User' },
  ];

  const handleSave = async () => {
    try {
      const ruleData = { ...formData, project: projectId };

      if (rule?._id) {
        await dispatch(updateAutomationRule({ id: rule._id, data: ruleData }));
      } else {
        await dispatch(createAutomationRule(ruleData));
      }

      onClose();
    } catch (error) {
      console.error('Failed to save automation rule:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {rule ? 'Edit Automation Rule' : 'Create Automation Rule'}
          </h2>
          <p className="text-gray-600 mt-1">
            Set up automatic actions based on project events
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Auto-assign new tasks"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Describe what this rule does..."
              />
            </div>
          </div>

          {/* Trigger Configuration - SIMPLIFIED */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              When this happens...
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Event
              </label>
              <select
                value={formData.trigger.event}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    trigger: { ...formData.trigger, event: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {triggerEvents.map((event) => (
                  <option key={event.value} value={event.value}>
                    {event.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions Configuration - SIMPLIFIED */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Do this...</h3>

            {formData.actions.map((action, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Action {index + 1}
                  </label>
                  {formData.actions.length > 1 && (
                    <button
                      onClick={() => {
                        const newActions = formData.actions.filter(
                          (_, i) => i !== index
                        );
                        setFormData({ ...formData, actions: newActions });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <select
                  value={action.type}
                  onChange={(e) => {
                    const newActions = [...formData.actions];
                    newActions[index] = { type: e.target.value, config: {} };
                    setFormData({ ...formData, actions: newActions });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {actionTypes.map((actionType) => (
                    <option key={actionType.value} value={actionType.value}>
                      {actionType.label}
                    </option>
                  ))}
                </select>

                {/* Basic Action Configuration */}
                {action.type === 'send_notification' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Notification message"
                      value={action.config.message || ''}
                      onChange={(e) => {
                        const newActions = [...formData.actions];
                        newActions[index].config.message = e.target.value;
                        setFormData({ ...formData, actions: newActions });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => {
                setFormData({
                  ...formData,
                  actions: [
                    ...formData.actions,
                    { type: 'send_notification', config: {} },
                  ],
                });
              }}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Action</span>
            </button>
          </div>

          {/* Rule Status */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Enable this rule
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{rule ? 'Update Rule' : 'Create Rule'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutomationBuilder;

// DEFERRED TO M6: Visual workflow editor, complex conditions, advanced action types, rule testing
```

### 🟢 DEFERRED TO M6 (Enterprise Features)

The following enterprise-grade features will be implemented in M6 (Weeks 13-16):

#### Advanced ProjectTemplate Features:

- **Versioning System:** Template history, snapshots, migration instructions, rollback capabilities
- **Security Pipeline:** Script execution controls, sandbox settings, CSP, content sanitization
- **Marketplace Features:** Template discovery, ratings, reviews, publishing workflow
- **Internationalization:** Multi-language template support, localized content

#### Advanced Automation Features:

- **Complex Workflow Engine:** Visual workflow editor, conditional branches, loops
- **Advanced Script Execution:** Secure sandboxing with vm2, custom script validation
- **Enterprise Metrics:** Execution analytics, performance monitoring, rate limiting
- **Advanced UI/UX:** Drag-and-drop workflow builder, real-time testing, debugging tools

#### Implementation Strategy for M6:

```javascript
// M6 will extend the core schemas with enterprise features:
const projectTemplateSchema = new mongoose.Schema({
  // ...core fields from M4

  // M6 Enterprise Extensions:
  versioning: {
    version: { type: String, default: '1.0.0' },
    history: [templateVersionSchema],
    snapshots: [templateSnapshotSchema],
    migrationInstructions: String,
  },

  security: {
    scriptExecution: securityConfigSchema,
    contentValidation: validationRuleSchema,
    auditLog: [auditEntrySchema],
  },

  marketplace: {
    isPublished: { type: Boolean, default: false },
    ratings: [ratingSchema],
    downloads: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },

  localization: {
    defaultLanguage: { type: String, default: 'en' },
    translations: [translationSchema],
  },
});
```

---
