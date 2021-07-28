import React, { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";

import Button from "react-bootstrap/Button";

const useSocket = (url) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketIo = io(url);

    setSocket(socketIo);

    function cleanup() {
      socketIo.disconnect();
    }
    return cleanup;
  }, []);
  return socket;
};

const Landing = () => {
  const socket = useSocket("http://localhost:5000");
  const [host, setHost] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [room, setRoom] = useState("");
  const [roomError, setRoomError] = useState("");
  const [gameState, setGameState] = useState("connecting");
  // connecting, setup, wait_score, after_score

  const handleName = (e) => {
    setName(e.target.value);
    setRoomError("");
    setNameError("");
  };

  const handleCode = (e) => {
    setRoom(e.target.value);
    setRoomError("");
    setNameError("");
  };

  const handleButton = async ({ isHost }) => {
    if (name === "") {
      setNameError("Please enter a name");
    } else if (room.length !== 4) {
      setRoomError("Please enter a valid room");
    } else {
      // getExistingRoom();
      const res = await axios.get(
        "http://localhost:5000/api/lobby/validGameRoom/" + room + "/" + name
      );
      var checks;
      if (res.data) {
        checks = res.data;
      }
      setHost(isHost);

      console.log(checks);
      if (isHost) {
        if (!checks.existing_room) {
          //console.log(host, room, name);
          setGameState("setup");
          createGame();
        } else {
          setRoomError(
            "This room already exists. Join this room or host a different one"
          );
        }
      } else {
        if (checks.existing_room) {
          if (!checks.existing_name) {
            setGameState("setup");
            joinGame();
          } else {
            if (checks.connected) {
              setNameError("This name is already connected.")
            } else {
              setGameState("setup");
              joinGame();
            }
          }
        } else {
          setRoomError(
            "This room does not exists. Host this room or join an existing one"
          );
        }
      }
    }
  };

  useEffect(() => {
    if (socket) {
      socket.on("hey", (data) => {
        console.log("Connection made");
      });
      socket.on("round_1", () => {
        setGameState("wait_score")
      })
    }
  }, [socket]);

  const createGame = () => {
    const data = {
      room: room,
      contents: {
        host: name,
        round: 0,
        connected_players: 1,
        players: {},
      },
      name: name,
    };
    data.contents.players[name] = {
      scores: [],
      connected: true,
      total_score: 0,
    };
    socket.emit("create_game", data);
  };

  const joinGame = () => {
    socket.emit("join_game", {
      name: name,
      room: room,
    });
  };

  const startGame = () => {
    socket.emit("start_game", { room })
  }


  if (gameState === "connecting") {
    return (
      <div>
        <input type='text' placeholder='Name' onChange={handleName} />
        <small>{nameError}</small>
        <input
          type='text'
          placeholder='4-digit Room Code'
          maxLength='4'
          onChange={handleCode}
        />
        <small>{roomError}</small>
        <div>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleButton({ isHost: true });
            }}
          >
            Host
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleButton({ isHost: false });
            }}
          >
            Join
          </Button>
        </div>
      </div>
    );
  } else if (gameState === "setup") {
    if (host) {
      return (
        <div>
          <h1>
            {room} {name}
          </h1>
          <Button onClick={startGame}>Begin</Button>
        </div>
      );
    } else {
      return (
        <div>
          <h1>
            {room} {name}
          </h1>
        </div>
      )
    }
  } else if (gameState === "wait_score") {
    return (
      <div>
        Waiting for scores
      </div>
    )
  }
};

export default Landing;
