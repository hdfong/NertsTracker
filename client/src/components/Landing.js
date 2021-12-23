import React, { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";

import InputGroup from "react-bootstrap/InputGroup";
import FormControl from "react-bootstrap/FormControl";
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
  }, [url]);
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
  const [score, setScore] = useState(0);
  const [ready, setReady] = useState(false);
  const [scoreBoard, setScoreBoard] = useState([]);
  const [disabled, setDisabled] = useState(true);
  const [goal, setGoal] = useState(50);
  // const [bonus, setBonus] = useState(0);
  const [winners, setWinners] = useState([]);
  const [max, setMax] = useState(0);

  useEffect(() => {
    if (socket) {
      socket.on("next_round", ({sb}) => {
        setReady(false);
        setScore(0);
        setScoreBoard(sb);
        console.log(scoreBoard);
        console.log("success");
        setGameState("wait_score");
        setDisabled(true);
      });
      socket.on("next_round_ready", () => {
        setDisabled(false);
        console.log("should work now hopefully")
      });
      socket.on("unready", () => {
        setDisabled(true);
      });
      socket.on("up_to_date", ({gstate}) =>{ 
        setGameState(gstate);
      });
      socket.on("ping", (data) => {
        socket.emit("pong", {beat:1});
      });
      socket.on("end_game", ({winners,max}) => {
        setGameState("victory_screen");
        setWinners(winners);
        setMax(max);
      });
    }
  }, [socket,scoreBoard]);

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

  const handleScore = (e) => {
    setScore(e.target.value);
  };

  const handleGoal = (e) => {
    setGoal(e.target.value);
  }

  // const handleBonus = (e) => {
  //   setBonus(e.target.value);
  // }

  const handleJoin = async ({ isHost }) => {
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
          createGame();
          changeGameState("setup");
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

  const createGame = () => {
    const data = {
      room: room,
      contents: {
        host: null,
        round: 0,
        connected_players: 1,
        players: {},
        ready: 0,
        game_state: gameState
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
    socket.emit("start_game", {room,goal})
  }

  const submitScore = () => {
    setReady(true);
    socket.emit("ready",{room,name,score});
  }

  const changeScore = () => {
    socket.emit("unready",{room,name,score});
    setReady(false);
  }

  const finalizeScores = () => {
    socket.emit("next_round",{room});
  }

  const changeGameState = (state) => {
    setGameState(state);
    socket.emit("change_game_state",{room,gameState});
  }

  const resetGame = () => {
    socket.emit("reset_game", {room});
  }


  if (gameState === "connecting") {
    return (
      <div className="lobby">
        <div className="inputs">
          <InputGroup className="name-code">
            <InputGroup.Text>Name</InputGroup.Text>
            <FormControl 
              placeholder="Username"
              onChange={handleName}
              />
          </InputGroup>
          <InputGroup className="name-code">
            <InputGroup.Text>Room</InputGroup.Text>
            <FormControl 
              maxLength="4"
              placeholder="Code"
              onChange={handleCode}
              />
          </InputGroup>
        </div>
  
        <div className="button-container"> 
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleJoin({ isHost: true });
            }}
          >
            Host
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleJoin({ isHost: false });
            }}
          >
            Join
          </Button>
        </div>

        <small className="error">{nameError}</small>
        <small className="error">{roomError}</small>
      </div>
    );
  } else if (gameState === "setup") {
    if (host) {
      return (
        <div className="host-setup">
          <div className="left">
            <div className="welcome">
              <h2>Hello {name}, you are the host.</h2>
              <h2>Begin when everyone has joined.</h2>
            </div>
            <div className="button-container">
              <Button onClick={startGame}>Begin</Button>
            </div>
          </div>
          <div className="right">
            <InputGroup className="settings">
              <InputGroup.Text>Score goal</InputGroup.Text>
              <FormControl 
                type="number"
                placeholder="50"
                onChange={handleGoal}
                />
              {/* <InputGroup.Text>Nerts bonus</InputGroup.Text>
              <FormControl 
                type="number"
                placeholder="0"
                onChange={handleBonus}
                /> */}
            </InputGroup>
          </div>
        </div>
      );
    } else {
      return (
        <div className="normal-setup">
         <h2>Hello {name}.</h2>
         <h2>Waiting for people to join and host to begin.</h2>
        </div>
      )
    }
  } else if (gameState === "wait_score") {
    if (!ready){
      return (
        <div>
          <div className="inputs">
            <InputGroup className="score">
              <InputGroup.Text>Score</InputGroup.Text>
              <FormControl
                type="number"
                pattern="[0-9]+"
                placeholder="0"
                onChange={handleScore}
                visability={host}
              />
            </InputGroup>
          </div>
          <div className="button-container">
            <Button onClick={submitScore}>Submit</Button>
          </div>
          <div className="scores">
            {scoreBoard.map((player) => (
                <h2 key={player.name}>{player.name}: {player.score}</h2>
            ))}
          </div>
        </div>
      )
    } else{
      if (host){
        return(
          <div>
            <div className="inputs">
              <h2>{score}</h2>
            </div>
            <div className="button-container">
              <Button onClick={changeScore}>Edit Score</Button>
              <Button disabled={disabled} onClick={finalizeScores}>Next Round</Button>
            </div>
            <div className="scores">
              {scoreBoard.map((player) => (
                  <h2>{player.name}: {player.score}</h2>
              ))}
            </div>
          </div>
        )
      } else {
        return(
          <div>
            <div className="inputs">
              <h2>{score}</h2>
            </div>
            <div className="button-container">
              <Button onClick={changeScore}>Edit Score</Button>
            </div>
            <div className="scores">
              {scoreBoard.map((player) => (
                  <h2>{player.name}: {player.score}</h2>
              ))}
            </div>
          </div>
        )
      }
      
    }
  } else if (gameState === "victory_screen"){
    if (host){
      return(
        <div>
          <div className="results">
            <h2>Congratulations!</h2>
            {winners.map((player) => (
              <h1>{player}</h1>
            ))}
            <h2>Won with the score of {max}!</h2>
          </div>
          <div className="button-container">
            <Button onClick={resetGame}>New Game</Button>
          </div>
        </div>
      )
    } else{
      return(
        <div>
          <div className="results">
            <h2>Congratulations!</h2>
            {winners.map((player) => (
              <h1>{player}</h1>
            ))}
            <h2>Won with the score of {max}!</h2>
          </div>
        </div>
      )
    }
  }
};

export default Landing;
