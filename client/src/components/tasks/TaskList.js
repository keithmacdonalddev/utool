import React from 'react';
import TaskItem from './TaskItem';

const TaskList = ({
  tasks,
  showCheckbox = false,
  selectedTasks = [],
  onSelectTask = () => {},
}) => {
  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task._id}
          task={task}
          showCheckbox={showCheckbox}
          selected={selectedTasks.includes(task._id)}
          onSelect={onSelectTask}
        />
      ))}
    </ul>
  );
};

export default TaskList;
