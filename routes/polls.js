const express = require('express');
const pollController = require('../controllers/pollController');
const { requireAuth } = require('../middleware/authMiddleware'); // import middleware
const router = express.Router();

// anyone can view all polls
router.get('/all', pollController.getAllPolls);

// protect all routes below this line
router.use(requireAuth);

router.get('/user-votes', pollController.getUserVotes);
router.post('/create', pollController.createPoll);
router.delete('/:id', pollController.deletePoll);
router.post('/vote', pollController.voteOnPoll);

router.post('/toggle-status', async (req, res) => {
  const { pollId } = req.body;
  try {
    const result = await pollService.togglePollStatus(pollId, req.user.username);
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.json(result.poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
