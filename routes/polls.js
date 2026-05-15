const express = require('express');
const pollService = require('../services/pollService');
const router = express.Router();

router.get('/all', (req, res) => {
  res.json(pollService.getAllPolls());
});

router.get('/user-votes', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: 'Username required' });
  }

  res.json(pollService.getUserVotes(username));
});

router.post('/create', (req, res) => {
  const newPoll = pollService.createPoll(req.body);
  res.json(newPoll);
});

router.post('/delete', (req, res) => {
  const { pollId, username } = req.body;
  if(!pollId || !username) {
    return res.status(400).json({ message: 'Poll ID and Username Required' });
  }

  const result = pollService.deletePoll(pollId, username);
  if(result.error) {
    return res.status(result.status).json({ message: result.error });
  }
  
  res.json({ message: 'Poll Deleted'});
});

router.post('/vote', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username required' });
  }

  const result = pollService.voteOnPoll(req.body);
  if (result.error) {
    return res.status(result.status).json({ message: result.error });
  }

  res.json(result.poll);
});

module.exports = router;
