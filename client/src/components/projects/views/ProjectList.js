import React from 'react';
import PropTypes from 'prop-types';
import {
  Calendar,
  Users,
  CheckCircle,
  MoreVertical,
  Clock,
  Folder,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ProjectBadge } from '../atoms/ProjectBadge';
import { useNavigate } from 'react-router-dom';

/**
 * ProjectList - Displays projects in a detailed list format
 *
 * This component renders projects in a vertical list with comprehensive
 * information visible for each project including progress, team size,
 * deadlines, and status indicators.
 *
 * @param {Object} props - Component props
 * @param {Array} props.projects - Array of project objects to display
 * @param {boolean} props.isLoading - Whether projects are currently loading
 * @param {Function} props.onProjectClick - Callback when a project is clicked
 * @param {Function} props.onCreateProject - Callback when create project is clicked
 * @param {string} props.className - Additional CSS classes
 */
const ProjectList = ({
  projects,
  isLoading,
  onProjectClick,
  onCreateProject,
  className = '',
}) => {
  const navigate = useNavigate();

  /**
   * Handle project click navigation
   * Calls the provided callback or navigates to project details
   */
  const handleProjectClick = (project) => {
    if (onProjectClick) {
      onProjectClick(project);
    } else {
      navigate(`/projects/${project._id}`);
    }
  };

  /**
   * Handle menu button click (prevents propagation)
   * Opens project actions menu
   */
  const handleMenuClick = (e, project) => {
    e.stopPropagation();
    // TODO: Implement project actions menu
    console.log('Menu clicked for project:', project.name);
  };

  /**
   * Handle create new project action
   * Uses callback if provided, otherwise falls back to navigation
   */
  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    } else {
      // Fallback to navigation (for backward compatibility)
      navigate('/projects/new');
    }
  };

  /**
   * Format date for display with safe error handling
   * Returns relative time or fallback string
   */
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Not set';
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      console.warn('ProjectList: Invalid date format', dateString);
      return 'Invalid date';
    }
  };

  /**
   * Get progress bar color based on completion percentage
   * Returns appropriate Tailwind color classes
   */
  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Loading state with skeleton items
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-dark-800 border border-dark-600 rounded-lg p-6 animate-pulse"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-6 bg-dark-600 rounded w-48"></div>
                  <div className="h-5 w-16 bg-dark-600 rounded"></div>
                  <div className="h-5 w-14 bg-dark-600 rounded"></div>
                </div>
                <div className="h-4 bg-dark-600 rounded w-2/3 mb-3"></div>
                <div className="flex items-center gap-6">
                  <div className="h-4 w-24 bg-dark-600 rounded"></div>
                  <div className="h-4 w-20 bg-dark-600 rounded"></div>
                  <div className="h-4 w-28 bg-dark-600 rounded"></div>
                </div>
              </div>
              <div className="h-8 w-8 bg-dark-600 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state when no projects exist
  if (!projects || projects.length === 0) {
    return (
      <div
        className={`flex items-center justify-center min-h-[300px] ${className}`}
      >
        <div className="text-center">
          <Folder size={48} className="text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No projects found
          </h3>
          <p className="text-gray-400">
            Try adjusting your filters or create a new project.
          </p>
          <button
            onClick={handleCreateProject}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Create Project
          </button>
        </div>
      </div>
    );
  }

  // Main list display with projects
  return (
    <div className={`space-y-4 ${className}`}>
      {projects.map((project) => {
        const progressPercentage = project.progress?.percentage || 0;
        const memberCount = project.members?.length || 0;
        const hasDeadline = project.timeline?.targetEndDate;

        return (
          <div
            key={project._id}
            className="bg-dark-800 border border-dark-600 rounded-lg p-6 hover:bg-dark-700 transition-all cursor-pointer hover:shadow-lg hover:border-dark-500"
            onClick={() => handleProjectClick(project)}
          >
            <div className="flex items-center justify-between gap-4">
              {/* Project Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg text-white truncate">
                    {project.name || 'Untitled Project'}
                  </h3>

                  <ProjectBadge
                    variant="status"
                    value={project.status}
                    size="sm"
                  />

                  {project.priority && project.priority !== 'medium' && (
                    <ProjectBadge
                      variant="priority"
                      value={project.priority}
                      size="sm"
                    />
                  )}

                  {project.category && (
                    <ProjectBadge
                      variant="type"
                      value={project.category}
                      size="sm"
                    />
                  )}
                </div>

                {/* Project Description */}
                {project.description && (
                  <p className="text-sm text-gray-400 line-clamp-1 mb-3">
                    {project.description}
                  </p>
                )}

                {/* Project Metrics */}
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>{progressPercentage}% complete</span>
                    <div className="w-16 bg-dark-600 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                          progressPercentage
                        )}`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, progressPercentage)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Team Size */}
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Deadline */}
                  {hasDeadline && (
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>
                        Due {formatDate(project.timeline.targetEndDate)}
                      </span>
                    </div>
                  )}

                  {/* Last Activity */}
                  {project.activity?.lastActivityAt && (
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>
                        Active {formatDate(project.activity.lastActivityAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Menu */}
              <button
                onClick={(e) => handleMenuClick(e, project)}
                className="p-2 rounded hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
                aria-label={`Options for ${project.name}`}
              >
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// PropTypes for development-time validation
ProjectList.propTypes = {
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
      activity: PropTypes.shape({
        lastActivityAt: PropTypes.string,
      }),
    })
  ),
  isLoading: PropTypes.bool,
  onProjectClick: PropTypes.func,
  onCreateProject: PropTypes.func,
  className: PropTypes.string,
};

// Default props for graceful fallbacks
ProjectList.defaultProps = {
  projects: [],
  isLoading: false,
  onProjectClick: null,
  onCreateProject: null,
  className: '',
};

export default ProjectList;
