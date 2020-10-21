const express = require("express");
const router = express.Router();

const server = require("../server");

// @route   GET validGameRoom/:gameRoom
// @desc    Checks if game room is valid
// @access  Public
router.get("/validGameRoom/:room/:name", async (req, res) => {
  try {
    const {room,name} = req.params;

    let data = {
      existing_room: server.gameRooms.hasOwnProperty(room),
      existing_name: false,
      connected: false
    };
    if (data.existing_room){
      data.existing_name = server.gameRooms[room].players.hasOwnProperty(name);
      if(data.existing_name){
        data.connected = server.gameRooms[room].players[name].connected;
      }
    }
    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
