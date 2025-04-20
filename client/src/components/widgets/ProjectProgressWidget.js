import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProjects } from '../../features/projects/projectSlice';
import { Link } from 'react-router-dom';
import Spinner from '../common/Spinner';

const ProjectProgressWidget = () => {
  const dispatch = useDispatch();
  const { projects, isLoading, error } = useSelector((state) => state.projects);

  useEffect(() => {
    dispatch(getProjects());
  }, [dispatch]);

  // Sort projects by due date (closest first)
  const sortedProjects = [...(projects || [])]
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3); // Only show 3 most immediate projects

  return (
    <div className="p-4 border border-dark-700 rounded-xl shadow-card bg-app-card text-text">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Project Progress</h3>
        <Link
          to="/projects"
          className="text-sm text-primary hover:text-primary-light"
        >
          View All
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-error">Error loading projects</p>
      ) : sortedProjects.length > 0 ? (
        <div className="space-y-4">
          {sortedProjects.map((project) => (
            <div key={project._id} className="border-b border-dark-600 pb-3">
              <div className="flex justify-between items-center mb-1">
                <Link
                  to={`/projects/${project._id}`}
                  className="font-medium text-text hover:text-primary"
                >
                  {project.name}
                </Link>
                <span className="text-xs text-muted">
                  {project.progress || 0}%
                </span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2.5 mt-1 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${project.progress || 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-text-muted py-4">No projects found</p>
      )}
    </div>
  );
};

export default ProjectProgressWidget;
