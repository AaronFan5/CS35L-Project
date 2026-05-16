const express = require('express');
const pollService = require('../services/pollService');
const { requireAuth } = require('../middleware/authMiddleware'); // import middleware
const router = express.Router();

// anyone can view all polls
router.get('/all', (req, res) => {
  res.json(pollService.getAllPolls());
});

// protect all routes below this line
router.use(requireAuth);

router.get('/user-votes', (req, res) => {
  res.json(pollService.getUserVotes(req.user.username)); // securely extracted from token
});

router.post('/create', (req, res) => {
  const pollData = { ...req.body, creator: req.user.username }; // securely set creator
  const newPoll = pollService.createPoll(pollData);
  res.json(newPoll);
});

router.post('/delete', (req, res) => {
  const { pollId } = req.body;
  const result = pollService.deletePoll(pollId, req.user.username); // securely set user
  if(result.error) return res.status(result.status).json({ message: result.error });
  res.json({ message: 'Poll Deleted'});
});

router.post('/vote', (req, res) => {
  const voteData = { ...req.body, username: req.user.username }; // securely set voter
  const result = pollService.voteOnPoll(voteData);
  if (result.error) return res.status(result.status).json({ message: result.error });
  res.json(result.poll);
});

module.exports = router;