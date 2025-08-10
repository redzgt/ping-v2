const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// Enable CORS for your client
app.use(cors({
  origin: "https://ping-v2.onrender.com", // your client URL
  methods: ["GET", "POST"],
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://ping-v2.onrender.com",
    methods: ["GET", "POST"]
  }
});

app.get("/api/create-room", (req, res) => {
  const roomId = nanoid(10);
  res.json({ roomId });
});

io.on("connection", (socket) => {
  console.log("A user connected: " + socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    // Notify other peers in the room
    socket.to(roomId).emit("peer-joined", { peerId: socket.id });

    // Send existing peers in the room to the joining client
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const otherPeers = clients.filter(id => id !== socket.id);
    socket.emit("room-joined", { peers: otherPeers });
  });

  // Relay signaling data
  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("disconnecting", () => {
    // Inform others that this peer is leaving
    socket.rooms.forEach(roomId => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("peer-left", { peerId: socket.id });
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected: " + socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
