import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Plus, MoreVertical } from 'lucide-react';
import { ProjectCard } from '../molecules/ProjectCard';
import { useNavigate } from 'react-router-dom';

/**
 * ProjectKanban - Displays projects in status-based columns with drag-and-drop
 *
 * This component renders projects in a Kanban board format organized by status.
 * It supports drag-and-drop functionality for moving projects between statuses
 * and provides a visual overview of project workflow.
 *
 * @param {Object} props - Component props
 * @param {Array} props.projects - Array of project objects to display
 * @param {boolean} props.isLoading - Whether projects are currently loading
 * @param {Function} props.onProjectClick - Callback when a project is clicked
 * @param {Function} props.onCreateProject - Callback when create project is clicked
 * @param {Function} props.onStatusChange - Callback when project status changes via drag-drop
 * @param {string} props.className - Additional CSS classes
 */
const ProjectKanban = ({
  projects,
  isLoading,
  onProjectClick,
  onCreateProject,
  onStatusChange,
  className = '',
}) => {
  // State for drag and drop functionality
  const [draggedProject, setDraggedProject] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const navigate = useNavigate();

  /**
   * Default status columns configuration
   * Defines the workflow stages and their visual representation
   */
  const defaultColumns = [
    {
      id: 'planning',
      title: 'Planning',
      description: 'Projects being planned',
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-50',
      darkColor: 'bg-yellow-900/20',
    },
    {
      id: 'active',
      title: 'In Progress',
      description: 'Active development',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      darkColor: 'bg-blue-900/20',
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Under review',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      darkColor: 'bg-purple-900/20',
    },
    {
      id: 'on-hold',
      title: 'On Hold',
      description: 'Paused projects',
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      darkColor: 'bg-orange-900/20',
    },
    {
      id: 'completed',
      title: 'Completed',
      description: 'Finished projects',
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      darkColor: 'bg-green-900/20',
    },
  ];

  /**
   * Group projects by their status into columns
   * Creates a map of status -> projects for each column
   */
  const projectsByStatus = useMemo(() => {
    if (!projects) return {};

    const grouped = {};
    defaultColumns.forEach((column) => {
      grouped[column.id] = [];
    });

    projects.forEach((project) => {
      const status = project.status || 'planning';
      if (grouped[status]) {
        grouped[status].push(project);
      } else {
        // If project has a status not in our default columns, add to planning
        grouped['planning'].push(project);
      }
    });

    return grouped;
  }, [projects]);

  /**
   * Handle drag start - store the dragged project data
   */
  const handleDragStart = (e, project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.dataTransfer.setDragImage(e.target, 0, 0);
  };

  /**
   * Handle drag over - show visual feedback for valid drop zones
   */
  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  /**
   * Handle drag leave - remove visual feedback
   */
  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  /**
   * Handle drop - move project to new status column
   */
  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedProject && draggedProject.status !== newStatus) {
      if (onStatusChange) {
        onStatusChange(draggedProject._id, newStatus);
      }
    }

    setDraggedProject(null);
  };

  /**
   * Handle project click navigation
   */
  const handleProjectClick = (project) => {
    if (onProjectClick) {
      onProjectClick(project);
    }
  };

  /**
   * Handle column actions menu
   */
  const handleColumnAction = (columnId, action) => {
    console.log(`Column action: ${action} for ${columnId}`);
    // TODO: Implement column-specific actions (sort, filter, etc.)
  };

  // Loading state with skeleton columns
  if (isLoading) {
    return (
      <div className={`flex gap-6 overflow-x-auto pb-6 ${className}`}>
        {defaultColumns.map((column) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-80 bg-dark-800 rounded-lg border border-dark-600"
          >
            {/* Column Header Skeleton */}
            <div className="p-4 border-b border-dark-600">
              <div className="flex items-center justify-between mb-2">
                <div className="h-6 bg-dark-600 rounded w-24 animate-pulse"></div>
                <div className="h-8 w-8 bg-dark-600 rounded animate-pulse"></div>
              </div>
              <div className="h-4 bg-dark-600 rounded w-32 animate-pulse"></div>
            </div>

            {/* Cards Skeleton */}
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-dark-700 border border-dark-600 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Global empty state when no projects exist at all
  if (!projects || projects.length === 0) {
    return (
      <div
        className={`flex items-center justify-center min-h-[400px] ${className}`}
      >
        <div className="text-center max-w-md">
          {/* Empty state illustration placeholder */}
          <div className="w-48 h-48 mx-auto mb-6 bg-dark-800 rounded-lg flex items-center justify-center border-2 border-dashed border-dark-600">
            <Plus size={48} className="text-gray-500" />
          </div>

          <h3 className="text-xl font-semibold text-white mb-2">
            No projects yet
          </h3>
          <p className="text-gray-400 mb-6">
            Create your first project to start organizing your work and
            collaborate with your team using the Kanban board view.
          </p>

          <button
            onClick={() => {
              if (onCreateProject) {
                onCreateProject();
              } else {
                // Fallback to navigation (for backward compatibility)
                navigate('/projects/new');
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-dark-800"
          >
            Create First Project
          </button>
        </div>
      </div>
    );
  }

  // Main Kanban board display
  return (
    <div className={`flex gap-6 overflow-x-auto pb-6 ${className}`}>
      {defaultColumns.map((column) => {
        const columnProjects = projectsByStatus[column.id] || [];
        const isDropTarget = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 bg-dark-800 rounded-lg border transition-all duration-200 ${
              isDropTarget ? 'border-blue-400 shadow-lg' : 'border-dark-600'
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="p-4 border-b border-dark-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                  <h3 className="font-semibold text-white">{column.title}</h3>
                  <span className="bg-dark-600 text-gray-300 text-xs px-2 py-1 rounded-full">
                    {columnProjects.length}
                  </span>
                </div>

                <button
                  onClick={() => handleColumnAction(column.id, 'menu')}
                  className="p-1 rounded hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
                  aria-label={`Options for ${column.title} column`}
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              <p className="text-sm text-gray-400">{column.description}</p>
            </div>

            {/* Column Content */}
            <div className="p-4 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
              {/* Projects in this column */}
              <div className="space-y-3">
                {columnProjects.map((project) => (
                  <div
                    key={project._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project)}
                    className="transform transition-all duration-200 hover:scale-105 cursor-move"
                  >
                    <ProjectCard
                      project={project}
                      viewMode="kanban"
                      onClick={() => handleProjectClick(project)}
                      className="cursor-pointer hover:shadow-lg bg-dark-700 border-dark-500"
                    />
                  </div>
                ))}
              </div>

              {/* Empty column state */}
              {columnProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div
                    className={`w-12 h-12 rounded-lg ${column.darkColor} flex items-center justify-center mb-3`}
                  >
                    <Plus size={24} className="text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    No projects in {column.title.toLowerCase()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Drag projects here or create new ones
                  </p>
                </div>
              )}

              {/* Drop zone indicator */}
              {isDropTarget && (
                <div
                  className={`mt-3 p-4 border-2 border-dashed border-blue-400 ${column.darkColor} rounded-lg text-center`}
                >
                  <p className="text-sm text-blue-400 font-medium">
                    Drop to move to {column.title}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// PropTypes for development-time validation
ProjectKanban.propTypes = {
  projects: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
      status: PropTypes.string,
      priority: PropTypes.string,
      category: PropTypes.string,
      progress: PropTypes.shape({
        percentage: PropTypes.number,
      }),
      members: PropTypes.array,
      timeline: PropTypes.shape({
        targetEndDate: PropTypes.string,
      }),
    })
  ),
  isLoading: PropTypes.bool,
  onProjectClick: PropTypes.func,
  onCreateProject: PropTypes.func,
  onStatusChange: PropTypes.func,
  className: PropTypes.string,
};

// Default props for graceful fallbacks
ProjectKanban.defaultProps = {
  projects: [],
  isLoading: false,
  onProjectClick: null,
  onCreateProject: null,
  onStatusChange: null,
  className: '',
};

export default ProjectKanban;
