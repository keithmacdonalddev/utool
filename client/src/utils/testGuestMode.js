/**
 * Utility functions to test guest mode functionality
 * These functions can be called from the browser console to verify guest-related features
 */

import store from '../app/store';
import { addItem, setItems } from '../features/guestSandbox/guestSandboxSlice';
import { createGuestItem } from './guestDataFormatters';
import {
  generateSampleFriends,
  generateSampleTasks,
  generateSampleProjects,
  generateSampleNotes,
  generateSampleBookmarks,
} from './guestSampleData';

/**
 * Initialize sample friend data for guest users
 */
export const initializeGuestFriends = () => {
  const sampleFriends = generateSampleFriends();

  store.dispatch(
    setItems({
      entityType: 'friends',
      items: sampleFriends,
    })
  );

  console.log('Initialized sample friends for guest user:', sampleFriends);
  return sampleFriends;
};

/**
 * Add a sample friend for guest users
 */
export const addGuestFriend = (name = 'New Friend') => {
  // Create friend data
  const newFriendData = {
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    avatar: `https://randomuser.me/api/portraits/${
      Math.random() > 0.5 ? 'men' : 'women'
    }/${Math.floor(Math.random() * 100)}.jpg`,
    isFriend: true,
  };

  // Create a complete guest item with all properties using the utility function
  const newFriend = createGuestItem('friends', newFriendData);

  store.dispatch(
    addItem({
      entityType: 'friends',
      itemData: newFriend,
    })
  );

  console.log('Added new friend for guest user:', newFriend);
  return newFriend;
};

/**
 * Initialize sample task data for guest users
 */
export const initializeGuestTasks = () => {
  const sampleTasks = generateSampleTasks();

  store.dispatch(
    setItems({
      entityType: 'tasks',
      items: sampleTasks,
    })
  );

  console.log('Initialized sample tasks for guest user:', sampleTasks);
  return sampleTasks;
};

/**
 * Initialize sample project data for guest users
 */
export const initializeGuestProjects = () => {
  const sampleProjects = generateSampleProjects();

  store.dispatch(
    setItems({
      entityType: 'projects',
      items: sampleProjects,
    })
  );

  console.log('Initialized sample projects for guest user:', sampleProjects);
  return sampleProjects;
};

/**
 * Initialize sample note data for guest users
 */
export const initializeGuestNotes = () => {
  const sampleNotes = generateSampleNotes();

  store.dispatch(
    setItems({
      entityType: 'notes',
      items: sampleNotes,
    })
  );

  console.log('Initialized sample notes for guest user:', sampleNotes);
  return sampleNotes;
};

/**
 * Initialize sample bookmark data for guest users
 */
export const initializeGuestBookmarks = () => {
  const sampleBookmarks = generateSampleBookmarks();

  store.dispatch(
    setItems({
      entityType: 'bookmarks',
      items: sampleBookmarks,
    })
  );

  console.log('Initialized sample bookmarks for guest user:', sampleBookmarks);
  return sampleBookmarks;
};

/**
 * Print the current guest sandbox state to the console
 */
export const printGuestSandboxState = () => {
  const state = store.getState().guestSandbox;
  console.log('Current Guest Sandbox State:', state);
  return state;
};

/**
 * Initialize all sample data for guest users
 * This is useful for quickly setting up a complete guest testing environment
 */
export const initializeAllGuestData = () => {
  const sampleData = {
    friends: initializeGuestFriends(),
    tasks: initializeGuestTasks(),
    projects: initializeGuestProjects(),
    notes: initializeGuestNotes(),
    bookmarks: initializeGuestBookmarks(),
  };

  console.log('Initialized all sample data for guest user:', sampleData);
  return sampleData;
};

// Make functions available in window object for browser console testing
if (typeof window !== 'undefined') {
  window.guestUtils = {
    initializeGuestFriends,
    addGuestFriend,
    initializeGuestTasks,
    initializeGuestProjects,
    initializeGuestNotes,
    initializeGuestBookmarks,
    initializeAllGuestData,
    printGuestSandboxState,
  };
}

const guestUtilsExport = {
  initializeGuestFriends,
  addGuestFriend,
  initializeGuestTasks,
  initializeGuestProjects,
  initializeGuestNotes,
  initializeGuestBookmarks,
  initializeAllGuestData,
  printGuestSandboxState,
};

export default guestUtilsExport;
