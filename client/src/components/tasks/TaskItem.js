import React from 'react';
import { useDispatch } from 'react-redux';
import { updateTask, deleteTask } from '../../features/tasks/taskSlice';

const TaskItem = ({
  task,
  showCheckbox = false,
  selected = false,
  onSelect,
}) => {
  const dispatch = useDispatch();
  const { _id, title, status, priority, dueDate } = task;

  const handleStatusChange = (e) => {
    dispatch(updateTask({ taskId: _id, updates: { status: e.target.value } }));
  };

  const handleDelete = () => {
    if (window.confirm('Delete this task?')) {
      dispatch(deleteTask(_id));
    }
  };

  return (
    <li className="flex items-center justify-between p-3 bg-[#1E1E2E] rounded-md space-x-4">
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(_id)}
          className="mr-2"
        />
      )}
      <div>
        <h3 className="text-lg font-semibold text-[#F8FAFC] truncate">
          {title}
        </h3>
        <div className="flex space-x-2 mt-1">
          <select
            value={priority}
            onChange={(e) =>
              dispatch(
                updateTask({
                  taskId: _id,
                  updates: { priority: e.target.value },
                })
              )
            }
            className="bg-[#2A2A3B] text-[#F8FAFC] border border-gray-600 rounded px-2 py-1 text-sm"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <input
            type="date"
            value={dueDate ? new Date(dueDate).toISOString().substr(0, 10) : ''}
            onChange={(e) =>
              dispatch(
                updateTask({
                  taskId: _id,
                  updates: { dueDate: e.target.value },
                })
              )
            }
            className="bg-[#2A2A3B] text-[#F8FAFC] border border-gray-600 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <select
          value={status}
          onChange={handleStatusChange}
          className="bg-[#2A2A3B] text-[#F8FAFC] border border-gray-600 rounded px-2 py-1 text-sm"
        >
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700 text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </li>
  );
};

export default TaskItem;
