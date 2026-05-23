const pageType = document.body.dataset.pageType || 'login';
const pageTitle = pageType === 'signup' ? 'Sign Up' : 'Log in';
const pageHeadline = pageType === 'signup' ? 'Create your account' : 'Welcome back';
const { useState } = React;

function AuthForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`/auth/${pageType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, username, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{pageTitle}</h1>
        <p className="auth-subtitle">{pageHeadline}</p>
        <form onSubmit={handleSubmit}>
          {pageType === 'signup' && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Your name" required />
            </div>
          )}
          {pageType === 'signup' && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" required />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} type="text" placeholder="Username" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required />
          </div>
          <button type="submit" className="auth-submit">{pageTitle}</button>
        </form>
        <p className="auth-footer">
          {pageType === 'signup'
            ? <span>Already have an account? <a href="/auth/login">Log in</a></span>
            : <span>Need an account? <a href="/auth/signup">Sign up</a></span>}
        </p>
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AuthForm />);
