const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const queueRoutes = require('./routes/queueRoutes');
const staffRoutes = require('./routes/staffRoutes');

const os = require('os');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/network-ip', (req, res) => {
  const nets = os.networkInterfaces();
  let ip = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ip = net.address;
        break;
      }
    }
  }
  res.json({ ip });
});

app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/staff', staffRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;
