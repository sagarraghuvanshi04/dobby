import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/signup', form);
      login(data.token, data.user);
      nav('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-g">G</span><span className="logo-o1">o</span><span className="logo-o2">o</span><span className="logo-g2">g</span><span className="logo-l">l</span><span className="logo-e">e</span>
          <span className="logo-drive"> Drive</span>
        </div>
        <h2>Create your account</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          <input placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <input placeholder="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <button type="submit">Sign Up</button>
        </form>
        <p>Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
