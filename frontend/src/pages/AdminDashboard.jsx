import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import client from '../api/client';

export default function AdminDashboard() {
  const [services, setServices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [stats, setStats] = useState(null);
  const [newService, setNewService] = useState({ name: '', description: '' });

  function loadServices() {
    client.get('/queue/services').then((res) => {
      setServices(res.data);
      if (res.data.length > 0 && !selectedId) setSelectedId(res.data[0].id);
    });
  }

  useEffect(loadServices, []);

  useEffect(() => {
    if (!selectedId) return;
    client.get(`/staff/services/${selectedId}/stats`).then((res) => setStats(res.data));
  }, [selectedId]);

  async function handleCreate(e) {
    e.preventDefault();
    await client.post('/staff/services', newService);
    setNewService({ name: '', description: '' });
    loadServices();
  }

  const chartData = (stats?.hourlyBreakdown || []).map((h) => ({
    hour: `${h.hour}:00`,
    count: h.count
  }));

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <p className="label-eyebrow mb-2">Admin</p>
      <h1 className="font-mono text-2xl mb-8">Dashboard</h1>

      <form onSubmit={handleCreate} className="flex gap-3 mb-12">
        <input
          className="flex-1 bg-transparent border border-white/20 px-3 py-2 focus:border-amber outline-none"
          placeholder="New service name"
          value={newService.name}
          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
          required
        />
        <input
          className="flex-1 bg-transparent border border-white/20 px-3 py-2 focus:border-amber outline-none"
          placeholder="Description (optional)"
          value={newService.description}
          onChange={(e) => setNewService({ ...newService, description: e.target.value })}
        />
        <button className="bg-amber text-navy px-5 py-2 font-medium whitespace-nowrap">
          Create
        </button>
      </form>

      <select
        className="bg-navy border border-white/20 px-3 py-2 mb-8 font-mono"
        value={selectedId || ''}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {stats && (
        <>
          <div className="grid grid-cols-4 gap-px bg-white/10 mb-12">
            <StatCell label="Today" value={stats.totalToday} />
            <StatCell label="Completed" value={stats.completedToday} />
            <StatCell label="No-shows" value={stats.noShowsToday} color="text-skipped" />
            <StatCell
              label="No-show rate"
              value={`${Math.round((stats.noShowRate || 0) * 100)}%`}
              color="text-skipped"
            />
          </div>

          <p className="label-eyebrow mb-4">Hourly join volume</p>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#ffffff1a" vertical={false} />
                <XAxis dataKey="hour" stroke="#5C6B7A" fontSize={12} />
                <YAxis stroke="#5C6B7A" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0F1B2D', border: '1px solid #ffffff33' }}
                  labelStyle={{ color: '#E8ECEF' }}
                />
                <Bar dataKey="count" fill="#F2A93B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function StatCell({ label, value, color = 'text-offwhite' }) {
  return (
    <div className="bg-navy px-4 py-5">
      <p className="text-slate text-xs mb-1">{label}</p>
      <p className={`board-number ${color}`}>{value ?? '—'}</p>
    </div>
  );
}
