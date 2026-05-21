const express = require('express');
const pollService = require('../services/pollService');
const { requireAuth } = require('../middleware/authMiddleware'); // import middleware
const router = express.Router();

// anyone can view all polls
router.get('/all', async (req, res) => {
  try {
    res.json(await pollService.getAllPolls());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// protect all routes below this line
router.use(requireAuth);

router.get('/user-votes', async (req, res) => {
  try {
    res.json(await pollService.getUserVotes(req.user.username)); // securely extracted from token
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/create', async (req, res) => {
  const pollData = { ...req.body, creator: req.user.username }; // securely set creator
  try {
    const newPoll = await pollService.createPoll(pollData);
    res.json(newPoll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/delete', async (req, res) => {
  const { pollId } = req.body;
  try {
    const result = await pollService.deletePoll(pollId, req.user.username); // securely set user
    if(result.error) return res.status(result.status).json({ message: result.error });
    res.json({ message: 'Poll Deleted'});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/vote', async (req, res) => {
  const voteData = { ...req.body, username: req.user.username }; // securely set voter
  try {
    const result = await pollService.voteOnPoll(voteData);
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.json(result.poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
