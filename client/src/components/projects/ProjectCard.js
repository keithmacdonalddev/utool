import React, { memo } from 'react';
import { Link } from 'react-router-dom';

const ProjectCard = memo(({ project }) => {
    return (
        <div className="bg-[#23242B] shadow-2xl rounded-xl overflow-hidden">
            <div className="p-4">
                <h3 className="text-xl font-bold mb-2 text-[#F8FAFC]">{project.name}</h3>
                <p className="text-[#F8FAFC] text-sm">{project.description}</p>
            </div>
            <div className="px-4 py-2 bg-[#23242B] border-t border-[#393A41]">
                <Link to={`/projects/${project._id}`} className="text-accent-purple font-bold hover:text-accent-blue hover:underline text-sm">
                    View Details
                </Link>
            </div>
        </div>
    );
});

export default ProjectCard;
