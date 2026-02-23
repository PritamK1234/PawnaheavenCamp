import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const ShieldIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 7V12C3 16.55 7 20.74 12 22C17 20.74 21 16.55 21 12V7L12 2Z" fill="white" fillOpacity="0.9"/>
    <path d="M10 17L7 14L8.41 12.59L10 14.17L15.59 8.58L17 10L10 17Z" fill="#c19b4a"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password });

      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('admin', JSON.stringify(response.data.data.admin));
        navigate('/', { replace: true });
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div style={{ width: '100%', maxWidth: '440px', padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="login-shield">
            <ShieldIcon />
          </div>
          <h1 className="login-title">PawnaHavenCamp</h1>
          <p className="login-subtitle">✦ Admin Portal ✦</p>
        </div>

        <div className="login-card">
          <h2 className="login-heading">Welcome back</h2>
          <p className="login-desc">Sign in to manage your properties</p>

          <form onSubmit={handleSubmit} style={{ marginTop: '1.75rem' }}>
            <div className="login-field">
              <label className="login-label" htmlFor="email">Email Address</label>
              <input
                className="login-input"
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter admin Email address"
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">Password</label>
              <div className="login-input-wrapper">
                <input
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter valid password"
                  autoComplete="current-password"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">{error}</div>
            )}

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : '→  Sign In'}
            </button>
          </form>

          <div className="login-footer">
            Secure admin access • Protected by encryption
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="login-back"
            onClick={() => window.location.href = '/'}
          >
            ← Back to website
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
