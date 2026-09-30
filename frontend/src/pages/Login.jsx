import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user: currentUser, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceParam = searchParams.get('service');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');

  const pendingService = serviceParam || (typeof window !== 'undefined' ? sessionStorage.getItem('pending_join_service') : null);

  useEffect(() => {
    if (serviceParam) {
      try {
        sessionStorage.setItem('pending_join_service', serviceParam);
      } catch (e) {
        // ignore
      }
    }
  }, [serviceParam]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (currentUser.role === 'staff') {
        navigate('/staff', { replace: true });
      } else {
        const target = serviceParam || sessionStorage.getItem('pending_join_service');
        if (target) {
          try {
            sessionStorage.removeItem('pending_join_service');
          } catch (e) {
            // ignore
          }
          navigate(`/join?service=${target}`, { replace: true });
        } else {
          navigate('/join', { replace: true });
        }
      }
    }
  }, [currentUser, navigate, serviceParam]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const user =
        mode === 'login'
          ? await login(form.email, form.password)
          : await register(form.name, form.email, form.password, form.role);

      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'staff') {
        navigate('/staff');
      } else {
        const target = searchParams.get('service') || sessionStorage.getItem('pending_join_service');
        if (target) {
          try {
            sessionStorage.removeItem('pending_join_service');
          } catch (e) {
            // ignore
          }
          navigate(`/join?service=${target}`);
        } else {
          navigate('/join');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20 px-6">
      <p className="label-eyebrow mb-2">{mode === 'login' ? 'Welcome back' : 'Create an account'}</p>
      <h1 className="font-mono text-2xl mb-8">Campus Queue Manager</h1>

      {pendingService && (
        <div className="border border-amber bg-amber/10 px-3 py-2.5 mb-6 text-xs font-mono text-amber">
          Scan detected: Log in to join Queue #{pendingService}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <input
            className="w-full bg-transparent border border-white/20 px-3 py-2 focus:border-amber outline-none"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        )}
        <input
          type="email"
          className="w-full bg-transparent border border-white/20 px-3 py-2 focus:border-amber outline-none"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          className="w-full bg-transparent border border-white/20 px-3 py-2 focus:border-amber outline-none"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {mode === 'register' && (
          <select
            className="w-full bg-navy border border-white/20 px-3 py-2 focus:border-amber outline-none"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="student">Student</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        )}

        {error && <p className="text-skipped text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-amber text-navy font-medium py-2 hover:opacity-90 transition-opacity"
        >
          {mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      <button
        className="text-slate text-sm mt-6"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Log in'}
      </button>
    </div>
  );
}
