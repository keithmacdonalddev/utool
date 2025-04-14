import React, { useEffect, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getProjects, resetProjectStatus } from '../features/projects/projectSlice';
import ProjectCard from '../components/projects/ProjectCard';

const ProjectListPage = memo(() => {
    const dispatch = useDispatch();
    const { projects, isLoading, isError, message } = useSelector((state) => state.projects);

    useEffect(() => {
        dispatch(getProjects()); // Fetch projects on component mount

        // Clean up on unmount
        return () => {
            dispatch(resetProjectStatus());
        };
    }, [dispatch]);

    if (isLoading) {
        return <div className="container mx-auto p-4">Loading projects...</div>;
    }

    if (isError) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error!</strong> {message}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Projects</h1>
            <Link to="/projects/new" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4 inline-block">
                Create Project
            </Link>
            {projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project) => (
                        <ProjectCard key={project._id} project={project} />
                    ))}
                </div>
            ) : (
                <p>No projects found.</p>
            )}
        </div>
    );
});

export default ProjectListPage;
