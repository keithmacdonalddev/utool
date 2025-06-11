/**
 * Projects Components - Main Index
 *
 * Centralized exports following atomic design principles:
 * - Atoms: Basic building blocks
 * - Molecules: Combinations of atoms
 * - Organisms: Complex components with business logic
 * - Views: Page-level components
 */

// ========== ATOMS ==========
// Basic UI building blocks
export {
  ProjectBadge,
  TaskBadge,
  UserAvatar,
  ProgressBar,
  StatusSelect,
  PrioritySelect,
  DatePicker,
} from './atoms';

// ========== MOLECULES ==========
// Components that combine atoms
export {
  ProjectCard,
  TaskCard,
  TaskColumn,
  CommentThread,
  ProjectStatsBar,
  ProjectFilters,
  ProjectDetailsInfo,
  ProjectNotes,
  QuickAddTask,
  TaskFilters,
  BulkTaskActions,
} from './molecules';

// ========== ORGANISMS ==========
// Complex components with business logic
export {
  TaskBoard,
  TaskDetail,
  TaskListView,
  UserPresence,
  ActivityFeed,
  RealTimeCollaborationInterface,
  CreateProjectModal,
  DashboardSettingsModal,
} from './organisms';

// ========== VIEWS ==========
// Page-level components (if any exist in views directory)
// These would be exported individually when needed

// ========== LEGACY COMPATIBILITY ==========
// Backward compatibility exports for components that may be imported directly
export { default as ProjectCard } from './molecules/ProjectCard';
export { default as TaskCard } from './molecules/TaskCard';
export { default as TaskBoard } from './organisms/TaskBoard';
export { default as CreateProjectModal } from './organisms/CreateProjectModal';
