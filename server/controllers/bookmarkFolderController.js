// @desc    Bookmark folder controller for managing folder structure
import BookmarkFolder from '../models/BookmarkFolder.js';
import Bookmark from '../models/Bookmark.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Get all bookmark folders for a user
// @route   GET /api/v1/bookmark-folders
// @access  Private
export const getFolders = asyncHandler(async (req, res, next) => {
  // Find folders for the current user
  const folders = await BookmarkFolder.find({ user: req.user.id });

  res.status(200).json({
    success: true,
    count: folders.length,
    data: folders,
  });
});

// @desc    Get single bookmark folder
// @route   GET /api/v1/bookmark-folders/:id
// @access  Private
export const getFolder = asyncHandler(async (req, res, next) => {
  const folder = await BookmarkFolder.findById(req.params.id);

  if (!folder) {
    return next(
      new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure user owns the folder
  if (folder.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this folder`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: folder,
  });
});

// @desc    Create new bookmark folder
// @route   POST /api/v1/bookmark-folders
// @access  Private
export const createFolder = asyncHandler(async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to create bookmark folders. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  // Add user ID to folder data
  req.body.user = req.user.id;

  // Verify parent folder exists and belongs to user if parentId is provided
  if (req.body.parentId) {
    const parentFolder = await BookmarkFolder.findById(req.body.parentId);
    if (!parentFolder) {
      return next(new ErrorResponse(`Parent folder not found`, 404));
    }
    if (parentFolder.user.toString() !== req.user.id) {
      return next(
        new ErrorResponse(`User not authorized to use this parent folder`, 401)
      );
    }
  }

  const folder = await BookmarkFolder.create(req.body);

  res.status(201).json({
    success: true,
    data: folder,
  });
});

// @desc    Update bookmark folder
// @route   PUT /api/v1/bookmark-folders/:id
// @access  Private
export const updateFolder = asyncHandler(async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to update bookmark folders. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  let folder = await BookmarkFolder.findById(req.params.id);

  if (!folder) {
    return next(
      new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure user owns the folder
  if (folder.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this folder`, 401)
    );
  }

  // Prevent circular references when updating parentId
  if (req.body.parentId) {
    // Don't allow a folder to be its own parent
    if (req.body.parentId === req.params.id) {
      return next(new ErrorResponse(`A folder cannot be its own parent`, 400));
    }

    // Don't allow a folder to have one of its descendants as its parent
    const isDescendant = await isDescendantFolder(
      req.body.parentId,
      req.params.id
    );
    if (isDescendant) {
      return next(
        new ErrorResponse(`Cannot move a folder to one of its descendants`, 400)
      );
    }
  }

  folder = await BookmarkFolder.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Return the updated document
    runValidators: true, // Run model validators
  });

  res.status(200).json({
    success: true,
    data: folder,
  });
});

// @desc    Delete bookmark folder
// @route   DELETE /api/v1/bookmark-folders/:id
// @access  Private
export const deleteFolder = asyncHandler(async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to delete bookmark folders. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  const folder = await BookmarkFolder.findById(req.params.id);

  if (!folder) {
    return next(
      new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure user owns the folder
  if (folder.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this folder`, 401)
    );
  }

  // Find all child folders
  const childFolders = await BookmarkFolder.find({ parentId: req.params.id });

  // Check if there are bookmarks in this folder
  const bookmarksInFolder = await Bookmark.countDocuments({
    folderId: req.params.id,
    user: req.user.id,
  });

  // If there are child folders or bookmarks, require confirmation
  if (
    (childFolders.length > 0 || bookmarksInFolder > 0) &&
    !req.query.confirm
  ) {
    return res.status(400).json({
      success: false,
      data: {
        childFolders: childFolders.length,
        bookmarks: bookmarksInFolder,
        message:
          'This folder contains items. Add ?confirm=true to delete it and all its contents.',
      },
    });
  }

  // Delete the folder and recursively delete all children and their bookmarks
  await deleteRecursive(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get bookmarks for a specific folder
// @route   GET /api/v1/bookmark-folders/:id/bookmarks
// @access  Private
export const getFolderBookmarks = asyncHandler(async (req, res, next) => {
  const folder = await BookmarkFolder.findById(req.params.id);

  if (!folder) {
    return next(
      new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure user owns the folder
  if (folder.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this folder`, 401)
    );
  }

  // Find bookmarks in this folder
  const bookmarks = await Bookmark.find({
    folderId: req.params.id,
    user: req.user.id,
  });

  res.status(200).json({
    success: true,
    count: bookmarks.length,
    data: bookmarks,
  });
});

// Helper function to recursively delete a folder, its subfolders, and all bookmarks
const deleteRecursive = async (folderId, userId) => {
  // Find child folders
  const childFolders = await BookmarkFolder.find({
    parentId: folderId,
    user: userId,
  });

  // Recursively delete children
  for (const child of childFolders) {
    await deleteRecursive(child._id, userId);
  }

  // Delete bookmarks in this folder
  await Bookmark.deleteMany({
    folderId: folderId,
    user: userId,
  });

  // Delete the folder itself
  await BookmarkFolder.findByIdAndDelete(folderId);
};

// Helper function to check if a folder is a descendant of another folder
const isDescendantFolder = async (possibleDescendantId, ancestorId) => {
  // Base case: if they're the same, return false (a folder isn't its own descendant)
  if (possibleDescendantId === ancestorId) {
    return false;
  }

  // Get the possible descendant folder
  const folder = await BookmarkFolder.findById(possibleDescendantId);

  // If folder doesn't exist or has no parent, it's not a descendant
  if (!folder || !folder.parentId) {
    return false;
  }

  // If its parent is the ancestor, it is a descendant
  if (folder.parentId === ancestorId) {
    return true;
  }

  // Otherwise, check if its parent is a descendant of the ancestor
  return await isDescendantFolder(folder.parentId, ancestorId);
};
