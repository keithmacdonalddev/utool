import React from 'react';
import { Link } from 'react-router-dom';

const ProjectCard = ({ project }) => {
  const { _id, name, status, progress } = project;
  return (
    <Link
      to={`/projects/${_id}`}
      className="block bg-[#1E1E2E] rounded-lg shadow p-4 hover:shadow-lg transition"
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
    </Link>
  );
};

export default ProjectCard;
