const express = require("express");
const socket = require("socket.io");
const path = require("path");

// App setup
const app = express();

// Init Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// Define Routes
app.use("/api/lobby", require("./api/lobby"));

// Serve static assets in production
if(process.env.NODE_ENV === 'production'){
  // Set static folder
  app.use(express.static('client/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => console.log("listening on port 5000"));

// Static files
// app.use(express.static("client/public"));

// Global variable storing room data
var gameRooms = {};

// Global variable storing socket_id and name parings
var socketIds = {};

const io = socket(server);

// Heartbeat function to keep sockets from disconnected after being idle
function sendHeartbeat(){
  io.sockets.emit("ping", {beat : 1});
  setTimeout(sendHeartbeat, 8000);
}

setTimeout(sendHeartbeat, 8000);

// Listen for responses from clients
io.on("connection", (socket) => {
  console.log(socket.id, "conncted");
  // Response for heartbeat
  socket.on("pong", (data) =>{});

  // For hosts to create a new game
  socket.on("create_game", (data) => {
    gameRooms[data.room] = data.contents;
    gameRooms[data.room].host = socket.id;
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
    } else{
      gameRooms[room].players[name].connected = true;
    }

    // Fill in missing score points with 0's if joined later in game
    const scoreLength = gameRooms[room].players[name].scores.length;
    const round = gameRooms[room].round;
    for (i = scoreLength; i < round; ++i) {
      gameRooms[room].players[name].scores.push(0);
    }
    if(gameRooms[room].round>0){
      socket.emit("up_to_date", {gstate:gameRooms[room].game_state});
    }
    socket.join(room);
  });

  socket.on("start_game", ({room,goal}) => {
    console.log("start game for room", room)
    console.log(gameRooms[room].players);
    gameRooms[room].goal = goal;
    gameRooms[room].round += 1;
    const sb = [];
    for(const player in gameRooms[room].players){
      sb.push({name: player,score: gameRooms[room].players[player].total_score})
    }
    io.to(room).emit("next_round", {sb});
    gameRooms[room].game_state = "wait_score";
  });

  socket.on("next_round", ({room}) => {
    let end = false;
    const sb = [];
    for(const player in gameRooms[room].players){
      sb.push({name: player,score: gameRooms[room].players[player].total_score})
      if(gameRooms[room].players[player].total_score >= gameRooms[room].goal) end = true;
    }
    if (!end){
      io.to(room).emit("next_round", {sb});
      gameRooms[room].game_state = "wait_score";
    } else {
      let winners = [];
      let max = 0;
      for(const pair of sb){
        console.log(pair);
        max = Math.max(pair.score, max);
      }
      for(const pair of sb){
        if(pair.score == max) winners.push(pair.name);
      }
      io.to(room).emit("end_game", {winners, max});
      gameRooms[room].game_state = "victory_screen";
    }
    
  });

  socket.on("ready", ({room,name,score}) => {
    let num = Number(score);
    gameRooms[room].players[name].scores.push(num);
    gameRooms[room].players[name].total_score += num;
    gameRooms[room].ready += 1;
    console.log(gameRooms[room].players[name]);
    if (gameRooms[room].ready >= gameRooms[room].connected_players){
      gameRooms[room].round += 1;
      gameRooms[room].ready = 0;

      io.to(gameRooms[room].host).emit("next_round_ready");
    }
  })

  socket.on("reset_game", ({room}) => {
    for (const player in gameRooms[room].players){
      gameRooms[room].players[player] = {scores: [], connected:gameRooms[room].players[player].connected, total_score: 0};
    }
    gameRooms[room].ready = 0;
    gameRooms[room].round = 0;
    io.to(room).emit("up_to_date", {gstate:"setup"});
  })

  socket.on("unready", ({room,name,score}) => {
    io.to(gameRooms[room].host).emit("unready");
    let num = Number(score);
    gameRooms[room].ready -= 1;
    gameRooms[room].players[name].scores.pop();
    gameRooms[room].players[name].total_score -= num;
  })

  socket.on("change_game_state", ({room,gameState}) => {
    gameRooms[room].game_state = gameState;
  })

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
