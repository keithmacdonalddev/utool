// taskUtils.js - Utility functions for filtering and processing task data
//
// This file centralizes logic related to filtering tasks by date, tags,
// calculating task counts, and performing date comparisons for tasks.
// Moving this logic out of the main ProjectDetailsPage component improves
// readability and makes these functions potentially reusable.

/**
 * Helper function to parse a date string into Year, Month (0-indexed), and Day components.
 * Attempts to handle 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss.sssZ' formats robustly.
 * Returns an object with year, month, day, and a isValid flag.
 * @param {string} dateString - The date string to parse.
 * @returns {{year: number|null, month: number|null, day: number|null, isValid: boolean}}
 */
const parseDateComponents = (dateString) => {
  if (!dateString) {
    return { year: null, month: null, day: null, isValid: false };
  }

  try {
    // Extract the date part 'YYYY-MM-DD'
    const datePart = dateString.substring(0, 10);
    const parts = datePart.split('-');

    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Adjust month to be 0-indexed
      const day = parseInt(parts[2], 10);

      // Basic validation of parsed numbers
      if (
        !isNaN(year) &&
        !isNaN(month) &&
        !isNaN(day) &&
        month >= 0 &&
        month <= 11 &&
        day >= 1 &&
        day <= 31
      ) {
        return { year, month, day, isValid: true };
      } else {
        console.warn(
          `Invalid date components parsed from string: ${dateString} -> Y:${year}, M:${
            month + 1
          }, D:${day}`
        );
        return { year: null, month: null, day: null, isValid: false };
      }
    } else {
      console.warn(
        `Unexpected date string format (expected YYYY-MM-DD at start): ${dateString}`
      );
      return { year: null, month: null, day: null, isValid: false };
    }
  } catch (e) {
    console.error(`Error parsing date string: ${dateString}`, e);
    return { year: null, month: null, day: null, isValid: false };
  }
};

/**
 * Checks if a task is due today based on its dueDate string.
 * Accounts for local time.
 * @param {Object} task - The task object.
 * @returns {boolean} - True if the task is due today and not completed.
 */
export const isTaskDueToday = (task) => {
  if (!task || task.status === 'Completed' || !task.dueDate) {
    return false;
  }

  const today = new Date();
  const todayComponents = {
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  };

  const dueComponents = parseDateComponents(task.dueDate);

  return (
    dueComponents.isValid &&
    dueComponents.year === todayComponents.year &&
    dueComponents.month === todayComponents.month &&
    dueComponents.day === todayComponents.day
  );
};

/**
 * Checks if a task is overdue based on its dueDate string.
 * Uses UTC comparison to avoid local timezone issues with dates crossing midnight.
 * @param {Object} task - The task object.
 * @returns {boolean} - True if the task is overdue and not completed.
 */
export const isTaskOverdue = (task) => {
  if (!task || task.status === 'Completed' || !task.dueDate) {
    return false;
  }

  const today = new Date();
  // Get UTC date for today at midnight
  const utcToday = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const dueComponents = parseDateComponents(task.dueDate);

  if (!dueComponents.isValid) {
    return false; // Cannot be overdue if due date is invalid
  }

  // Get UTC date for task due date at midnight
  const utcDueDate = Date.UTC(
    dueComponents.year,
    dueComponents.month,
    dueComponents.day
  );

  // Compare UTC timestamps
  return utcDueDate < utcToday;
};

/**
 * Filters tasks that are critical (overdue or due today) and not completed.
 * Sorts critical tasks by due date (oldest first).
 * @param {Array<Object>} tasksList - List of tasks to filter.
 * @returns {Array<Object>} - Filtered list of critical tasks.
 */
export const getCriticalTasks = (tasksList) => {
  if (!tasksList || tasksList.length === 0) return [];

  return tasksList
    .filter((task) => isTaskOverdue(task) || isTaskDueToday(task))
    .sort((a, b) => {
      // Sort by due date (oldest first)
      const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31'); // Put tasks without due dates at the end
      const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
      return dateA.getTime() - dateB.getTime();
    });
};

/**
 * Applies date-based filtering (overdue, today, or all) to a list of tasks.
 * Note: This filter is typically applied before tag filtering.
 * @param {Array<Object>} tasksList - List of tasks to filter.
 * @param {string} filter - The filter type ('all', 'overdue', 'today').
 * @returns {Array<Object>} - Filtered list of tasks.
 */
export const getFilteredTasks = (tasksList, filter) => {
  if (!tasksList || tasksList.length === 0) return [];

  switch (filter) {
    case 'overdue':
      return tasksList.filter((task) => isTaskOverdue(task));
    case 'today':
      return tasksList.filter((task) => isTaskDueToday(task));
    case 'all':
    default:
      return tasksList;
  }
};

/**
 * Filters tasks based on the selected tags (AND logic).
 * Tasks must have *all* selected tags to be included.
 * @param {Array<Object>} tasksList - List of tasks to filter.
 * @param {Array<string>} selectedTags - Array of selected tag strings.
 * @returns {Array<Object>} - Filtered list of tasks.
 */
export const getTagFilteredTasks = (tasksList, selectedTags) => {
  if (!tasksList || tasksList.length === 0) return [];
  if (!selectedTags || selectedTags.length === 0) return tasksList;

  return tasksList.filter((task) => {
    // If task has no tags or tags is not an array, filter it out if tags are selected
    if (!task.tags || !Array.isArray(task.tags)) return false;

    // Check if task has all selected tags (AND logic)
    return selectedTags.every((tag) => task.tags.includes(tag));
  });
};

/**
 * Calculates the counts of overdue, due today, and total tasks.
 * @param {Array<Object>} tasksList - List of tasks.
 * @returns {{overdue: number, today: number, total: number}} - Task counts.
 */
export const getTaskCounts = (tasksList) => {
  const overdueTasks = getFilteredTasks(tasksList, 'overdue');
  const todayTasks = getFilteredTasks(tasksList, 'today');

  return {
    overdue: overdueTasks.length,
    today: todayTasks.length,
    total: tasksList ? tasksList.length : 0,
  };
};
