import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL && import.meta.env.VITE_SOCKET_URL !== '/')
  ? import.meta.env.VITE_SOCKET_URL
  : undefined;

// Subscribes to live updates for one service's queue. Returns the current
// waiting list plus the most recent "called" and "skipped" events so a page
// can flash/notify on them.
export function useQueueSocket(serviceId) {
  const socketRef = useRef(null);
  const [waiting, setWaiting] = useState([]);
  const [lastCalled, setLastCalled] = useState(null);
  const [lastSkipped, setLastSkipped] = useState(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setWaiting([]);
    setLastCalled(null);
    setLastSkipped(null);
    setPaused(false);
    if (!serviceId) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.emit('watchService', serviceId);

    socket.on('queueUpdate', (payload) => {
      if (payload.serviceId === Number(serviceId)) setWaiting(payload.waiting);
    });
    socket.on('tokenCalled', (payload) => setLastCalled(payload));
    socket.on('tokenCompleted', () => setLastCalled(null));
    socket.on('tokenSkipped', (payload) => {
      setLastSkipped(payload);
      setLastCalled((prev) => (prev && prev.tokenId === payload.tokenId ? null : prev));
    });
    socket.on('queuePauseChanged', (payload) => {
      if (payload.serviceId === Number(serviceId)) setPaused(payload.paused);
    });

    return () => {
      socket.emit('unwatchService', serviceId);
      socket.disconnect();
    };
  }, [serviceId]);

  return { waiting, lastCalled, lastSkipped, paused };
}
