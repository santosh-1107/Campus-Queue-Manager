import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <Link to={user ? (user.role === 'admin' ? '/admin' : user.role === 'staff' ? '/staff' : '/join') : '/join'} className="font-mono text-lg tracking-tight text-offwhite">
        CAMPUS QUEUE
      </Link>
      <div className="flex items-center gap-6 text-sm">
        {!user && (
          <Link to="/join" className="text-slate hover:text-offwhite transition-colors">
            Services & QR
          </Link>
        )}
        {user?.role === 'student' && (
          <Link to="/join" className="text-slate hover:text-offwhite transition-colors">
            Join a queue
          </Link>
        )}
        {(user?.role === 'staff' || user?.role === 'admin') && (
          <Link to="/staff" className="text-slate hover:text-offwhite transition-colors">
            Staff panel
          </Link>
        )}
        {(user?.role === 'staff' || user?.role === 'admin') && (
          <Link to="/admin" className="text-slate hover:text-offwhite transition-colors">
            Analytics
          </Link>
        )}
        {user ? (
          <button onClick={logout} className="text-slate hover:text-offwhite transition-colors">
            {user.name} — log out
          </button>
        ) : (
          <Link to="/login" className="text-amber">
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
