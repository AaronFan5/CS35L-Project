const express = require('express');
const fs = require('fs');
const { builtinModules } = require('module');
const path = require('path');
const router = express.Router();
const pollsFile = path.join(__dirname, '..', 'data', 'polls.json');
const votesFile = path.join(__dirname, '..', 'data', 'votes.json');

function loadPolls(){
    try{
        const data = fs.readFileSync(pollsFile, 'utf8');
        return JSON.parse(data || '[]');
    } catch (error) {
        console.error('Error loading polls:', error);
        return [];
    }
}

function savePolls(polls){
    fs.writeFileSync(pollsFile, JSON.stringify(polls, null, 2), 'utf8');
}

function loadVotes(){
    try{
        const data = fs.readFileSync(votesFile, 'utf8');
        return JSON.parse(data || '[]');
    } catch (error) {
        console.error('Error loading votes:', error);
        return [];
    }
}

function saveVotes(votes){
    fs.mkdirSync(path.dirname(votesFile), { recursive: true });
    fs.writeFileSync(votesFile, JSON.stringify(votes, null, 2), 'utf8');
}

router.get('/all', (req, res) => {
    res.json(loadPolls());
});

router.get('/user-votes', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ message: 'Username required' });
    }
    const votes = loadVotes();
    const userVotes = votes.filter(v => v.username === username);
    res.json(userVotes);
});

router.post('/create', (req, res) => {
    const {question, options, creator} = req.body;
    const polls = loadPolls();
    const newPoll = {
        id: Date.now().toString(),
        question,
        options: options.map(option => ({ text: option, votes: 0 })),
        creator: creator
    };
    polls.push(newPoll);
    savePolls(polls);
    res.json(newPoll);
});

//voting
router.post('/vote', (req, res) => {
    const { pollId, optionIndex, username } = req.body;
    
    if (!username) {
        return res.status(400).json({ message: 'Username required' });
    }
    
    const votes = loadVotes();
    const existingVote = votes.find(v => v.username === username && v.pollId === pollId);
    
    const polls = loadPolls();
    const poll = polls.find(p => p.id === pollId);
    
    if (!poll) {
        return res.status(404).json({ message: 'Poll not found' });
    }
    
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
        return res.status(400).json({ message: 'Invalid option' });
    }
    
    if (existingVote) {
        // User already voted - check if it's the same option
        if (existingVote.optionIndex === optionIndex) {
            // Remove their vote
            poll.options[optionIndex].votes--;
            // Remove the vote record
            const voteIndex = votes.findIndex(v => v.username === username && v.pollId === pollId);
            votes.splice(voteIndex, 1);
            saveVotes(votes);
            savePolls(polls);
            return res.json(poll);
        } 
        else {
            // User voted on different option - prevent voting
            return res.status(400).json({ message: 'You already voted on this poll' });
        }
    } 
    else {
        // User hasn't voted yet - add their vote
        poll.options[optionIndex].votes++;
        votes.push({ username, pollId, optionIndex });
        saveVotes(votes);
        savePolls(polls);
        res.json(poll);
    }
});

module.exports = router;