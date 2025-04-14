import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom'; // For linking to individual tasks later
import { getTasksForProject, resetTaskStatus } from '../../features/tasks/taskSlice';

const TaskList = ({ projectId }) => {
  const dispatch = useDispatch();
  // Select the tasks state, loading status, and error message
  const { tasks, isLoading, isError, message } = useSelector((state) => state.tasks);

  useEffect(() => {
    if (projectId) {
      // Fetch tasks for the specific project when projectId is available/changes
      dispatch(resetTaskStatus()); // Reset status before fetching
      dispatch(getTasksForProject(projectId));
    }

    // Optional: Reset status on unmount
    // return () => {
    //   dispatch(resetTaskStatus());
    // };
  }, [dispatch, projectId]); // Dependency array includes projectId

  // Helper function to determine badge color based on status
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Not Started':
      default: return 'bg-gray-100 text-gray-800';
    }
  };

   // Helper function to determine badge color based on priority
   const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-orange-100 text-orange-800';
      case 'Low':
      default: return 'bg-blue-100 text-blue-800';
    }
  };


  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-3 text-[#F8FAFC]">Tasks</h2>
      {isLoading && <p className="text-[#C7C9D1]">Loading tasks...</p>}
      {isError && <p className="text-red-400 text-sm">{message || 'Error loading tasks.'}</p>}
      {!isLoading && !isError && (
        <div className="space-y-3">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task._id} className="p-3 border border-dark-700 rounded-xl shadow-2xl bg-[#23242B] flex justify-between items-start">
                <div>
                  {/* TODO: Link to task details page later */}
                  <p className="font-bold text-[#F8FAFC]">{task.title}</p>
                  {task.description && <p className="text-sm text-[#F8FAFC] mt-1">{task.description}</p>}
                   <p className="text-xs text-[#C7C9D1] mt-1">
                     Assigned to: {task.assignee?.name || task.assignee?.email || 'Unknown'}
                     {task.dueDate && ` | Due: ${new Date(task.dueDate).toLocaleDateString()}`}
                   </p>
                </div>
                <div className="flex flex-col items-end space-y-1 ml-2 flex-shrink-0">
                   <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-accent-purple text-[#F8FAFC]">
                       {task.status}
                   </span>
                   <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-accent-blue text-[#F8FAFC]">
                       {task.priority} Priority
                   </span>
                   {/* TODO: Add Edit/Delete/Complete buttons */}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#C7C9D1]">No tasks found for this project.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskList;
