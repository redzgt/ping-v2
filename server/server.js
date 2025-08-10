const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { nanoid } = require("nanoid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();

app.get("/", (req, res) => res.send("Server running"));

app.get("/api/create-room", (req, res) => {
  const roomId = nanoid(8);
  rooms.set(roomId, new Set());
  res.json({ roomId });
});

io.on("connection", socket => {
  socket.on("join-room", ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb({ error: "Room not found" });
    room.add(socket.id);
    socket.join(roomId);

    socket.to(roomId).emit("peer-joined", { peerId: socket.id });
    const otherPeers = Array.from(room).filter(id => id !== socket.id);
    cb({ peers: otherPeers });
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("disconnect", () => {
    rooms.forEach((set, roomId) => {
      if (set.delete(socket.id)) {
        socket.to(roomId).emit("peer-left", { peerId: socket.id });
        if (set.size === 0) rooms.delete(roomId);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on ${PORT}`));
