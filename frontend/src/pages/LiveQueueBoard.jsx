import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import client from '../api/client';
import { useQueueSocket } from '../hooks/useSocket';
import TokenRow from '../components/TokenRow';
import { fetchHostIp, getJoinBaseUrl } from '../utils/network';

function formatSeconds(secs) {
  if (secs == null) return '—';
  const mins = Math.round(secs / 60);
  return mins <= 0 ? 'Any moment now' : `~${mins} min`;
}

export default function LiveQueueBoard() {
  const { serviceId } = useParams();
  const [searchParams] = useSearchParams();
  const myTokenId = searchParams.get('token');

  const { waiting, lastCalled, lastSkipped, paused } = useQueueSocket(serviceId);
  const [myStatus, setMyStatus] = useState(null);
  const [wasCalled, setWasCalled] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hostIp, setHostIp] = useState(null);

  useEffect(() => {
    fetchHostIp().then((ip) => {
      if (ip) setHostIp(ip);
    });
  }, []);

  const joinBaseUrl = getJoinBaseUrl(hostIp);
  const joinUrl = `${joinBaseUrl}/join?service=${serviceId}`;

  useEffect(() => {
    client.get('/queue/services')
      .then((res) => {
        const match = res.data.find((s) => String(s.id) === String(serviceId));
        if (match) setServiceName(match.name);
      })
      .catch(() => {});
  }, [serviceId]);

  // Poll my own token's estimate periodically — the socket broadcast covers
  // everyone else moving, this covers my own predicted wait shrinking.
  useEffect(() => {
    if (!myTokenId) return;
    const fetchStatus = () =>
      client.get(`/queue/token/${myTokenId}`).then((res) => setMyStatus(res.data));
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [myTokenId]);

  useEffect(() => {
    if (lastCalled && String(lastCalled.tokenId) === String(myTokenId)) {
      setWasCalled(true);
    }
  }, [lastCalled, myTokenId]);

  async function cancelMyToken() {
    await client.post(`/queue/token/${myTokenId}/cancel`);
    setMyStatus(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
        <div>
          <p className="label-eyebrow mb-1">Live board</p>
          <h1 className="font-mono text-2xl text-offwhite">
            {serviceName ? `${serviceName} • Queue #${serviceId}` : `Queue #${serviceId}`}
          </h1>
          <p className="text-slate text-xs font-mono mt-1">Real-time status • Departure display</p>
        </div>

        <div
          onClick={() => setShowQrModal(true)}
          className="flex items-center gap-3 p-2 bg-navy border border-amber/40 hover:border-amber cursor-pointer transition-colors shrink-0 group"
          title="Click to enlarge QR code"
        >
          <div
            className="p-1 bg-white border border-white/20 group-hover:border-amber transition-colors"
            style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}
          >
            <QRCodeCanvas
              value={joinUrl}
              size={50}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#000000"
              marginSize={1}
              style={{ display: 'block' }}
            />
          </div>
          <div className="font-mono text-left">
            <span className="block text-[11px] text-amber font-semibold tracking-wider">SCAN TO JOIN</span>
            <span className="block text-[10px] text-slate mt-0.5">Mobile Check-in</span>
          </div>
        </div>
      </div>

      {/* Enlarged QR Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-navy border border-amber p-6 max-w-sm w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="label-eyebrow mb-1">Remote Join QR</p>
                <h2 className="font-mono text-xl text-offwhite">{serviceName || `Queue #${serviceId}`}</h2>
                <p className="text-slate text-xs font-mono mt-1">Queue #{serviceId}</p>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
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
                  value={joinUrl}
                  size={200}
                  level="H"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  marginSize={2}
                  style={{ display: 'block' }}
                />
              </div>
            </div>

            <div className="border border-white/10 p-2.5 mb-2 bg-white/5">
              <p className="text-[11px] font-mono text-slate break-all select-all">{joinUrl}</p>
            </div>

            {hostIp && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <p className="text-[10px] text-amber font-mono text-center mb-4">
                Mobile-ready: Encoded with LAN IP ({hostIp})
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(joinUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="flex-1 border border-white/20 hover:border-amber text-slate hover:text-amber py-2 text-xs font-mono transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="flex-1 bg-amber text-navy font-semibold py-2 text-xs font-mono hover:bg-amber/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {paused && <p className="text-skipped text-sm mb-4">This queue is currently paused by staff.</p>}

      {wasCalled && (
        <div className="border border-amber bg-amber/10 px-4 py-3 mb-8">
          <p className="text-amber font-mono">You're up — head to the counter now.</p>
        </div>
      )}

      {myStatus && myStatus.token.status === 'waiting' && !wasCalled && (
        <div className="border border-white/20 px-4 py-3 mb-8 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <p className="text-slate text-sm">Your token</p>
            <p className="board-number">#{myStatus.token.token_number}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-slate text-sm">{myStatus.peopleAhead} people ahead</p>
            <p className="text-amber">{formatSeconds(myStatus.estimatedSeconds)}</p>
          </div>
          <button
            onClick={cancelMyToken}
            className="text-slate text-sm border border-white/20 px-3 py-1.5 hover:border-skipped hover:text-skipped transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <p className="label-eyebrow mb-2">Now waiting</p>
      <div>
        {waiting.map((t, i) => (
          <TokenRow
            key={t.id}
            position={i + 1}
            tokenNumber={t.token_number}
            name={t.name}
            highlight={String(t.id) === String(myTokenId) && wasCalled}
          />
        ))}
        {waiting.length === 0 && <p className="text-slate py-4">Queue is empty.</p>}
      </div>
    </div>
  );
}
