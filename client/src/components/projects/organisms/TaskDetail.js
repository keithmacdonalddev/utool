import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { cn } from '../../../utils/cn';
import { TaskBadge } from '../atoms/TaskBadge';
import { UserAvatar } from '../atoms/UserAvatar';
import {
  X,
  Calendar,
  Clock,
  Users,
  MessageSquare,
  Paperclip,
  Plus,
  Edit3,
  Save,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  CheckSquare,
  Square,
  Link,
  AlertTriangle,
} from 'lucide-react';
import {
  updateTask,
  createSubtask,
  updateTaskStatus,
  startTimeTracking,
  stopTimeTracking,
  addTaskDependency,
  removeTaskDependency,
} from '../../../features/tasks/taskSlice';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * TaskDetail - Comprehensive modal for viewing and editing task details
 */
export const TaskDetail = ({ task, isOpen, onClose, className }) => {
  const dispatch = useDispatch();

  // Local state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState('details');
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isTimeTracking, setIsTimeTracking] = useState(false);

  // Initialize edit data when task changes
  useEffect(() => {
    if (task) {
      setEditData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assignee: task.assignee?._id || '',
        dueDate: task.dueDate
          ? format(new Date(task.dueDate), 'yyyy-MM-dd')
          : '',
        estimatedHours: task.estimatedHours || '',
        tags: task.tags?.join(', ') || '',
      });
      setIsTimeTracking(task.timeTracking?.isActive || false);
    }
  }, [task]);

  /**
   * Handle saving task changes
   */
  const handleSave = useCallback(async () => {
    try {
      const updateData = {
        ...editData,
        tags: editData.tags
          ? editData.tags.split(',').map((tag) => tag.trim())
          : [],
        dueDate: editData.dueDate ? new Date(editData.dueDate) : null,
        estimatedHours: editData.estimatedHours
          ? parseFloat(editData.estimatedHours)
          : null,
      };

      await dispatch(
        updateTask({
          taskId: task._id,
          updates: updateData,
        })
      );

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }, [dispatch, task._id, editData]);

  /**
   * Handle canceling edit
   */
  const handleCancel = useCallback(() => {
    setEditData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      assignee: task.assignee?._id || '',
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      estimatedHours: task.estimatedHours || '',
      tags: task.tags?.join(', ') || '',
    });
    setIsEditing(false);
  }, [task]);

  /**
   * Handle status change
   */
  const handleStatusChange = useCallback(
    (newStatus) => {
      dispatch(
        updateTaskStatus({
          taskId: task._id,
          status: newStatus,
        })
      );
    },
    [dispatch, task._id]
  );

  /**
   * Handle time tracking toggle
   */
  const handleTimeToggle = useCallback(() => {
    if (isTimeTracking) {
      dispatch(stopTimeTracking({ taskId: task._id }));
    } else {
      dispatch(startTimeTracking({ taskId: task._id }));
    }
    setIsTimeTracking(!isTimeTracking);
  }, [dispatch, task._id, isTimeTracking]);

  /**
   * Handle subtask status toggle
   */
  const handleSubtaskToggle = useCallback(
    (subtaskId, completed) => {
      dispatch(
        updateTask({
          taskId: subtaskId,
          updates: { status: completed ? 'done' : 'todo' },
        })
      );
    },
    [dispatch]
  );

  /**
   * Calculate progress
   */
  const getProgress = useCallback(() => {
    if (!task.subtasks || task.subtasks.length === 0) return null;

    const completed = task.subtasks.filter((st) => st.status === 'done').length;
    const total = task.subtasks.length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  }, [task.subtasks]);

  if (!isOpen || !task) return null;

  const progress = getProgress();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={cn(
          'bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <TaskBadge variant="status" value={task.status} />
            <TaskBadge variant="priority" value={task.priority} />
            {task.type && <TaskBadge variant="type" value={task.type} />}
          </div>

          <div className="flex items-center gap-2">
            {/* Time Tracking Button */}
            <button
              onClick={handleTimeToggle}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isTimeTracking
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {isTimeTracking ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Stop Timer
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Start Timer
                </>
              )}
            </button>

            {/* Edit/Save Button */}
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Edit
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-100px)]">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Title */}
              <div className="mb-6">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                    className="text-2xl font-bold text-gray-900 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Task title"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">
                    {task.title}
                  </h1>
                )}
              </div>

              {/* Progress Bar */}
              {progress && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Progress
                    </span>
                    <span className="text-sm text-gray-600">
                      {progress.completed}/{progress.total} subtasks completed
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Description
                </h3>
                {isEditing ? (
                  <textarea
                    value={editData.description}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Task description"
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed">
                    {task.description || 'No description provided'}
                  </p>
                )}
              </div>

              {/* Subtasks */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowSubtasks(!showSubtasks)}
                    className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3 hover:text-blue-600"
                  >
                    {showSubtasks ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    Subtasks ({task.subtasks.length})
                  </button>

                  {showSubtasks && (
                    <div className="space-y-2">
                      {task.subtasks.map((subtask) => (
                        <div
                          key={subtask._id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <button
                            onClick={() =>
                              handleSubtaskToggle(
                                subtask._id,
                                subtask.status !== 'done'
                              )
                            }
                            className="flex-shrink-0"
                          >
                            {subtask.status === 'done' ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                          <div className="flex-1">
                            <p
                              className={cn(
                                'font-medium',
                                subtask.status === 'done'
                                  ? 'text-gray-500 line-through'
                                  : 'text-gray-900'
                              )}
                            >
                              {subtask.title}
                            </p>
                            {subtask.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {subtask.description}
                              </p>
                            )}
                          </div>
                          {subtask.assignee && (
                            <UserAvatar user={subtask.assignee} size="sm" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dependencies */}
              {task.dependencies && task.dependencies.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowDependencies(!showDependencies)}
                    className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3 hover:text-blue-600"
                  >
                    {showDependencies ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    Dependencies ({task.dependencies.length})
                  </button>

                  {showDependencies && (
                    <div className="space-y-2">
                      {task.dependencies.map((dep) => (
                        <div
                          key={dep._id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <Link className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {dep.title}
                            </p>
                            <TaskBadge
                              variant="status"
                              value={dep.status}
                              size="sm"
                            />
                          </div>
                          {dep.status !== 'done' && (
                            <AlertTriangle
                              className="h-4 w-4 text-yellow-500"
                              title="Dependency not completed"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Comments Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Comments ({task.comments?.length || 0})
                </h3>

                {/* Add Comment */}
                <div className="mb-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Add a comment..."
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => {
                        // Handle comment submission
                        setNewComment('');
                      }}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Add Comment
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {task.comments?.map((comment) => (
                    <div key={comment._id} className="flex gap-3">
                      <UserAvatar user={comment.author} size="sm" />
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {comment.author.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(
                                new Date(comment.createdAt),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                          <p className="text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Task Details
              </h3>

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  {isEditing ? (
                    <select
                      value={editData.status}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="in-review">In Review</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                    </select>
                  ) : (
                    <TaskBadge variant="status" value={task.status} />
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  {isEditing ? (
                    <select
                      value={editData.priority}
                      onChange={(e) =>
                        setEditData({ ...editData, priority: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  ) : (
                    <TaskBadge variant="priority" value={task.priority} />
                  )}
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignee
                  </label>
                  {task.assignee ? (
                    <UserAvatar user={task.assignee} showName size="sm" />
                  ) : (
                    <span className="text-sm text-gray-500">Unassigned</span>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.dueDate}
                      onChange={(e) =>
                        setEditData({ ...editData, dueDate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : task.dueDate ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No due date</span>
                  )}
                </div>

                {/* Time Tracking */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Tracking
                  </label>
                  <div className="space-y-2">
                    {task.timeTracking?.totalTime > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {Math.round(task.timeTracking.totalTime / 60)}h logged
                        </span>
                      </div>
                    )}
                    {isTimeTracking && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">
                          Timer active
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estimated Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Hours
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.estimatedHours}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          estimatedHours: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                      min="0"
                      step="0.5"
                    />
                  ) : task.estimatedHours ? (
                    <span className="text-sm text-gray-700">
                      {task.estimatedHours}h
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">Not estimated</span>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.tags}
                      onChange={(e) =>
                        setEditData({ ...editData, tags: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="tag1, tag2, tag3"
                    />
                  ) : task.tags && task.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {task.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No tags</span>
                  )}
                </div>

                {/* Created/Updated */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>
                      Created{' '}
                      {formatDistanceToNow(new Date(task.createdAt), {
                        addSuffix: true,
                      })}
                    </div>
                    <div>
                      Updated{' '}
                      {formatDistanceToNow(new Date(task.updatedAt), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
