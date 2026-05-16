const { useEffect, useState } = React;

function Dashboard() {
  const [currentUser, setCurrentUser] = useState('Loading...');
  const [polls, setPolls] = useState([]);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');
  const [userVotes, setUserVotes] = useState({});
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [category, setCategory] = useState('Opinion');
  const [activeFilter, setActiveFilter] = useState('All');

  const selectedPoll = polls.find((poll) => poll.id === selectedPollId);
  const filteredPolls = activeFilter === 'All' ? polls : polls.filter(poll => poll.category === activeFilter);

  useEffect(() => {
    fetch('/auth/me')
      .then((response) => {
        if (!response.ok) {
          window.location.href = '/auth/login';
          throw new Error('Not authenticated');
        }
        return response.json();
      })
      .then((data) => {
        setCurrentUser(data.username);
        
        return fetch('/polls/user-votes');
      })
      .then((response) => response.json())
      .then((votes) => {
        const votesMap = {};
        if (Array.isArray(votes)) {
            votes.forEach((vote) => {
            votesMap[vote.pollId] = vote.optionIndex;
            });
        }
        setUserVotes(votesMap);
      })
      .catch((error) => console.error('Auth error:', error));

    fetch('/polls/all')
      .then((response) => response.json())
      .then((data) => {
        setPolls(data);
        if (data.length > 0) {
          setSelectedPollId(data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if(filteredPolls.length > 0 && !filteredPolls.find(poll => poll.id === selectedPollId)){
      setSelectedPollId(filteredPolls[0].id);
    }
  }, [activeFilter, polls]);

  const createPoll = async () => {
    const optionsArray = options.split(',').map((option) => option.trim());
    const response = await fetch('/polls/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options: optionsArray, category })
    });
    const newPoll = await response.json();
    setPolls([...polls, newPoll]);
    setSelectedPollId(newPoll.id);
    setQuestion('');
    setOptions('');
  };

  const deletePoll = async (pollId) => {
    const response = await fetch('/polls/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId })
    });
    if(response.ok){
      const updatedPolls = polls.filter(poll => poll.id !== pollId);
      setPolls(updatedPolls);
      if(selectedPollId === pollId && updatedPolls.length > 0){
        setSelectedPollId(updatedPolls[0].id);
      } else if(updatedPolls.length === 0){
        setSelectedPollId(null);
      }
    }
  };

  const handleVote = async (pollId, optionIndex) => {
    const response = await fetch('/polls/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, optionIndex })
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    setPolls(polls.map((poll) => poll.id === pollId ? data : poll));

    const newUserVotes = { ...userVotes };
    if (userVotes[pollId] === optionIndex) {
      delete newUserVotes[pollId];
    } else {
      newUserVotes[pollId] = optionIndex;
    }
    setUserVotes(newUserVotes);
  };

  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const renderPollChart = (poll) => {
    const highestVoteCount = Math.max(...poll.options.map((option) => option.votes), 1);

    return (
      <div className="poll-chart">
        {poll.options.map((option, index) => {
          const width = `${(option.votes / highestVoteCount) * 100}%`;

          return (
            <div key={index} className="chart-row">
              <span className="chart-label">{option.text}</span>
              <div className="chart-track">
                <div className="chart-bar" style={{ width }}></div>
              </div>
              <span className="chart-count">{option.votes}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <h1>Poll Dashboard - Welcome {currentUser}</h1>
      <button onClick={handleLogout} style={{ backgroundColor: '#dc3545' }}>Log Out</button>
      
      <div className="create-poll">
        <h2>Create a New Poll</h2>
        <input placeholder="Question" value={question} onChange={(event) => setQuestion(event.target.value)} /><br />
        <input placeholder="Options (comma separated)" value={options} onChange={(event) => setOptions(event.target.value)} /><br />

        <label>Category:</label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="Food">Food</option>
          <option value="Location">Location</option>
          <option value="Opinion">Opinion</option>
        </select><br />

        <button onClick={createPoll}>Create Poll</button>
      </div>

      <div className="filter-buttons" style={{ margin: '20px 0' }}>
        {['All', 'Food', 'Location', 'Opinion'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            style={{ fontWeight: activeFilter === tab ? 'bold' : 'normal', marginRight: '10px' }}
            >
              {tab.toUpperCase()}
            </button>
        ))}
      </div>

      <h2>Polls</h2>
      <div className="poll-layout">
        <div className="poll-list">
          {filteredPolls.map((poll) => (
            <button
              key={poll.id}
              type="button"
              className={`poll-card ${selectedPollId === poll.id ? 'selected-poll' : ''}`}
              onClick={() => setSelectedPollId(poll.id)}
            >
              <h4>{poll.question}</h4>
              <p>Created by: {poll.creator}</p>
            </button>
          ))}
        </div>

        {selectedPoll && (
          <div className="poll-detail">
            <h2>{selectedPoll.question}</h2>
            {selectedPoll.creator === currentUser && (
              <button onClick={() => deletePoll(selectedPoll.id)} style={{ color: 'red', marginBottom: '10px' }}>Delete Poll</button>
            )}

            <p>Category: <strong>{selectedPoll.category}</strong> | Created by: {selectedPoll.creator}</p>
            <div className="poll-options">
              {selectedPoll.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleVote(selectedPoll.id, index)}
                  className={userVotes[selectedPoll.id] === index ? 'voted-option' : ''}
                >
                  {option.text} ({option.votes})
                </button>
              ))}
            </div>
            {renderPollChart(selectedPoll)}
          </div>
        )}

        {filteredPolls.length === 0 && (
          <div className="poll-detail">
            <h2>No polls available in this category.</h2>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);