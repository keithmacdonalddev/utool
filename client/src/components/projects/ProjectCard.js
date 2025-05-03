import React from 'react';
import { Link } from 'react-router-dom';

const ProjectCard = ({ project, taskCounts = { open: 0, critical: 0 } }) => {
  const { _id, name, status, progress } = project;
  const { open, critical } = taskCounts;

  return (
    <Link
      to={`/projects/${_id}`}
      className="block bg-card rounded-lg shadow p-4 hover:shadow-lg transition"
    >
      <h3 className="text-xl font-semibold text-[#F8FAFC] truncate">{name}</h3>
      <div className="h-2 bg-gray-600 rounded-full mt-2 overflow-hidden">
        <div
          className="bg-green-500 h-2 rounded-full"
          style={{ width: `${progress}%` }}
          title={`${progress}%`}
        />
      </div>
      <div className="flex justify-between items-center mt-2 text-sm text-[#C7C9D1]">
        <span>Status: {status}</span>
        <span>{progress}%</span>
      </div>

      {/* Task counts section with border for visual separation */}
      <div className="mt-3 pt-3 border-t border-dark-600">
        <div className="flex">
          <span className="text-sm font-medium text-[#C7C9D1]">
            Open tasks: <span className="text-blue-400">{open}</span>
            {critical > 0 && (
              <span className="text-red-400 ml-1">({critical} Critical)</span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;
