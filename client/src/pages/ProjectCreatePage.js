import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../features/projects/projectSlice';
import FormInput from '../components/common/FormInput';
import FormTextarea from '../components/common/FormTextarea';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Alert from '../components/common/Alert';
import Loading from '../components/common/Loading';

const ProjectCreatePage = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [error, setError] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, isError, message } = useSelector(
    (state) => state.projects
  );

  const { name, description } = formData;

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    const newProject = { name, description };
    try {
      await dispatch(createProject(newProject)).unwrap();
      navigate('/projects'); // Redirect to projects list after creation
    } catch (err) {
      setError(err || 'Failed to create project');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <PageHeader title="Create Project" backLink="/projects" />

      {isLoading && <Loading message="Creating project..." />}

      {(error || isError) && (
        <Alert
          type="error"
          message={error || message}
          onClose={() => setError('')}
        />
      )}

      <Card>
        <form onSubmit={onSubmit} className="px-2">
          <FormInput
            id="name"
            label="Project Name"
            type="text"
            placeholder="Enter project name"
            name="name"
            value={name}
            onChange={onChange}
            required
            error={error && !name.trim() ? 'Project name is required' : null}
            disabled={isLoading}
          />

          <FormTextarea
            id="description"
            label="Description"
            placeholder="Describe your project"
            name="description"
            value={description}
            onChange={onChange}
            rows="4"
            disabled={isLoading}
            className="mb-6"
          />

          <div className="flex items-center justify-center">
            <Button type="submit" variant="primary" disabled={isLoading}>
              Create Project
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProjectCreatePage;
