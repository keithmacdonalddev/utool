import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createTask, resetTaskStatus } from '../../features/tasks/taskSlice';
import Button from '../common/Button';

const QuickTaskWidget = ({ projectId }) => { // Receive projectId as a prop
  const [title, setTitle] = useState('');
  const dispatch = useDispatch();
  const { isLoading, isError, message } = useSelector((state) => state.tasks);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      // Optionally show a local error message
      console.error("Task title cannot be empty");
      return;
    }
    dispatch(resetTaskStatus()); // Reset previous status
    dispatch(createTask({ title, projectId })); // Dispatch title and projectId
    setTitle(''); // Clear input after submission
  };

  return (
    <div className="p-4 border border-dark-700 rounded-xl shadow-card bg-card text-text">
      <h3 className="text-lg font-bold mb-3 text-[#F8FAFC]">Quick Add Task</h3>
      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label htmlFor="quickTaskTitle" className="sr-only">Task Title</label>
            <input
            type="text"
            id="quickTaskTitle"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title..."
            required
            className={`shadow appearance-none border border-accent-blue rounded w-full py-2 px-3 bg-dark-800 text-white placeholder-gray-400 leading-tight focus:outline-none focus:ring-2 focus:ring-accent-blue ${isLoading ? 'opacity-60' : ''}`}
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          className="w-full rounded-xl"
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Task'}
        </Button>
        {/* Display task-specific errors */}
        {isError && message && <p className="text-red-500 text-xs italic mt-2">{message}</p>}
      </form>
    </div>
  );
};

export default QuickTaskWidget;
