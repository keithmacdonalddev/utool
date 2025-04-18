import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  getTask,
  updateTask,
  deleteTask,
  resetTaskStatus,
} from '../features/tasks/taskSlice';

const TaskDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    currentTask: task,
    isLoading,
    isError,
    message,
  } = useSelector((state) => state.tasks);
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    dueDate: '',
  });

  useEffect(() => {
    dispatch(getTask(id));
    return () => {
      dispatch(resetTaskStatus());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || '',
        priority: task.priority || '',
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().substr(0, 10)
          : '',
      });
    }
  }, [task]);

  const onChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    await dispatch(updateTask({ taskId: id, updates: form })).unwrap();
    navigate('/tasks');
  };

  const onDelete = async () => {
    if (window.confirm('Delete this task?')) {
      await dispatch(deleteTask(id)).unwrap();
      navigate('/tasks');
    }
  };

  if (isLoading)
    return <div className="container mx-auto p-4">Loading task...</div>;
  if (isError)
    return (
      <div className="container mx-auto p-4 text-red-600">Error: {message}</div>
    );
  if (!task)
    return <div className="container mx-auto p-4">Task not found.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Task</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={onChange}
              className="p-2 border rounded"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={onChange}
              className="p-2 border rounded"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={onChange}
              className="p-2 border rounded"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskDetailsPage;
