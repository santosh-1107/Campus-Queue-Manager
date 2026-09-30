require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const initSocketEvents = require('./sockets/queueEvents');
const { attachIo, autoSkipNoShows } = require('./controllers/queueController');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

attachIo(io);
initSocketEvents(io);

// Sweep for no-show tokens every 30s. This is the "auto-skip" novel feature —
// a called token that's never claimed within NO_SHOW_GRACE_SECONDS gets
// auto-skipped so the queue never stalls on someone who wandered off.
setInterval(autoSkipNoShows, 30 * 1000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Campus Queue Manager backend running on port ${PORT}`);
});
