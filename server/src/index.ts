import WebSocket from "ws";
import Queue from "./queue";

const wss = new WebSocket.Server({ port: 8000 }, () => {
  console.log("Websocket server running port 8000");
});
const queue = new Queue<WebSocket>();
const map: Map<WebSocket, WebSocket> = new Map<WebSocket, WebSocket>();
let counter = 0;
const set: Set<WebSocket> = new Set();
wss.on("connection", (ws) => {
  ws.on("message", (data: any) => {
    const message = JSON.parse(data);
    console.log("Got message from client ");
    const { type } = message;
    switch (type) {
      case "join":
        console.log("Join event invoked");
        handleJoinEvent(ws);
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
    }
  });
  ws.on("error", (err) => {
    console.log("Error => ", err);
  });
});

function handleJoinEvent(ws: WebSocket) {
  try {
    if (queue.size() > 0) {
      queue.size();
      const client1 = queue.pop();
      if (!client1) {
        if (!set.has(ws)) queue.push(ws);
        set.add(ws);
        return;
      }
      set.delete(client1);
      if (client1 == ws) {
        return;
      }
      const client2 = ws;
      console.log("Matched the Pair");
      const event = JSON.stringify({
        type: "createOffer",
      });
      client1.send(event);
      // console.log(client1);
      map.set(client1, client2);
      map.set(client2, client1);
    } else {
      if (!set.has(ws)) queue.push(ws);
      set.add(ws);
    }
  } catch (err: any) {
    console.log("Error in handleJoin function ", err.message);
  }
}

function handleCreateAnswerEvent(ws: WebSocket, data: any) {
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
