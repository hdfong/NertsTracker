const express = require("express");
const socket = require("socket.io");

// App setup
const app = express();

// Init Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
app.get("/", (req, res) => res.send("API Running"));

// Define Routes
app.use("/api/lobby", require("./api/lobby"));

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => console.log("listening on port 5000"));

// Static files
// app.use(express.static("client/public"));

// Global variable storing room data
var gameRooms = {};

// Global variable storing socket_id and name parings
var socketIds = {};

const io = socket(server);

// Listen for responses from clients
io.on("connection", (socket) => {
  console.log(socket.id, "conncted");

  // For hosts to create a new game
  socket.on("create_game", (data) => {
    gameRooms[data.room] = data.contents;
    socketIds[socket.id] = {
      room: data.room,
      name: data.name
    };
    socket.join(data.room)
  });

  // For non-hosts to join during any point in the game
  socket.on("join_game", (data) => {
    const { name, room } = data;
    socketIds[socket.id] = {
      room: data.room,
      name: data.name
    };
    ++gameRooms[room].connected_players;
    // Create new player if not in game
    if (!gameRooms[room].players.hasOwnProperty(name)) {
      gameRooms[room].players[name] = {
        scores: [],
        connected: true,
        total_score: 0,
      };
    }

    // Fill in missing score points with 0's if joined later in game
    const scoreLength = gameRooms[room].players[name].scores.length;
    const round = gameRooms[room].round;
    for (i = scoreLength; i < round; ++i) {
      gameRooms[room].players[name].scores.push(0);
    }
    
    socket.join(room);
  });

  socket.on("start_game", ({room}) => {
    io.to(room).emit("round_1", {});
  });

  // Cleanup on disconnects
  socket.on("disconnect", function () {
    console.log(socket.id, " disconncted");
    if (socketIds.hasOwnProperty(socket.id)){
      const room = socketIds[socket.id].room;
      const name = socketIds[socket.id].name;
      if(--gameRooms[room].connected_players <= 0){
        delete gameRooms[room];
      } else{
        gameRooms[room].players[name].connected = false;
      }

      delete socketIds[socket.id]
    }
  });
});

// Generate a random code id
// const generateid = (length) => {
//   var results = "";
//   var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
//   for (var i = 0; i < length; i++) {
//     results += characters.charAt(Math.floor(Math.random() * characters.length));
//   }
//   return results;
// };

exports.gameRooms = gameRooms;
