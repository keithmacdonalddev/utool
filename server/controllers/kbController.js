// Placeholder for kbController.js - Implement the actual logic later
// Import necessary models and utilities

const KnowledgeBaseArticle = require('../models/KnowledgeBaseArticle');

// @desc    Get all knowledge base articles
// @route   GET /api/v1/kb
// @access  Private
exports.getKbArticles = async (req, res, next) => {
  try {
    // Get all articles and sort by views (descending)
    const kbArticles = await KnowledgeBaseArticle.find().sort({ views: -1 });
    res.status(200).json({ success: true, data: kbArticles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a new knowledge base article
// @route   POST /api/v1/kb
// @access  Private
exports.createKbArticle = async (req, res, next) => {
  try {
    const { title, content, tags, categories } = req.body;
    const author = req.user._id; // Assuming user is authenticated and added to req

    const kbArticle = await KnowledgeBaseArticle.create({
      title,
      content,
      tags,
      categories,
      author,
    });

    // Add audit log for KB article creation
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'kb_create', 'success', {
      articleId: kbArticle._id,
      articleTitle: kbArticle.title,
      categories: kbArticle.categories,
      tags: kbArticle.tags,
    });

    res.status(201).json({ success: true, data: kbArticle });
  } catch (err) {
    console.error(err);

    // Add audit log for failed KB article creation
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'kb_create', 'failed', {
      articleTitle: req.body.title,
      error: err.message,
    });

    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get a single knowledge base article
// @route   GET /api/v1/kb/:id
// @access  Private
exports.getKbArticle = async (req, res, next) => {
  try {
    // Find the article first
    const kbArticle = await KnowledgeBaseArticle.findById(req.params.id);

    if (!kbArticle) {
      return res
        .status(404)
        .json({ success: false, message: 'Article not found' });
    }

    // Increment the view counter
    kbArticle.views += 1;
    await kbArticle.save();

    res.status(200).json({ success: true, data: kbArticle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a knowledge base article
// @route   PUT /api/v1/kb/:id
// @access  Private
exports.updateKbArticle = async (req, res, next) => {
  try {
    const { title, content, tags, categories } = req.body;
    let kbArticle = await KnowledgeBaseArticle.findById(req.params.id);

    if (!kbArticle) {
      return res
        .status(404)
        .json({ success: false, message: 'Article not found' });
    }

    // Store original values for audit log
    const originalArticle = {
      title: kbArticle.title,
      content: kbArticle.content,
      tags: kbArticle.tags,
      categories: kbArticle.categories,
    };

    // Track changed fields for audit log
    const changedFields = {};
    if (title !== undefined && title !== kbArticle.title) {
      changedFields.title = true;
    }
    if (content !== undefined && content !== kbArticle.content) {
      changedFields.content = true;
    }
    if (tags !== undefined) {
      changedFields.tags = true;
    }
    if (categories !== undefined) {
      changedFields.categories = true;
    }

    // Update fields
    kbArticle.title = title !== undefined ? title : kbArticle.title;
    kbArticle.content = content !== undefined ? content : kbArticle.content;
    kbArticle.tags = tags !== undefined ? tags : kbArticle.tags;
    kbArticle.categories =
      categories !== undefined ? categories : kbArticle.categories;
    kbArticle.updatedAt = Date.now();

    kbArticle = await kbArticle.save();

    // Add audit log for KB article update
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'kb_update', 'success', {
      articleId: kbArticle._id,
      articleTitle: kbArticle.title,
      changedFields: Object.keys(changedFields),
      originalValues: originalArticle,
    });

    res.status(200).json({ success: true, data: kbArticle });
  } catch (err) {
    console.error(err);

    // Add audit log for failed KB article update
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'kb_update', 'failed', {
      articleId: req.params.id,
      error: err.message,
    });

    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a knowledge base article
// @route   DELETE /api/v1/kb/:id
// @access  Private
exports.deleteKbArticle = async (req, res, next) => {
  try {
    // First find the article to capture details for audit log
    const kbArticle = await KnowledgeBaseArticle.findById(req.params.id);

    if (!kbArticle) {
      return res
        .status(404)
        .json({ success: false, message: 'Article not found' });
    }

    // Store article info before deletion
    const articleInfo = {
      id: kbArticle._id,
      title: kbArticle.title,
      author: kbArticle.author,
      categories: kbArticle.categories,
      tags: kbArticle.tags,
    };

    // Import Comment model
    const Comment = require('../models/Comment');

    // Delete all comments associated with the article
    const deleteResult = await Comment.deleteMany({ article: req.params.id });

    // Log the number of comments deleted
    console.log(
      `Deleted ${deleteResult.deletedCount} comments associated with article ${req.params.id}`
    );

    // Delete the article
    await KnowledgeBaseArticle.findByIdAndDelete(req.params.id);

    // Add audit log for KB article deletion
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'kb_delete', 'success', {
      articleId: articleInfo.id,
      articleTitle: articleInfo.title,
      articleInfo: articleInfo,
      commentsDeleted: deleteResult.deletedCount, // Add info about deleted comments to audit log
    });

    res.status(200).json({
      success: true,
      data: {},
      message: `Article deleted successfully along with ${deleteResult.deletedCount} related comments`,
    });
  } catch (err) {
    console.error(err);

    // Add audit log for failed KB article deletion
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'kb_delete', 'failed', {
      articleId: req.params.id,
      error: err.message,
    });

    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all versions of a knowledge base article
// @route   GET /api/v1/kb/:id/versions
// @access  Private
exports.getKbArticleVersions = async (req, res, next) => {
  try {
    const kbArticle = await KnowledgeBaseArticle.findById(req.params.id).select(
      'versions'
    );
    if (!kbArticle) {
      return res
        .status(404)
        .json({ success: false, message: 'Article not found' });
    }
    res.status(200).json({ success: true, data: kbArticle.versions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get a specific version of a knowledge base article
// @route   GET /api/v1/kb/:id/versions/:versionId
// @access  Private
exports.getKbArticleVersion = async (req, res, next) => {
  try {
    const kbArticle = await KnowledgeBaseArticle.findById(req.params.id).select(
      'versions'
    );
    if (!kbArticle) {
      return res
        .status(404)
        .json({ success: false, message: 'Article not found' });
    }

    const version = kbArticle.versions.find(
      (version) => version.versionNumber.toString() === req.params.versionId
    );

    if (!version) {
      return res
        .status(404)
        .json({ success: false, message: 'Version not found' });
    }

    res.status(200).json({ success: true, data: version });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Restore a knowledge base article to a specific version
// @route   POST /api/v1/kb/:id/versions/:versionId/restore
// @access  Private
exports.restoreKbArticleVersion = async (req, res, next) => {
  try {
    const { id, versionId } = req.params;
    const kbArticle = await KnowledgeBaseArticle.findById(id);

    if (!kbArticle) {
      return res
        .status(404)
        .json({ success: false, message: 'Article not found' });
    }

    const versionToRestore = kbArticle.versions.find(
      (version) => version.versionNumber.toString() === versionId
    );

    if (!versionToRestore) {
      return res
        .status(404)
        .json({ success: false, message: 'Version not found' });
    }

    // Store original values for audit log
    const originalArticle = {
      title: kbArticle.title,
      content: kbArticle.content,
    };

    // Restore the article
    kbArticle.title = versionToRestore.title;
    kbArticle.content = versionToRestore.content;
    kbArticle.updatedAt = Date.now();
    // No need to push to versions here, as we are restoring to a previous version

    await kbArticle.save();

    // Add audit log for KB article version restoration
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'kb_update', 'success', {
      articleId: kbArticle._id,
      articleTitle: kbArticle.title,
      restoredVersion: versionId,
      originalValues: originalArticle,
      action: 'version_restore',
    });

    res.status(200).json({ success: true, data: kbArticle });
  } catch (err) {
    console.error(err);

    // Add audit log for failed KB article version restoration
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'kb_update', 'failed', {
      articleId: req.params.id,
      restoredVersion: req.params.versionId,
      error: err.message,
      action: 'version_restore',
    });

    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Search for knowledge base articles
// @route   POST /api/v1/kb/search
// @access  Private
exports.searchKbArticles = async (req, res, next) => {
  try {
    const { query, tags, categories } = req.body;
    let searchConditions = {};

    if (query) {
      searchConditions.$or = [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
      ];
    }

    if (tags && tags.length > 0) {
      searchConditions.tags = { $in: tags };
    }

    if (categories && categories.length > 0) {
      searchConditions.categories = { $in: categories };
    }

    const kbArticles = await KnowledgeBaseArticle.find(searchConditions).sort({
      views: -1,
    }); // Sort by views (most to least)

    res.status(200).json({ success: true, data: kbArticles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
