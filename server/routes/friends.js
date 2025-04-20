import express from 'express';
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectOrCancelFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests,
} from '../controllers/friendController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes below are protected
router.use(protect);

router.get('/search', searchUsers); // GET /api/v1/friends/search?term=...
router.post('/request/:userId', sendFriendRequest); // POST /api/v1/friends/request/<recipient_user_id>
router.put('/accept/:userId', acceptFriendRequest); // PUT /api/v1/friends/accept/<sender_user_id>
router.delete('/request/:userId', rejectOrCancelFriendRequest); // DELETE /api/v1/friends/request/<other_user_id>
router.delete('/:userId', removeFriend); // DELETE /api/v1/friends/<friend_user_id>
router.get('/', getFriends); // GET /api/v1/friends
router.get('/requests', getFriendRequests); // GET /api/v1/friends/requests

export default router;
