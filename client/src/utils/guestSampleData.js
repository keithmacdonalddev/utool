/**
 * Utility for generating sample data for guest users
 * This provides realistic sample data for all features so guest users can explore functionality
 *
 * NOTE ON DATA RELATIONSHIPS:
 * - Tasks reference projects by projectId (e.g., 'guest-project-1')
 * - Comments reference tasks or projects by itemId
 * - These relationships are maintained with consistent IDs across the sample data
 *
 * LOADING ORDER:
 * When loading all sample data, the order matters due to dependencies:
 * 1. Projects should be loaded first (no dependencies)
 * 2. Tasks can be loaded after projects (reference projects)
 * 3. Comments should be loaded after tasks and projects (reference both)
 * 4. Notes and Bookmarks can be loaded any time (no dependencies)
 */

import { createGuestItem } from './guestDataFormatters';

/**
 * Generate sample task data for guest users
 * @returns {Array} Array of task items ready to be added to the sandbox
 */
export const generateSampleTasks = () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return [
    createGuestItem(
      'tasks',
      {
        title: 'Create project plan',
        description:
          'Draft the initial project plan with timeline and resources needed',
        status: 'To Do',
        priority: 'High',
        dueDate: tomorrow.toISOString(),
        projectId: 'guest-project-1', // Link to sample project
        tags: ['Planning', 'Important'],
      },
      'guest-task-1'
    ),
    createGuestItem(
      'tasks',
      {
        title: 'Review documentation',
        description: 'Go through existing documentation and identify gaps',
        status: 'In Progress',
        priority: 'Medium',
        dueDate: nextWeek.toISOString(),
        projectId: 'guest-project-1',
        tags: ['Documentation'],
      },
      'guest-task-2'
    ),
    createGuestItem(
      'tasks',
      {
        title: 'Update team on progress',
        description: 'Send weekly update email to stakeholders',
        status: 'Completed',
        priority: 'Medium',
        dueDate: yesterday.toISOString(),
        completedAt: yesterday.toISOString(),
        projectId: 'guest-project-2',
        tags: ['Communication'],
      },
      'guest-task-3'
    ),
    createGuestItem(
      'tasks',
      {
        title: 'Research new tools',
        description: 'Evaluate potential tools to improve workflow efficiency',
        status: 'To Do',
        priority: 'Low',
        dueDate: nextWeek.toISOString(),
        projectId: 'guest-project-2',
        tags: ['Research'],
      },
      'guest-task-4'
    ),
    createGuestItem(
      'tasks',
      {
        title: 'Prepare presentation',
        description: 'Create slides for the upcoming client meeting',
        status: 'To Do',
        priority: 'High',
        dueDate: tomorrow.toISOString(),
        projectId: 'guest-project-3',
        tags: ['Presentation', 'Client'],
      },
      'guest-task-5'
    ),
  ];
};

/**
 * Generate sample project data for guest users
 * @returns {Array} Array of project items ready to be added to the sandbox
 */
export const generateSampleProjects = () => {
  const now = new Date();
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return [
    createGuestItem(
      'projects',
      {
        name: 'Website Redesign',
        description:
          'Complete overhaul of the company website with new branding',
        status: 'In Progress',
        startDate: lastMonth.toISOString(),
        endDate: nextMonth.toISOString(),
        progress: 35,
        priority: 'High',
        tags: ['Design', 'Marketing'],
      },
      'guest-project-1'
    ),
    createGuestItem(
      'projects',
      {
        name: 'Q3 Financial Review',
        description: 'Quarterly financial analysis and reporting',
        status: 'To Do',
        startDate: now.toISOString(),
        endDate: nextMonth.toISOString(),
        progress: 10,
        priority: 'Medium',
        tags: ['Finance', 'Reporting'],
      },
      'guest-project-2'
    ),
    createGuestItem(
      'projects',
      {
        name: 'Client Onboarding Improvements',
        description:
          'Streamline the client onboarding process to reduce time-to-value',
        status: 'Not Started',
        startDate: nextMonth.toISOString(),
        endDate: null,
        progress: 0,
        priority: 'Medium',
        tags: ['Process', 'Client Management'],
      },
      'guest-project-3'
    ),
  ];
};

/**
 * Generate sample note data for guest users
 * @returns {Array} Array of note items ready to be added to the sandbox
 */
export const generateSampleNotes = () => {
  return [
    createGuestItem(
      'notes',
      {
        title: 'Meeting Notes - Team Sync',
        content:
          '# Team Sync Meeting\n\n**Date**: Yesterday\n\n## Attendees\n- Alice\n- Bob\n- Carol\n\n## Action Items\n- [ ] Follow up on project timeline\n- [ ] Schedule next design review\n- [x] Share documentation with new team members',
        category: 'Meetings',
        pinned: true,
        tags: ['Team', 'Weekly'],
      },
      'guest-note-1'
    ),
    createGuestItem(
      'notes',
      {
        title: 'Project Ideas',
        content:
          'Ideas for future projects:\n\n1. Mobile app redesign with focus on user experience\n2. Analytics dashboard for tracking key metrics\n3. Automated testing implementation for critical systems',
        category: 'Ideas',
        pinned: false,
        tags: ['Brainstorming', 'Innovation'],
      },
      'guest-note-2'
    ),
    createGuestItem(
      'notes',
      {
        title: 'Resources and Links',
        content:
          'Useful resources:\n\n- [Design system documentation](https://example.com/design)\n- [API documentation](https://example.com/api)\n- [Team wiki](https://example.com/wiki)',
        category: 'Resources',
        pinned: false,
        tags: ['Reference', 'Links'],
      },
      'guest-note-3'
    ),
  ];
};

