const followService = require('../services/followService');

async function getFollowing(req, res) {
  try {
    res.json(await followService.getFollowing(req.user.username));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function searchUsers(req, res) {
  try {
    res.json(await followService.searchUsers(req.query.q, req.user.username));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function followUser(req, res) {
  try {
    const result = await followService.followUser(req.user.username, req.params.username);
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.json({ message: 'User followed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function unfollowUser(req, res) {
  try {
    await followService.unfollowUser(req.user.username, req.params.username);
    res.json({ message: 'User unfollowed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { getFollowing, searchUsers, followUser, unfollowUser };
