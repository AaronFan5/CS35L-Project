const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <title>Polls</title>
                <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            </head>
            <body>
                <div id="root"></div>
                <script type="text/babel">
                    const { useState, useEffect } = React;

                    function Dashboard() {
                        const [polls, setPolls] = useState([]);
                        const [question, setQuestion] = useState('');
                        const [options, setOptions] = useState('');

                        useEffect(() => {
                            fetch('/polls/all')
                                .then(res => res.json())
                                .then(data => setPolls(data));
                        }, []);

                        const createPoll = async () => {
                            const optionsArray = options.split(',').map(s => s.trim());
                            const response = await fetch('/polls/create', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ question, options: optionsArray })    
                            });
                            const newPoll = await response.json();
                            setPolls([...polls, newPoll]);
                            setQuestion(''); 
                            setOptions('');
                        };

                        return (
                            <div>
                                <h1>Poll Dashboard</h1>
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
                                            <button key={idx}>{opt.text} ({opt.votes})</button>
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