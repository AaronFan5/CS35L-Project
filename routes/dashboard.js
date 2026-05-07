const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    const username = req.query.username || 'Guest';
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <title>Polls</title>
                <link rel="stylesheet" href="/styles.css">
                <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            </head>
            <body>
                <div id="root"></div>
                <script type="text/babel">
                    const { useState, useEffect } = React;
                    const currentUser = '${username}';

                    function Dashboard() {
                        const [polls, setPolls] = useState([]);
                        const [question, setQuestion] = useState('');
                        const [options, setOptions] = useState('');
                        const [userVotes, setUserVotes] = useState({});

                        useEffect(() => {
                            fetch('/polls/all')
                                .then(res => res.json())
                                .then(data => setPolls(data));
                            
                            // Fetch user's votes
                            fetch('/polls/user-votes?username=' + encodeURIComponent(currentUser))
                                .then(res => res.json())
                                .then(votes => {
                                    const votesMap = {};
                                    votes.forEach(vote => {
                                        votesMap[vote.pollId] = vote.optionIndex;
                                    });
                                    setUserVotes(votesMap);
                                });
                        }, []);

                        const createPoll = async () => {
                            const optionsArray = options.split(',').map(s => s.trim());
                            const response = await fetch('/polls/create', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ question, options: optionsArray, creator: currentUser })    
                            });
                            const newPoll = await response.json();
                            setPolls([...polls, newPoll]);
                            setQuestion(''); 
                            setOptions('');
                        };

                        const handleVote = async (pollId, optionIndex) => {
                            const response = await fetch('/polls/vote', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ pollId, optionIndex, username: currentUser })
                            });
                            const data = await response.json();
                            if (!response.ok) {
                                alert(data.message);
                                return;
                            }
                            const updatedPolls = polls.map(p => p.id === pollId ? data : p);
                            setPolls(updatedPolls);
                            
                            // Update user votes state
                            const newUserVotes = { ...userVotes };
                            if (userVotes[pollId] === optionIndex) {
                                // User unvoted - remove from userVotes
                                delete newUserVotes[pollId];
                            } else {
                                // User voted - add/update userVotes
                                newUserVotes[pollId] = optionIndex;
                            }
                            setUserVotes(newUserVotes);
                        };

                        return (
                            <div>
                                <h1>Poll Dashboard - Welcome {currentUser}</h1>
                                <a href="/"><button>Log Out</button></a>
                                <div className="create-poll">
                                    <h2>Create a New Poll</h2>
                                    <input placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)} /><br/>
                                    <input placeholder="Options (comma separated)" value={options} onChange={e => setOptions(e.target.value)} /><br/>
                                    <button onClick={createPoll}>Create Poll</button>
                                </div>

                                <h2>Polls</h2>
                                {polls.map(poll => (
                                    <div key={poll.id} className="poll-card">
                                        <h4>{poll.question}</h4>
                                        <p>Created by: {poll.creator}</p>
                                        {poll.options.map((opt, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => handleVote(poll.id, idx)}
                                                className={userVotes[poll.id] === idx ? 'voted-option' : ''}
                                            >
                                                {opt.text} ({opt.votes})
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        );
                    }

                    ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
                </script>
            </body>
        </html>
    `);
});

module.exports = router;