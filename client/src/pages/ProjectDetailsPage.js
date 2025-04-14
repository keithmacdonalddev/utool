import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api'; // Assuming you have an api.js for making requests

const ProjectDetailsPage = () => {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchProject = async () => {
            setIsLoading(true);
            try {
                const response = await api.get(`/api/v1/projects/${id}`);
                setProject(response.data.data);
            } catch (error) {
                setIsError(true);
                setMessage(error.response?.data?.message || 'Failed to fetch project details.');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchProject();
        }
    }, [id]);

    if (isLoading) {
        return <div className="container mx-auto p-4">Loading project details...</div>;
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

    if (!project) {
        return <div className="container mx-auto p-4">Project not found.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">{project.name}</h1>
            <p className="text-gray-700 mb-4">{project.description}</p>
            <p className="text-gray-500">Status: {project.status}</p>
            {/* Add more project details here */}
            <div className="mt-4">
                <Link to={`/projects/${project._id}/edit`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2">
                    Edit
                </Link>
                {/* TODO: Add delete functionality later */}
            </div>
        </div>
    );
};

export default ProjectDetailsPage;
