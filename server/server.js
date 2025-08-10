const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// Enable CORS for your client
app.use(cors({
  origin: "https://ping-v2.onrender.com", // change if your client URL is different
  methods: ["GET", "POST"],
  credentials: true
}));

// Create HTTP server for socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://ping-v2.onrender.com",
    methods: ["GET", "POST"]
  }
});

// API endpoint to create a room
app.get("/api/create-room", (req, res) => {
  const roomId = nanoid(10);
  res.json({ roomId });
});

// Socket.io events
io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
