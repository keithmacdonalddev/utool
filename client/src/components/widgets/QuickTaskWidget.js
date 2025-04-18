import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createTask, resetTaskStatus } from '../../features/tasks/taskSlice';
import Button from '../common/Button';
import Card from '../common/Card';
import FormInput from '../common/FormInput';

const QuickTaskWidget = ({ projectId }) => {
  const [title, setTitle] = useState('');
  const dispatch = useDispatch();
  const { isLoading, isError, message } = useSelector((state) => state.tasks);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }
    dispatch(resetTaskStatus());
    dispatch(createTask({ title, projectId }));
    setTitle('');
  };

  return (
    <Card title="Quick Add Task">
      <form onSubmit={onSubmit}>
        <FormInput
          id="quickTaskTitle"
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title..."
          required
          disabled={isLoading}
          error={isError ? message : null}
          inputClassName="bg-dark-800"
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Task'}
        </Button>
      </form>
    </Card>
  );
};

export default QuickTaskWidget;
