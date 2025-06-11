import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ProjectBadge } from '../atoms/ProjectBadge';
import {
  Calendar,
  Users,
  MoreVertical,
  Clock,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * ProjectCard - Molecule component for displaying project information in a card format
 *
 * This component combines atomic components and displays key project information
 * in an organized, scannable format. It's designed to work in both grid and list views.
 *
 * @param {Object} props - Component props
 * @param {Object} props.project - Project data object
 * @param {('grid'|'list'|'kanban')} props.viewMode - Display mode for the card
 * @param {Function} props.onMenuClick - Handler for menu actions
 * @param {Function} props.onClick - Handler for card click
 * @param {string} props.className - Additional CSS classes
 */
export const ProjectCard = React.memo(
  ({ project, viewMode = 'grid', onMenuClick, onClick, className }) => {
    const navigate = useNavigate();

    // Error boundary-like error handling for critical operations
    const safeFormatDate = (date) => {
      try {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
      } catch (error) {
        console.warn('ProjectCard: Invalid date format', date, error);
        return 'Unknown';
      }
    };

    /**
     * Calculate project health indicator based on various factors
     * This provides a quick visual indicator of project status
     */
    const getProjectHealth = () => {
      try {
        if (project?.isOverdue) return 'critical';
        if (project?.progress?.metrics?.overdueTasks > 0) return 'warning';
        if (project?.status === 'On Hold' || project?.status === 'on-hold')
          return 'paused';
        return 'healthy';
      } catch (error) {
        console.warn('ProjectCard: Error calculating project health', error);
        return 'healthy';
      }
    };

    const healthIndicators = {
      healthy: {
        color: 'text-green-500',
        icon: CheckSquare,
        label: 'On Track',
      },
      warning: {
        color: 'text-yellow-500',
        icon: AlertCircle,
        label: 'Needs Attention',
      },
      critical: { color: 'text-red-500', icon: AlertCircle, label: 'Critical' },
      paused: { color: 'text-gray-500', icon: Clock, label: 'Paused' },
    };

    const health = getProjectHealth();
    const HealthIcon = healthIndicators[health].icon;

    /**
     * Handle card click to navigate to project details
     * Prevents navigation when clicking on interactive elements
     */
    const handleCardClick = (e) => {
      // 🚨 OBVIOUS PROJECT CLICK TRACKING LOG 🚨
      console.log('🖱️ ==========================================');
      console.log('🖱️ PROJECT CLICKED ON DASHBOARD!');
      console.log('🖱️ Project ID:', project._id);
      console.log('🖱️ Project Name:', project.name);
      console.log('🖱️ Timestamp:', new Date().toISOString());
      console.log('🖱️ ==========================================');

      try {
        // Check if the click was on an interactive element
        if (e.target.closest('button') || e.target.closest('[role="button"]')) {
          return;
        }

        // Prioritize the passed-in onClick handler
        if (onClick) {
          onClick(e);
          return;
        }

        // Fallback to direct navigation if no handler is provided
        if (project?._id) {
          navigate(`/projects/${project._id}`);
        }
      } catch (error) {
        console.error('ProjectCard: Navigation error', error);
      }
    };

    /**
     * Handle dropdown menu click
     * Prevents card navigation and triggers menu action
     */
    const handleMenuButtonClick = (e) => {
      try {
        e.stopPropagation();
        if (onMenuClick && project?._id) {
          onMenuClick(project._id, e);
        }
      } catch (error) {
        console.error('ProjectCard: Menu click error', error);
      }
    };

    // Validate required project data
    if (!project || !project._id) {
      console.warn('ProjectCard: Invalid project data provided');
      return (
        <div className="bg-white rounded-lg border border-red-200 p-4">
          <p className="text-red-600 text-sm">Error: Invalid project data</p>
        </div>
      );
    }

    // Format the last activity time for display
    const lastActivityText = project.activity?.lastActivityAt
      ? `Active ${safeFormatDate(project.activity.lastActivityAt)}`
      : 'No recent activity';

    // Get progress percentage with fallback
    const progressPercentage = project.progress?.percentage || 0;

    // Get task metrics with fallback
    const taskMetrics = project.progress?.metrics || {
      completedTasks: 0,
      totalTasks: 0,
      overdueTasks: 0,
    };

    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
          viewMode === 'grid' ? 'p-5' : 'p-4'
        } ${className || ''}`}
        onClick={handleCardClick}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {project.name || 'Untitled Project'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <ProjectBadge
                variant="type"
                value={project.category || 'other'}
                size="sm"
              />
              <ProjectBadge variant="status" value={project.status} size="sm" />
              {project.priority &&
                project.priority !== 'Medium' &&
                project.priority !== 'medium' && (
                  <ProjectBadge
                    variant="priority"
                    value={project.priority}
                    size="sm"
                  />
                )}
            </div>
          </div>

          {/* Menu Button */}
          <button
            onClick={handleMenuButtonClick}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Project options"
          >
            <MoreVertical className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Project Description */}
        {project.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
              }}
            />
          </div>
        </div>

        {/* Project Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {taskMetrics.completedTasks}/{taskMetrics.totalTasks} Tasks
            </span>
          </div>
          <div className="flex items-center gap-2">
            <HealthIcon
              className={`h-4 w-4 ${healthIndicators[health].color}`}
            />
            <span className={`text-sm ${healthIndicators[health].color}`}>
              {healthIndicators[health].label}
            </span>
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Team Members */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <div className="flex -space-x-2">
              {/* Show up to 3 member avatars */}
              {project.members?.slice(0, 3).map((member, index) => (
                <div
                  key={member.user || member._id || index}
                  className="w-7 h-7 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center"
                  title={
                    member.userName || member.user?.username || 'Team member'
                  }
                >
                  <span className="text-xs font-medium text-gray-600">
                    {(member.userName ||
                      member.user?.username ||
                      'U')[0].toUpperCase()}
                  </span>
                </div>
              ))}
              {/* Show count if more than 3 members */}
              {project.members && project.members.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    +{project.members.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Due Date or Last Activity */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {project.timeline?.targetEndDate || project.endDate ? (
              <>
                <Calendar className="h-3 w-3" />
                <span>
                  Due{' '}
                  {safeFormatDate(
                    project.timeline?.targetEndDate || project.endDate
                  )}
                </span>
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                <span>{lastActivityText}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);

// Set display name for debugging
ProjectCard.displayName = 'ProjectCard';

// PropTypes validation for development and runtime error prevention
ProjectCard.propTypes = {
  project: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.string,
    priority: PropTypes.string,
    category: PropTypes.string,
    isOverdue: PropTypes.bool,
    progress: PropTypes.shape({
      percentage: PropTypes.number,
      metrics: PropTypes.shape({
        completedTasks: PropTypes.number,
        totalTasks: PropTypes.number,
        overdueTasks: PropTypes.number,
      }),
    }),
    activity: PropTypes.shape({
      lastActivityAt: PropTypes.string,
    }),
    timeline: PropTypes.shape({
      targetEndDate: PropTypes.string,
    }),
    endDate: PropTypes.string,
    members: PropTypes.arrayOf(
      PropTypes.shape({
        user: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
        _id: PropTypes.string,
        userName: PropTypes.string,
      })
    ),
  }).isRequired,
  viewMode: PropTypes.oneOf(['grid', 'list', 'kanban']),
  onMenuClick: PropTypes.func,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

ProjectCard.defaultProps = {
  viewMode: 'grid',
  onMenuClick: null,
  onClick: null,
  className: '',
};

export default ProjectCard;
