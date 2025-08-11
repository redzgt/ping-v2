const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",  // Allow all origins for testing, tighten later
    methods: ["GET", "POST"],
  }
});

app.get("/api/create-room", (req, res) => {
  const roomId = nanoid(10);
  res.json({ roomId });
});

const rooms = {}; // roomId -> Set of socketIds

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(socket.id);

    // Send to joining client the list of other clients in room
    const otherClients = Array.from(rooms[roomId]).filter(id => id !== socket.id);
    socket.emit("room-joined", { peers: otherClients });

    // Notify others that a new peer joined
    socket.to(roomId).emit("peer-joined", { peerId: socket.id });
  });

  socket.on("signal", ({ to, data }) => {
    // Relay signaling data to the intended peer
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("disconnecting", () => {
    const roomsJoined = socket.rooms;
    for (const roomId of roomsJoined) {
      if (rooms[roomId]) {
        rooms[roomId].delete(socket.id);
        socket.to(roomId).emit("peer-left", { peerId: socket.id });
        if (rooms[roomId].size === 0) {
          delete rooms[roomId];
        }
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
