import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ProjectCard } from '../molecules/ProjectCard';
import { Plus } from 'lucide-react';

/**
 * ProjectGrid - Displays projects in a responsive grid layout
 *
 * This component renders projects using ProjectCard components in a grid format.
 * It handles loading states, empty states, and project navigation.
 *
 * @param {Object} props - Component props
 * @param {Array} props.projects - Array of project objects to display
 * @param {boolean} props.isLoading - Whether projects are currently loading
 * @param {Function} props.onProjectClick - Callback when a project is clicked
 * @param {Function} props.onCreateProject - Callback when create project is clicked
 * @param {string} props.className - Additional CSS classes
 */
const ProjectGrid = ({
  projects,
  isLoading,
  onProjectClick,
  onCreateProject,
  className = '',
}) => {
  const navigate = useNavigate();

  /**
   * Handle project card click
   * Calls the provided callback or navigates to project details
   */
  const handleProjectClick = (project) => {
    // 🚨 OBVIOUS PROJECT CLICK TRACKING LOG 🚨
    console.log('🖱️ ==========================================');
    console.log('🖱️ PROJECT CLICKED ON DASHBOARD (ProjectGrid)!');
    console.log('🖱️ Project ID:', project._id);
    console.log('🖱️ Project Name:', project.name);
    console.log('🖱️ Timestamp:', new Date().toISOString());
    console.log('🖱️ ==========================================');

    if (onProjectClick) {
      onProjectClick(project);
    } else {
      navigate(`/projects/${project._id}`);
    }
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

  // Loading state with skeleton cards
  if (isLoading) {
    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-64 bg-dark-800 border border-dark-600 rounded-lg animate-pulse"
          >
            {/* Skeleton content */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-6 bg-dark-600 rounded mb-2"></div>
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-dark-600 rounded"></div>
                    <div className="h-5 w-14 bg-dark-600 rounded"></div>
                  </div>
                </div>
                <div className="h-8 w-8 bg-dark-600 rounded"></div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-dark-600 rounded w-full"></div>
                <div className="h-4 bg-dark-600 rounded w-3/4"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-dark-600 rounded w-1/2"></div>
                <div className="h-2 bg-dark-600 rounded"></div>
              </div>
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
            collaborate with your team.
          </p>

          <button
            onClick={handleCreateProject}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-dark-800"
          >
            Create First Project
          </button>
        </div>
      </div>
    );
  }

  // Main grid display with projects
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}
    >
      {projects.map((project) => (
        <div
          key={project._id}
          className="transform transition-all duration-200 hover:scale-105"
        >
          <ProjectCard
            project={project}
            viewMode="grid"
            onClick={() => handleProjectClick(project)}
            className="h-full cursor-pointer hover:shadow-lg"
          />
        </div>
      ))}
    </div>
  );
};

// PropTypes for development-time validation
ProjectGrid.propTypes = {
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
    })
  ),
  isLoading: PropTypes.bool,
  onProjectClick: PropTypes.func,
  onCreateProject: PropTypes.func,
  className: PropTypes.string,
};

// Default props for graceful fallbacks
ProjectGrid.defaultProps = {
  projects: [],
  isLoading: false,
  onProjectClick: null,
  onCreateProject: null,
  className: '',
};

export default ProjectGrid;
