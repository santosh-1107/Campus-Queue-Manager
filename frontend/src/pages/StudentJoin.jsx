import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { fetchHostIp, getJoinBaseUrl } from '../utils/network';

export default function StudentJoin() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [activeModalQR, setActiveModalQR] = useState(null);
  const [copied, setCopied] = useState(false);
  const [hostIp, setHostIp] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { serviceId: pathServiceId } = useParams();
  const serviceParam = searchParams.get('service') || pathServiceId;
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    fetchHostIp().then((ip) => {
      if (ip) setHostIp(ip);
    });
  }, []);

  useEffect(() => {
    client.get('/queue/services')
      .then((res) => setServices(res.data))
      .catch((err) => {
        console.error('Failed to load services:', err);
      });
  }, []);

  async function handleJoin(serviceId) {
    if (!user) {
      try {
        sessionStorage.setItem('pending_join_service', String(serviceId));
      } catch (e) {
        // ignore
      }
      navigate(`/login?service=${serviceId}`);
      return;
    }

    setError('');
    setJoining(true);
    try {
      const { data } = await client.post('/queue/join', { serviceId: Number(serviceId) });
      navigate(`/board/${serviceId}?token=${data.tokenId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not join this queue');
      setJoining(false);
    }
  }

  useEffect(() => {
    if (serviceParam && !autoJoinAttempted.current) {
      if (!user) {
        try {
          sessionStorage.setItem('pending_join_service', serviceParam);
        } catch (e) {
          // ignore
        }
        navigate(`/login?service=${serviceParam}`, { replace: true });
        return;
      }
      autoJoinAttempted.current = true;
      handleJoin(serviceParam);
    }
  }, [serviceParam, user]);

  const joinBaseUrl = getJoinBaseUrl(hostIp);

  function handleCopy(text) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <p className="label-eyebrow mb-2">Available now</p>
      <h1 className="font-mono text-2xl mb-8">Pick a service</h1>

      {!user && (
        <div className="border border-white/20 bg-white/5 p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="label-eyebrow text-amber mb-1">Campus Kiosk Mode</p>
            <p className="text-offwhite text-sm">Scan any QR code below with your mobile phone camera to join that queue instantly.</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="border border-white/20 text-slate hover:text-offwhite hover:border-amber px-3 py-1.5 text-xs font-mono transition-colors self-start sm:self-auto shrink-0"
          >
            Log in on this device
          </button>
        </div>
      )}

      {joining && (
        <div className="border border-amber bg-amber/10 p-4 mb-6">
          <p className="label-eyebrow mb-1">Remote Join</p>
          <div className="flex items-center justify-between">
            <p className="font-mono text-amber text-lg">
              Joining Queue #{serviceParam}...
            </p>
            <span className="font-mono text-xs text-slate animate-pulse">Assigning token</span>
          </div>
        </div>
      )}

      {error && <p className="text-skipped text-sm mb-4 font-mono">{error}</p>}

      <div>
        {services.map((s) => {
          const joinUrl = `${joinBaseUrl}/join?service=${s.id}`;
          return (
            <div key={s.id} className="board-row">
              <div className="pr-2">
                <div className="flex items-center gap-2">
                  <span className="board-number text-amber text-sm">#{s.id}</span>
                  <p className="text-offwhite font-medium">{s.name}</p>
                </div>
                {s.description && <p className="text-slate text-sm mt-0.5">{s.description}</p>}
              </div>

              <div className="flex items-center gap-4 sm:gap-6">
                <span className="text-slate text-sm font-mono whitespace-nowrap">
                  <span className="board-number text-sm text-offwhite">{s.currentQueueLength}</span> waiting
                </span>
                <button
                  onClick={() => handleJoin(s.id)}
                  disabled={joining}
                  className="border border-amber text-amber px-4 py-1.5 text-sm hover:bg-amber hover:text-navy transition-colors font-mono disabled:opacity-50"
                >
                  Join queue
                </button>

                <div
                  className="flex items-center gap-2 pl-3 border-l border-white/10 cursor-pointer group"
                  onClick={() =>
                    setActiveModalQR({
                      id: s.id,
                      name: s.name,
                      url: joinUrl
                    })
                  }
                  title="Scan with mobile camera or click to enlarge"
                >
                  <div
                    className="p-1 bg-white border border-white/20 group-hover:border-amber transition-colors"
                    style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}
                  >
                    <QRCodeCanvas
                      value={joinUrl}
                      size={48}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                      marginSize={1}
                      style={{ display: 'block' }}
                    />
                  </div>
                  <div className="hidden sm:flex flex-col text-[10px] font-mono text-slate leading-none">
                    <span className="text-amber font-semibold">QR</span>
                    <span className="mt-1">JOIN</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {services.length === 0 && <p className="text-slate">No active services right now.</p>}
      </div>

      {/* Departure-Board Styled Enlarged QR Modal */}
      {activeModalQR && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setActiveModalQR(null)}
        >
          <div
            className="bg-navy border border-amber p-6 max-w-sm w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="label-eyebrow mb-1">Remote Join QR</p>
                <h2 className="font-mono text-xl text-offwhite">{activeModalQR.name}</h2>
                <p className="text-slate text-xs font-mono mt-1">Queue #{activeModalQR.id}</p>
              </div>
              <button
                onClick={() => setActiveModalQR(null)}
                className="text-slate hover:text-offwhite font-mono text-lg px-2 py-0.5 border border-white/20 hover:border-white/40 leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center my-6">
              <div
                className="p-3 bg-white border border-amber"
                style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}
              >
                <QRCodeCanvas
                  value={activeModalQR.url}
                  size={200}
                  level="H"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  marginSize={2}
                  style={{ display: 'block' }}
                />
              </div>
            </div>

            <p className="text-slate text-xs font-mono mb-3 text-center">
              Scan with phone camera to join queue remotely
            </p>

            <div className="border border-white/10 bg-black/40 px-3 py-2 text-xs font-mono text-slate break-all mb-3 select-all">
              {activeModalQR.url}
            </div>

            {hostIp && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <p className="text-[11px] text-amber font-mono text-center mb-4">
                Mobile-ready: Encoded with LAN IP ({hostIp})
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(activeModalQR.url)}
                className="flex-1 border border-white/20 text-offwhite hover:border-amber hover:text-amber py-2 text-xs font-mono transition-colors"
              >
                {copied ? 'Link Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => {
                  const targetId = activeModalQR.id;
                  setActiveModalQR(null);
                  handleJoin(targetId);
                }}
                className="flex-1 bg-amber text-navy font-mono text-xs py-2 hover:opacity-90 font-medium transition-opacity"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
