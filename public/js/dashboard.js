const { useEffect, useState } = React;

function Dashboard() {
  const [currentUser, setCurrentUser] = useState('');
  const [polls, setPolls] = useState([]);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');
  const [userVotes, setUserVotes] = useState({});
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [category, setCategory] = useState('Opinion');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('All');

  const selectedPoll = polls.find((poll) => poll.id === selectedPollId);

  const filteredPolls = polls
    .filter(poll => {
      if (viewMode === 'Mine') return poll.creator === currentUser;
      if (viewMode === 'Voted') return userVotes.hasOwnProperty(poll.id);
      return true;
    })
    .filter(poll => activeFilter === 'All' ? true : poll.category === activeFilter)
    .filter(poll => poll.question.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    fetch('/auth/me')
      .then((res) => {
        if (!res.ok) { window.location.href = '/auth/login'; throw new Error('Not authenticated'); }
        return res.json();
      })
      .then((data) => {
        setCurrentUser(data.username);
        return fetch('/polls/user-votes');
      })
      .then((res) => res.json())
      .then((votes) => {
        const votesMap = {};
        if (Array.isArray(votes)) {
          votes.forEach((vote) => { votesMap[vote.pollId] = vote.optionIndex; });
        }
        setUserVotes(votesMap);
      })
      .catch((err) => console.error('Auth error:', err));

    fetch('/polls/all')
      .then((res) => res.json())
      .then((data) => {
        setPolls(data);
        if (data.length > 0) setSelectedPollId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (filteredPolls.length > 0 && !filteredPolls.find(poll => poll.id === selectedPollId)) {
      setSelectedPollId(filteredPolls[0].id);
    }
  }, [activeFilter, polls]);

  const createPoll = async () => {
    const optionsArray = options.split(',').map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) { alert('Please enter a question.'); return; }
    if (optionsArray.length < 2) { alert('Please enter at least 2 options.'); return; }

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
    const response = await fetch(`/polls/${pollId}`, { method: 'DELETE' });
    if (response.ok) {
      const updatedPolls = polls.filter(poll => poll.id !== pollId);
      setPolls(updatedPolls);
      if (selectedPollId === pollId && updatedPolls.length > 0) {
        setSelectedPollId(updatedPolls[0].id);
      } else if (updatedPolls.length === 0) {
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
    if (!response.ok) { alert(data.message); return; }

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
    const highestVoteCount = Math.max(...poll.options.map((o) => o.votes), 1);
    return (
      <div className="poll-chart">
        {poll.options.map((option, index) => (
          <div key={index} className="chart-row">
            <span className="chart-label">{option.text}</span>
            <div className="chart-track">
              <div className="chart-bar" style={{ width: `${(option.votes / highestVoteCount) * 100}%` }}></div>
            </div>
            <span className="chart-count">{option.votes}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="dashboard-header">
        <span className="dashboard-title">Polls</span>
        <div className="nav-actions">
          {currentUser && <span className="nav-user">{currentUser}</span>}
          <button className="btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
        </div>
      </div>

      <div className="dashboard-body">
        <div className="create-poll">
          <h2>Create a poll</h2>
          <div className="form-group">
            <label>Question</label>
            <input placeholder="What do you want to ask?" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Options</label>
            <input placeholder="Comma-separated options (e.g. Pizza, Sushi, Tacos)" value={options} onChange={(e) => setOptions(e.target.value)} />
          </div>
          <div className="create-poll-footer">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Food">Food</option>
              <option value="Location">Location</option>
              <option value="Opinion">Opinion</option>
            </select>
            <button onClick={createPoll}>Create poll</button>
          </div>
        </div>

        <div className="tab-group">
          {['All', 'Mine', 'Voted'].map(mode => (
            <button
              key={mode}
              className={`tab-btn${viewMode === mode ? ' active' : ''}`}
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search polls..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {['All', 'Food', 'Location', 'Opinion'].map(tab => (
            <button
              key={tab}
              className={`filter-pill${activeFilter === tab ? ' active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="poll-layout">
          <div className="poll-list">
            {filteredPolls.map((poll) => (
              <button
                key={poll.id}
                type="button"
                className={`poll-card${selectedPollId === poll.id ? ' selected-poll' : ''}`}
                onClick={() => setSelectedPollId(poll.id)}
              >
                <h4>{poll.question}</h4>
                <p>by {poll.creator}</p>
              </button>
            ))}
            {filteredPolls.length === 0 && (
              <p className="empty-state">No polls found.</p>
            )}
          </div>

          {selectedPoll && (
            <div className="poll-detail">
              <h2>{selectedPoll.question}</h2>
              <p className="poll-meta">
                Category: <strong>{selectedPoll.category}</strong> &middot; by {selectedPoll.creator}
              </p>
              {selectedPoll.creator === currentUser && (
                <button className="delete-poll-button" onClick={() => deletePoll(selectedPoll.id)}>Delete poll</button>
              )}
              <div className="poll-options">
                {selectedPoll.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleVote(selectedPoll.id, index)}
                    className={userVotes[selectedPoll.id] === index ? 'voted-option' : ''}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
              {renderPollChart(selectedPoll)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
