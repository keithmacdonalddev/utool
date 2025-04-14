import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom'; // To link to projects later
import { getProjects } from '../../features/projects/projectSlice'; // Import the action

const ProjectProgressWidget = () => {
  const dispatch = useDispatch();
  const { projects, isLoading, isError, message } = useSelector((state) => state.projects);

  useEffect(() => {
    // Fetch projects when component mounts
    dispatch(getProjects());
  }, [dispatch]);

  // Placeholder for progress calculation
  const calculateProgress = (project) => {
    // TODO: Implement actual progress calculation based on tasks
    // This might involve fetching tasks for the project or having progress pre-calculated on backend
    if (project.status === 'Completed') return 100;
    if (project.status === 'Planning') return 0;
    // Placeholder logic
    return Math.floor(Math.random() * 81) + 10; // Random progress between 10-90 for demo
  };

  return (
    <div className="p-4 border border-dark-700 rounded-xl shadow-card bg-card text-text">
      <h3 className="text-lg font-bold mb-3 text-[#F8FAFC]">Project Progress</h3>
      {isLoading && <p className="text-[#C7C9D1]">Loading projects...</p>}
      {isError && <p className="text-red-400 text-sm">{message || 'Error loading projects.'}</p>}
      {!isLoading && !isError && (
        <ul className="space-y-3">
          {projects.length > 0 ? (
            projects.slice(0, 4).map((project) => { // Show top 4 projects
              const progress = calculateProgress(project);
              return (
                <li key={project._id}>
                  {/* TODO: Update link destination when project view page exists */}
                  <Link to={`/projects/${project._id}`} className="text-sm font-bold text-[#F8FAFC] hover:text-accent-purple hover:underline block truncate">
                    {project.name}
                  </Link>
                  <div className="w-full bg-dark-700 rounded-full h-2.5 mt-1">
                    <div
                      className="bg-accent-blue h-2.5 rounded-full"
                      style={{ width: `${progress}%` }}
                      title={`${progress}% Complete`}
                    ></div>
                  </div>
                   <p className="text-xs text-[#C7C9D1] mt-0.5">{project.status} - {progress}%</p>
                </li>
              );
            })
          ) : (
            <p className="text-sm text-[#C7C9D1]">No projects found.</p>
          )}
        </ul>
      )}
       <div className="mt-3 text-right">
         <Link to="/projects" className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline mr-2">
            View All Projects
         </Link>
         <Link to="/projects/new" className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline">
            + New Project
         </Link>
       </div>
    </div>
  );
};

export default ProjectProgressWidget;
