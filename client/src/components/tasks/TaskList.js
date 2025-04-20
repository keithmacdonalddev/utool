import React from 'react';
import TaskItem from './TaskItem';

const TaskList = ({
  tasks,
  showCheckbox = false,
  selectedTasks = [],
  onSelectTask = () => {},
  onTaskClick = () => {},
  activeTaskId = null,
  simplified = false,
}) => {
  return (
    <ul className="space-y-2 px-2">
      {' '}
      {/* Added px-2 for horizontal padding */}
      {tasks.map((task) => (
        <TaskItem
          key={task._id}
          task={task}
          showCheckbox={showCheckbox}
          selected={selectedTasks.includes(task._id)}
          onSelect={onSelectTask}
          onClick={() => onTaskClick(task._id)}
          isActive={activeTaskId === task._id}
          simplified={simplified}
        />
      ))}
    </ul>
  );
};

export default TaskList;
