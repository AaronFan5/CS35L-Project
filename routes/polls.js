const express = require('express');
const fs = require('fs');
const { builtinModules } = require('module');
const path = require('path');
const router = express.Router();
const pollsFile = path.join(__dirname, '..', 'data', 'polls.json');

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

router.get('/all', (req, res) => {
    res.json(loadPolls());
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

module.exports = router;