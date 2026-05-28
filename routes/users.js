const express = require('express');
const followService = require('../services/followService');
const { requireAuth } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(requireAuth);

router.get('/me/following', async (req, res) => {
  try {
    res.json(await followService.getFollowing(req.user.username));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:username/follow', async (req, res) => {
  try {
    const result = await followService.followUser(req.user.username, req.params.username);
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.json({ message: 'User followed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:username/follow', async (req, res) => {
  try {
    await followService.unfollowUser(req.user.username, req.params.username);
    res.json({ message: 'User unfollowed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
