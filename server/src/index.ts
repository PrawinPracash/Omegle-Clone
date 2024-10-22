import WebSocket from "ws";
import Queue from "./queue";
import http from "http";
import express from "express";
const app = express();

// Example route
app.get("/health-check", (req, res) => {
  res.send("HTTP server is running with WebSocket support");
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const queue = new Queue<WebSocket>();
const map: Map<WebSocket, WebSocket> = new Map<WebSocket, WebSocket>();
const set: Set<WebSocket> = new Set();
wss.on("connection", (ws) => {
  ws.on("message", (data: any) => {
    const message = JSON.parse(data);
    const { type } = message;
    switch (type) {
      case "join":
        console.log("Join event invoked");
        handleJoinEvent(ws);
        break;
      case "userLeft":
        console.log("User left event invoked");
        handleUserLeftEvent(ws);
        break;
      case "createAnswer":
        console.log("createAnswer event invoked");
        handleCreateAnswerEvent(ws, message);
        break;
      case "answerCreated":
        console.log("answerCreated event invoked");
        handleAnswerCreatedEvent(ws, message);
        break;
      case "iceCandidate":
        console.log("iceCandidate event invoked");
        handleIceCandidateEvent(ws, message);
        break;
      default:
        console.log("Invalid event name", message);
    }
  });
  ws.on("error", (err) => {
    console.log("Error => ", err);
  });
});

function handleJoinEvent(ws: WebSocket) {
  try {
    if (queue.peek()) {
      const client1 = queue.pop();
      if (!client1) return;
      const client2 = ws;
      set.add(client2);
      console.log("Matched the Pair");
      const event = JSON.stringify({
        type: "createOffer",
      });
      client1.send(event);
      map.set(client1, client2);
      map.set(client2, client1);
    } else {
      queue.push(ws);
      set.add(ws);
    }
  } catch (err: any) {
    console.log("Error in handleJoin function ", err.message);
  }
}

function handleUserLeftEvent(ws: WebSocket) {
  try {
    if (queue.peek() == ws) {
      queue.pop();
    }
    set.delete(ws);
    const client2 = map.get(ws);
    if (client2 && set.has(client2)) {
      handleJoinEvent(client2);
    }
  } catch (err: any) {
    console.log("Error in handleIceCandidateEvent function ", err.message);
  }
}

async function handleCreateAnswerEvent(ws: WebSocket, data: any) {
  try {
    const { sdp } = data;
    const receiver = map.get(ws);
    if (!receiver) {
      console.log("No pair found for ", ws);
      return;
    }
    const event = JSON.stringify({
      type: "createAnswer",
      sdp,
    });
    console.log("Sending handleCreateAnswerEvent ");
    receiver.send(event);
    receiver.send(JSON.stringify({ msg: "hello" }));
  } catch (err: any) {
    console.log("Error in handleCreateAnswerEvent function ", err.message);
  }
}

function handleAnswerCreatedEvent(ws: WebSocket, data: any) {
  try {
    const { sdp } = data;
    const receiver = map.get(ws);
    if (!receiver) {
      console.log("No pair found for ", ws);
      return;
    }
    const event = JSON.stringify({
      type: "answerCreated",
      sdp,
    });
    receiver.send(event);
  } catch (err: any) {
    console.log("Error in handleAnswerCreatedEvent function ", err.message);
  }
}

function handleIceCandidateEvent(ws: WebSocket, data: any) {
  try {
    const { candidate } = data;
    const receiver = map.get(ws);
    if (!receiver) {
      console.log("No pair found for ", ws);
      return;
    }
    const event = JSON.stringify({
      type: "iceCandidate",
      candidate,
    });
    receiver.send(event);
  } catch (err: any) {
    console.log("Error in handleIceCandidateEvent function ", err.message);
  }
}

// async function smalldelay() {
//   await new Promise((resolve) => setTimeout(resolve, 100));
// }

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`HTTP and WebSocket server running on port ${PORT}`);
});
