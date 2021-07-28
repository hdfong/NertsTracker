import React, { useState, useEffect } from "react";
import { withRouter } from "react-router";
import io from "socket.io-client";

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

const Lobby = (props) => {
  const socket = useSocket("http://localhost:5000");
  const [roomId, setRoomId] = useState("default");
  const [name, setName] = useState("");

  useEffect(() => {
    setName(props.location.state.name);
    if (socket) {
      if (roomId === "default" && props.location.state.isHost) {
        socket.emit("create_room", {});

        socket.on("new_room", (data) => {
          console.log(data.room_id);
          setRoomId(data.room_id);
        });
      }
      socket.on("refresh_scores", (data) => {});
    }
  }, [socket]);

  if (!props.location.state.isHost) {
    return (
      <div>
        <h1>joined</h1>
      </div>
    );
  } else
    return (
      <div>
        <h1>{roomId + name}</h1>
      </div>
    );
};

export default withRouter(Lobby);
