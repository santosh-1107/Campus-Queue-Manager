import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import client from '../api/client';
import { useQueueSocket } from '../hooks/useSocket';
import TokenRow from '../components/TokenRow';
import { fetchHostIp, getJoinBaseUrl } from '../utils/network';

export default function StaffPanel() {
  const [services, setServices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [calledToken, setCalledToken] = useState(null);
  const [error, setError] = useState('');
  const [showStandee, setShowStandee] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hostIp, setHostIp] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchHostIp().then((ip) => {
      if (ip) setHostIp(ip);
    });
  }, []);

  const loadStats = () => {
    if (selectedId) {
      client.get(`/staff/services/${selectedId}/stats`)
        .then((res) => setStats(res.data))
        .catch(() => {});
    }
  };
  useEffect(loadStats, [selectedId]);

  const { waiting, lastCalled, paused } = useQueueSocket(selectedId);
  const selectedService = services.find((s) => String(s.id) === String(selectedId));
  const joinBaseUrl = getJoinBaseUrl(hostIp);
  const standeeUrl = selectedId ? `${joinBaseUrl}/join?service=${selectedId}` : '';

  useEffect(() => {
    client.get('/queue/services').then((res) => {
      setServices(res.data);
      if (res.data.length > 0) setSelectedId(res.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedId) {
      client.get(`/queue/services/${selectedId}/current`)
        .then((res) => {
          if (res.data.calledToken) {
            setCalledToken(res.data.calledToken);
          } else {
            setCalledToken(null);
          }
        })
        .catch(() => {});
    }
  }, [selectedId]);

  useEffect(() => {
    if (lastCalled) {
      setCalledToken(lastCalled.token || { id: lastCalled.tokenId, token_number: lastCalled.tokenNumber });
    }
  }, [lastCalled]);

  async function callNext() {
    setError('');
    try {
      const { data } = await client.post(`/staff/services/${selectedId}/call-next`);
      setCalledToken(data.token);
      loadStats();
    } catch (err) {
      setCalledToken(null);
      setError(err.response?.data?.error || 'Nobody is waiting');
    }
  }

  async function completeCurrent() {
    if (!calledToken) return;
    await client.post(`/staff/token/${calledToken.id}/complete`);
    setCalledToken(null);
    loadStats();
  }

  async function togglePause() {
    await client.patch(`/staff/services/${selectedId}/pause`, { paused: !paused });
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <p className="label-eyebrow mb-2">Staff panel</p>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <select
          className="bg-navy border border-white/20 px-3 py-2 font-mono"
          value={selectedId || ''}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setCalledToken(null);
          }}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {selectedId && (
          <button
            onClick={() => setShowStandee(true)}
            className="border border-white/20 hover:border-amber text-slate hover:text-offwhite px-3 py-2 text-xs font-mono transition-colors flex items-center gap-2"
          >
            <span className="text-amber">QR</span> Counter Standee
          </button>
        )}
      </div>

      {/* Real-time Counter Performance Metrics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 mb-8 border border-white/10">
          <div className="bg-navy p-3">
            <p className="text-[10px] font-mono text-slate uppercase tracking-wider">Served Today</p>
            <p className="board-number text-amber mt-1">{stats.completedToday || 0}</p>
          </div>
          <div className="bg-navy p-3">
            <p className="text-[10px] font-mono text-slate uppercase tracking-wider">Total Inflow</p>
            <p className="board-number text-offwhite mt-1">{stats.totalToday || 0}</p>
          </div>
          <div className="bg-navy p-3">
            <p className="text-[10px] font-mono text-slate uppercase tracking-wider">No-Shows</p>
            <p className="board-number text-skipped mt-1">{stats.noShowsToday || 0}</p>
          </div>
          <div className="bg-navy p-3">
            <p className="text-[10px] font-mono text-slate uppercase tracking-wider">Avg Wait</p>
            <p className="board-number text-offwhite mt-1">
              {stats.avgActualWaitSecs ? `${Math.round(stats.avgActualWaitSecs / 60)}m` : '—'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={callNext}
          className="bg-amber text-navy px-5 py-2 font-medium hover:opacity-90 transition-opacity"
        >
          Call next
        </button>
        <button
          onClick={completeCurrent}
          disabled={!calledToken}
          className="border border-completed text-completed px-5 py-2 disabled:opacity-30 hover:bg-completed hover:text-navy transition-colors"
        >
          Mark complete
        </button>
        <button
          onClick={togglePause}
          className="border border-white/20 text-slate px-5 py-2 hover:text-offwhite transition-colors sm:ml-auto"
        >
          {paused ? 'Resume queue' : 'Pause queue'}
        </button>
      </div>

      {error && <p className="text-skipped text-sm mb-4">{error}</p>}

      {calledToken && (
        <div className="border border-amber bg-amber/10 px-4 py-3 mb-8">
          <p className="text-slate text-sm">Now serving</p>
          <p className="board-number text-amber">#{calledToken.token_number}</p>
        </div>
      )}

      <p className="label-eyebrow mb-2">Waiting ({waiting.length})</p>
      <div>
        {waiting.map((t, i) => (
          <TokenRow key={t.id} position={i + 1} tokenNumber={t.token_number} name={t.name} />
        ))}
        {waiting.length === 0 && <p className="text-slate py-4">Nobody waiting.</p>}
      </div>

      {/* Standee Modal */}
      {showStandee && selectedService && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowStandee(false)}
        >
          <div
            className="bg-navy border border-amber p-8 max-w-sm w-full text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowStandee(false)}
              className="absolute top-4 right-4 text-slate hover:text-offwhite font-mono text-lg px-2 py-0.5 border border-white/20 hover:border-white/40 transition-colors"
            >
              ✕
            </button>

            <p className="label-eyebrow mb-1">Desk Check-in Standee</p>
            <h2 className="font-mono text-xl text-offwhite">{selectedService.name}</h2>
            <p className="text-amber text-xs font-mono mt-1 mb-6">Queue #{selectedService.id}</p>

            <div className="flex justify-center mb-6">
              <div
                className="p-4 bg-white border border-amber"
                style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}
              >
                <QRCodeCanvas
                  value={standeeUrl}
                  size={200}
                  level="H"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  marginSize={2}
                  style={{ display: 'block' }}
                />
              </div>
            </div>

            <p className="text-offwhite text-sm font-mono mb-1">Scan with phone camera</p>
            <p className="text-slate text-xs font-mono mb-6">Point camera to take a digital token</p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(standeeUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="flex-1 border border-white/20 hover:border-amber text-slate hover:text-amber py-2 text-xs font-mono transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
              <button
                onClick={() => setShowStandee(false)}
                className="flex-1 bg-amber text-navy font-semibold py-2 text-xs font-mono hover:bg-amber/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
