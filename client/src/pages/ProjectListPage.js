import React, { useEffect, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  getProjects,
  resetProjectStatus,
} from '../features/projects/projectSlice';
import ProjectCard from '../components/projects/ProjectCard';
import { ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button';

const ProjectListPage = memo(() => {
  const dispatch = useDispatch();
  const { projects, isLoading, isError, message } = useSelector(
    (state) => state.projects
  );

  useEffect(() => {
    dispatch(getProjects()); // Fetch projects on component mount

    // Clean up on unmount
    return () => {
      dispatch(resetProjectStatus());
    };
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-foreground">Loading projects...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error!</strong> {message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Row: Back Link, Title, Create Button */}
      <div className="flex justify-between items-center mb-3 px-4 md:px-0 pt-4">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Projects</h1>
        </div>
        <Button
          variant="primary"
          className="py-2 px-6 text-base font-bold shadow"
          style={{ color: '#F8FAFC' }}
          onClick={() => (window.location.href = '/projects/new')}
        >
          + New Project
        </Button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-grow overflow-y-auto p-4 md:px-0">
        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-10">
            No projects found. Create a new project to get started.
          </p>
        )}
      </div>
    </div>
  );
});

export default ProjectListPage;
