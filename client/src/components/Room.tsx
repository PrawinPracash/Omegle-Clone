import { useEffect, useRef, useState } from "react";
import "./index.css";
import MicNoneIcon from "@mui/icons-material/MicNone";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
function Room() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const websocket = new WebSocket("ws://localhost:8000");
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  async function localCamAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Check if the video element reference is valid
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }

      // Save the stream state to use later (e.g., for stopping tracks)
      setLocalStream(stream);
    } catch (error: any) {
      // Handle specific error cases
      if (error.name === "NotAllowedError") {
        console.error(
          "Permission denied: Camera and microphone access are required."
        );
      } else if (error.name === "NotFoundError") {
        console.error("No camera or microphone found on this device.");
      } else if (error.name === "OverconstrainedError") {
        console.error("No media devices meet the specified constraints.");
      } else {
        console.error("Error accessing local camera:", error);
      }
    }
  }

  async function handleCreateOffer(pc: RTCPeerConnection) {
    try {
      console.log("Creating offer....");
      pc.onnegotiationneeded = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("Calling create answer event");
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
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }
      setLocalStream(stream);
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
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }
      setLocalStream(stream);
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
    const handleBeforeUnload = (event: any) => {
      console.log(remoteVideoRef.current)
      websocket.send(
        JSON.stringify({
          type: "userLeft",
        })
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    websocket.onopen = (event) => {
      websocket.send(
        JSON.stringify({
          type: "join",
        })
      );
    };
    const eventConfig = async () => {
      await localCamAccess();
      websocket.onmessage = async (event: any) => {
        const data = JSON.parse(event.data);
        console.log("Got message =>", data);
        const type = data.type;
        switch (type) {
          case "createOffer":
            console.log("createOffer event");
            await handleCreateOffer(pc);
            break;
          case "createAnswer":
            console.log("createAnswer event");
            await handleCreateAnswer(data.sdp);
            break;
          case "iceCandidate":
            if (pc.remoteDescription) await pc.addIceCandidate(data.candidate);
            break;
          case "answerCreated":
            console.log("Answer created event");
            await pc.setRemoteDescription(data.sdp);
            break;
        }
      };
    };
    eventConfig();
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  async function handleMicButton() {
    if (!localStream) return;
    const duplicateStream = localStream;
    if (!isMicOn) {
      duplicateStream.getAudioTracks()[0].enabled = true;
    } else {
      duplicateStream.getAudioTracks()[0].enabled = false;
    }
    setLocalStream(duplicateStream);
    setIsMicOn(!isMicOn);
  }
  async function handleVideoButton() {
    if (!localStream) return;
    const duplicateStream = localStream;
    if (!isVideoOn) {
      duplicateStream.getVideoTracks()[0].enabled = true;
    } else {
      duplicateStream.getVideoTracks()[0].enabled = false;
    }
    setLocalStream(duplicateStream);
    setIsVideoOn(!isVideoOn);
  }

  return (
    <>
      <div className="video-wrapper">
        <div className="video-box">
          <video ref={localVideoRef} autoPlay muted></video>
        </div>
        <div className="video-box">
          {remoteVideoRef?.current?.srcObject ? (
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
      <div className="input-container">
        <div className="mic-container" onClick={handleMicButton}>
          {isMicOn ? (
            <MicNoneIcon color={"action"} fontSize="large" />
          ) : (
            <MicOffIcon color={"action"} fontSize="large" />
          )}
        </div>
        <div className="mic-container" onClick={handleVideoButton}>
          {isVideoOn ? (
            <VideocamIcon color={"action"} fontSize="large" />
          ) : (
            <VideocamOffIcon color={"action"} fontSize="large" />
          )}
        </div>
      </div>
    </>
  );
}

export default Room;
