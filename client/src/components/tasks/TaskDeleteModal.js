import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { deleteTask } from '../../features/tasks/taskSlice';
import { AlertCircle, Trash } from 'lucide-react';

/**
 * A modal component for confirming task deletion with multiple steps
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {string} props.taskId - ID of the task to delete
 * @param {string} props.taskTitle - Title of the task to delete
 * @param {Function} props.onDeleteSuccess - Function to call after successful deletion
 */
const TaskDeleteModal = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onDeleteSuccess,
}) => {
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Close the modal and reset state
  const handleClose = () => {
    setStep(1);
    setError(null);
    onClose();
  };

  // Handle the task deletion process
  const handleDelete = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await dispatch(deleteTask(taskId)).unwrap();
      handleClose();
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete task');
      setIsDeleting(false);
    }
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-lg border border-dark-700 shadow-lg">
        {/* Modal header */}
        <div className="border-b border-dark-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center">
              <Trash size={20} className="text-red-500 mr-2" />
              Delete Task
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-900/50 rounded-md text-red-400 flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="font-bold text-red-400 mb-1">Warning</div>
                <p>You are about to delete the following task:</p>
                <p className="font-bold text-lg my-3">"{taskTitle}"</p>
                <p className="text-yellow-400">
                  This action cannot be easily undone.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="font-bold text-red-400 mb-1">
                  Confirmation Required
                </div>
                <p>Are you sure you want to delete this task?</p>
                <p className="font-bold text-lg my-3">"{taskTitle}"</p>
                <p className="text-yellow-400">
                  All task data will be permanently lost.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="font-bold text-red-400 mb-1">Final Warning</div>
                <p>This is your last chance to cancel.</p>
                <p className="font-bold text-lg my-3">Delete "{taskTitle}"?</p>
                <p className="text-yellow-400">
                  Click "Delete Task" to confirm deletion.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal footer with action buttons */}
        <div className="border-t border-dark-700 p-4 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-dark-600 text-white rounded hover:bg-dark-500"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`px-4 py-2 rounded flex items-center ${
              step === 3
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-dark-600 hover:bg-dark-500'
            } text-white`}
          >
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">◌</span>
                Deleting...
              </>
            ) : (
              <>{step === 3 ? 'Delete Task' : 'Continue'}</>
            )}
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-4 pb-4 flex justify-center">
          <div className="flex space-x-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full ${
                  s === step ? 'bg-primary' : 'bg-dark-600'
                }`}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDeleteModal;