/**
 * Generate sample bookmark data for guest users
 * @returns {Array} Array of bookmark items ready to be added to the sandbox
 */
export const generateSampleBookmarks = () => {
  return [
    createGuestItem(
      'bookmarks',
      {
        title: 'GitHub',
        url: 'https://github.com',
        description:
          'Code hosting platform for version control and collaboration',
        favicon: 'https://github.githubassets.com/favicons/favicon.svg',
        tags: ['Development', 'Code'],
        folderId: 'development',
      },
      'guest-bookmark-1'
    ),
    createGuestItem(
      'bookmarks',
      {
        title: 'Figma',
        url: 'https://figma.com',
        description: 'Collaborative interface design tool',
        favicon: 'https://static.figma.com/app/icon/1/favicon.svg',
        tags: ['Design', 'Collaboration'],
        folderId: 'design',
      },
      'guest-bookmark-2'
    ),
    createGuestItem(
      'bookmarks',
      {
        title: 'MDN Web Docs',
        url: 'https://developer.mozilla.org',
        description: 'Resources for developers, by developers',
        favicon: 'https://developer.mozilla.org/favicon-48x48.png',
        tags: ['Reference', 'Documentation'],
        folderId: 'development',
      },
      'guest-bookmark-3'
    ),
    createGuestItem(
      'bookmarks',
      {
        title: 'Trello',
        url: 'https://trello.com',
        description: 'Visual tool for organizing work and tasks',
        favicon: 'https://trello.com/favicon.ico',
        tags: ['Productivity', 'Organization'],
        folderId: 'productivity',
      },
      'guest-bookmark-4'
    ),
  ];
};

/**
 * Generate sample comment data for guest users
 * @returns {Array} Array of comment items ready to be added to the sandbox
 */
export const generateSampleComments = () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  return [
    createGuestItem(
      'comments',
      {
        content:
          'I think we should prioritize the user onboarding flow before launching this feature.',
        itemId: 'guest-task-1', // Reference to a task
        itemType: 'task',
        timestamp: twoDaysAgo.toISOString(),
        author: {
          name: 'Alice Johnson',
          id: 'guest-friend-1',
        },
      },
      'guest-comment-1'
    ),
    createGuestItem(
      'comments',
      {
        content:
          "Great progress on this! Let's review the design in our next meeting.",
        itemId: 'guest-task-2',
        itemType: 'task',
        timestamp: yesterday.toISOString(),
        author: {
          name: 'Guest User',
          id: 'guest_user',
        },
      },
      'guest-comment-2'
    ),
    createGuestItem(
      'comments',
      {
        content:
          'The timeline seems tight. Should we consider adding more resources?',
        itemId: 'guest-project-1',
        itemType: 'project',
        timestamp: now.toISOString(),
        author: {
          name: 'Bob Smith',
          id: 'guest-friend-2',
        },
      },
      'guest-comment-3'
    ),
  ];
};

/**
 * Generate sample friend data for guest users
 * @returns {Array} Array of friend items ready to be added to the sandbox
 */
export const generateSampleFriends = () => {
  return [
    createGuestItem(
      'friends',
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        isFriend: true,
      },
      'guest-friend-1'
    ),
    createGuestItem(
      'friends',
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        isFriend: true,
      },
      'guest-friend-2'
    ),
    createGuestItem(
      'friends',
      {
        name: 'Carol Davis',
        email: 'carol@example.com',
        avatar: 'https://randomuser.me/api/portraits/women/67.jpg',
        isFriend: true,
      },
      'guest-friend-3'
    ),
  ];
};

/**
 * Generate all sample data for guest user
 * This follows a specific loading order to ensure data relationships are maintained
 *
 * @param {Object} options - Options for sample data generation
 * @param {boolean} options.smallDataset - Whether to generate a smaller dataset
 * @returns {Object} Object containing all sample data by entity type
 */
export const generateAllSampleData = (options = {}) => {
  try {
    const { smallDataset = false } = options;

    // First generate entities with no dependencies
    const projects = generateSampleProjects();
    const notes = generateSampleNotes();
    const bookmarks = generateSampleBookmarks();
    const friends = generateSampleFriends();

    // Then generate entities that depend on projects
    const tasks = generateSampleTasks();

    // Finally generate entities that depend on both projects and tasks
    const comments = generateSampleComments();

    return {
      projects,
      tasks,
      notes,
      bookmarks,
      comments,
      friends,
    };
  } catch (error) {
    console.error('Error generating sample data:', error);
    // Return fallback minimal data if generation fails
    return {
      projects: [],
      tasks: [],
      notes: [],
      bookmarks: [],
      comments: [],
      friends: [],
    };
  }
};

export default {
  generateSampleTasks,
  generateSampleProjects,
  generateSampleNotes,
  generateSampleBookmarks,
  generateSampleComments,
  generateAllSampleData,
};
