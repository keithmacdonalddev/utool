import React, { useEffect, memo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  getProjects,
  resetProjectStatus,
} from '../features/projects/projectSlice';
import ProjectCard from '../components/projects/ProjectCard';
import { ArrowLeft, Grid, List, AlignJustify } from 'lucide-react';
import Button from '../components/common/Button';

const ProjectListPage = memo(() => {
  const dispatch = useDispatch();
  const { projects, isLoading, isError, message } = useSelector(
    (state) => state.projects
  );
  // Add view mode state with localStorage persistence
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('projectViewMode') || 'grid';
  });

  // Function to set view mode and save it to localStorage
  const setViewModeWithStorage = (mode) => {
    localStorage.setItem('projectViewMode', mode);
    setViewMode(mode);
  };

  useEffect(() => {
    dispatch(getProjects()); // Fetch projects on component mount

    // Clean up on unmount
    return () => {
      dispatch(resetProjectStatus());
    };
  }, [dispatch]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Render project as a list item
  const renderListItem = (project) => {
    return (
      <Link
        to={`/projects/${project._id}`}
        key={project._id}
        className="block bg-card border border-dark-700 rounded-lg p-4 mb-3 hover:bg-dark-700 transition-colors"
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-[#F8FAFC]">
              {project.name}
            </h3>
            <p className="text-sm text-[#C7C9D1] mt-1">
              Status: {project.status}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-sm text-[#C7C9D1] mb-1">
              Progress: {project.progress || 0}%
            </div>
            <div className="w-32 bg-gray-600 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${project.progress || 0}%` }}
              />
            </div>
          </div>
        </div>
      </Link>
    );
  };

  // Render project as a table row
  const renderTableItem = (project) => {
    return (
      <tr
        key={project._id}
        className="hover:bg-dark-700 transition-colors cursor-pointer"
        onClick={() => (window.location.href = `/projects/${project._id}`)}
      >
        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#F8FAFC]">
          {project.name}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1]">
          {project.status}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1]">
          {formatDate(project.dueDate || project.endDate)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-full bg-gray-600 rounded-full h-2 mr-2 overflow-hidden">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${project.progress || 0}%` }}
              />
            </div>
            <span className="text-sm text-[#C7C9D1]">
              {project.progress || 0}%
            </span>
          </div>
        </td>
      </tr>
    );
  };

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
      {/* Header Row: Back Link, Title, View Toggle, Create Button */}
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

        <div className="flex items-center gap-3">
          {/* View Toggle Buttons */}
          <div className="bg-dark-700 rounded-lg p-1 flex">
            <button
              onClick={() => setViewModeWithStorage('grid')}
              className={`p-2 rounded-md ${
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewModeWithStorage('list')}
              className={`p-2 rounded-md ${
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="List View"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewModeWithStorage('table')}
              className={`p-2 rounded-md ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Table View"
            >
              <AlignJustify size={18} />
            </button>
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
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-grow overflow-y-auto p-4 md:px-0">
        {projects && projects.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col overflow-hidden">
              {projects.map((project) => renderListItem(project))}
            </div>
          ) : (
            <div className="overflow-x-auto bg-dark-800 rounded-lg border border-dark-700">
              <table className="min-w-full divide-y divide-dark-700">
                <thead>
                  <tr className="bg-primary bg-opacity-20">
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                    >
                      Due Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                    >
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-dark-700">
                  {projects.map((project) => renderTableItem(project))}
                </tbody>
              </table>
            </div>
          )
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
