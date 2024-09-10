import { useEffect, useRef, useState } from "react";
import "./index.css";
import MicNoneIcon from "@mui/icons-material/MicNone";
import MicOffIcon from "@mui/icons-material/MicOff";

function Room() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const websocket = new WebSocket("ws://localhost:8000");
  console.log(localVideoRef, remoteVideoRef);
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  async function localCamAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing local camera:", error);
    }
  }

  async function handleCreateOffer(pc: RTCPeerConnection) {
    try {
      console.log("Creating offer....");
      pc.onnegotiationneeded = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const event = JSON.stringify({
          type: "createAnswer",
          sdp: offer,
        });
        websocket.send(event);
      };
      pc.onicecandidate = (iceCandidate) => {
        const event = JSON.stringify({
          type: "iceCandidate",
          candidate: iceCandidate.candidate,
        });
        websocket.send(event);
      };
      // for sending tracks
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach((track) => {
        pc?.addTrack(track);
      });
      // for recieveing tracks
      pc.ontrack = async (event) => {
        console.log("Got tracks", remoteVideoRef.current);
        const videoStream = new MediaStream();
        const audioStream = new MediaStream();

        const { track } = event;
        if (track.kind === "video") {
          videoStream.addTrack(track);
          // Handle video stream
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = videoStream;
            await remoteVideoRef.current.play();
          }
        } else if (track.kind === "audio") {
          audioStream.addTrack(track);

          // Handle audio stream
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = audioStream;
            await remoteAudioRef.current.play();
          }
        }
      };
    } catch (error: any) {
      console.log("Error while handling create offer", error.message);
    }
  }

  async function handleCreateAnswer(sdp: any) {
    try {
      console.log("Creating answer....", sdp);
      pc.onnegotiationneeded = async () => {
        await pc.setRemoteDescription(sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const event = JSON.stringify({
          type: "answerCreated",
          sdp: answer,
        });
        websocket.send(event);
      };
      pc.onicecandidate = (iceCandidate) => {
        const event = JSON.stringify({
          type: "iceCandidate",
          candidate: iceCandidate.candidate,
        });
        websocket.send(event);
      };
      // for sending tracks
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      stream.getTracks().forEach((track) => {
        pc?.addTrack(track);
      });
      // for recieveing tracks
      pc.ontrack = async (event) => {
        console.log("Got tracks", remoteVideoRef.current);
        const videoStream = new MediaStream();
        const audioStream = new MediaStream();

        const { track } = event;
        if (track.kind === "video") {
          videoStream.addTrack(track);
          // Handle video stream
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = videoStream;
            await remoteVideoRef.current.play();
          }
        } else if (track.kind === "audio") {
          audioStream.addTrack(track);

          // Handle audio stream
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = audioStream;
            await remoteAudioRef.current.play();
          }
        }
      };
    } catch (err: any) {
      console.log("Error while creating answer", err.message);
    }
  }

  useEffect(() => {
    websocket.onopen = (event) => {
      websocket.send(
        JSON.stringify({
          type: "join",
        })
      );
    };
    //setWebSocket(ws);
    const eventConfig = async () => {
      await localCamAccess();
      websocket.onmessage = async (event: any) => {
        const data = JSON.parse(event.data);
        console.log("Got message =>", data);
        const type = data.type;

        switch (type) {
          case "createOffer":
            await handleCreateOffer(pc);
            break;
          case "createAnswer":
            await handleCreateAnswer(data.sdp);
            break;
          case "iceCandidate":
            console.log(data.candidate);
            await pc.addIceCandidate(data.candidate);
            break;
          case "answerCreated":
            console.log("Answer created event");
            await pc.setRemoteDescription(data.sdp);
            break;
        }
      };
    };
    eventConfig();
  }, []);

  function handleMicButton() {
    if (loc.current) {
      localAudioRef.current.muted = !localAudioRef.current.muted; // Toggle the mute state
      setIsMicOn(!isMicOn);
    }
  }

  return (
    <>
      <div className="video-wrapper">
        <div className="video-box">
          <video ref={localVideoRef} autoPlay muted></video>
        </div>
        <div className="video-box">
          {remoteVideoRef.current ? (
            <video ref={remoteVideoRef} autoPlay></video>
          ) : (
            <video
              className="placeholder"
              ref={remoteVideoRef}
              autoPlay
            ></video>
          )}
          <audio ref={remoteAudioRef} autoPlay />
        </div>
      </div>
      {/* <div className="input-container">
        <div className="mic-container" onClick={handleMicButton}>
          {isMicOn ? (
            <MicNoneIcon color={"action"} fontSize="large" />
          ) : (
            <MicOffIcon color={"action"} fontSize="large" />
          )}
        </div>
      </div> */}
    </>
  );
}

export default Room;
