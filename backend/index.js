const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

let agents = {};

io.on('connection', socket => {
  console.log('Agent connected:', socket.id);

  socket.on('register_agent', (agentId) => {
    agents[agentId] = socket;
    console.log(`Agent registered: ${agentId}`);
  });

  socket.on('command_output', ({ agentId, output }) => {
    console.log(`Output from ${agentId}:`, output);
  });

  socket.on('disconnect', () => {
    console.log('Agent disconnected:', socket.id);
    for (let [id, s] of Object.entries(agents)) {
      if (s.id === socket.id) {
        delete agents[id];
        break;
      }
    }
  });
});

app.use(express.json());

// HTTP endpoint to send command
app.post('/send-command', (req, res) => {
  const { agentId, command } = req.body;
  const agentSocket = agents[agentId];
  if (agentSocket) {
    agentSocket.emit('run_command', command);
    res.send({ status: 'Sent' });
  } else {
    res.status(404).send({ error: 'Agent not found' });
  }
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
