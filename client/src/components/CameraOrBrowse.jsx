import React, { useState, useRef, useEffect } from "react";
import {
  FaCamera,
  FaUpload,
  FaSyncAlt,
  FaCheck,
  FaRedo,
  FaStop,
  FaExpand,
} from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
const CameraOrBrowse = ({ setIsUploading }) => {
  const [mediaStream, setMediaStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [status, setStatus] = useState("idle");
  const [isMobile, setIsMobile] = useState(false);
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const fileInputRef = useRef(null);

  // Check if mobile device
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  // Initialize camera when facing mode changes
  useEffect(() => {
    if (status === "ready" || status === "recording") {
      startCamera();
    }
  }, [cameraFacing]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    setStatus("loading");
    try {
      stopCamera(); // Stop any existing stream first

      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 480 : 720 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.error("Play error:", e));
      }

      setStatus("ready");
    } catch (error) {
      console.error("Camera error:", error);
      setStatus("error");
      alert(`Camera error: ${error.message}`);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  };

  // Start recording
  const startRecording = () => {
    if (!mediaStream) return;

    recordedChunks.current = [];

    // Try different mimeTypes for better compatibility
    const options = {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    };

    try {
      const recorder = new MediaRecorder(mediaStream, options);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, {
          type: recordedChunks.current[0]?.type || "video/webm",
        });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideo(videoUrl);
        setStatus("preview");

        // Auto-play the preview on mobile
        if (previewVideoRef.current && isMobile) {
          previewVideoRef.current
            .play()
            .catch((e) => console.log("Autoplay prevented:", e));
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setStatus("recording");
    } catch (error) {
      console.error("Recording error:", error);
      setStatus("error");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
    stopCamera();
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.includes("video")) {
      const videoUrl = URL.createObjectURL(file);
      setRecordedVideo(videoUrl);
      setStatus("preview");

      if (previewVideoRef.current) {
        previewVideoRef.current.load();
      }
    }
  };

  // Switch camera
  const switchCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const element = previewVideoRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        /* Safari */
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        /* IE11 */
        element.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Reset flow
  const reset = () => {
    setRecordedVideo(null);
    setStatus("idle");
    stopCamera();
  };

  return (
    <div className="bg-gray-900 min-h-screen lg:min-h-[50vh] p-4 lg:p-6 w-full mx-auto text-white lg:rounded-lg shadow-xl shadow-black/20">
      <div className="text-right relative">
        <button className="hover:bg-red-600 px-4 py-2" onClick={() => setIsUploading(false)}>
          <h1 className="text-2xl">
            <RxCross2 />
          </h1>
        </button>
      </div>
      <h2 className="text-2xl font-bold mb-6 text-center">
        {status === "preview" ? "Video Preview" : "Record or Upload a Video"}
      </h2>

      {/* Status indicators */}
      {status === "error" && (
        <div className="bg-red-900 text-red-100 p-3 rounded-lg mb-4">
          Camera/recording error occurred. Please try again.
        </div>
      )}

      {/* Video Preview Area */}
      <div className="relative rounded-lg overflow-hidden border-2 border-gray-700 mb-6 bg-black">
        {status !== "preview" ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video"
          />
        ) : (
          <div className="relative">
            <video
              ref={previewVideoRef}
              src={recordedVideo}
              controls
              playsInline
              className="w-full aspect-video"
            />
            {isMobile && (
              <button
                onClick={toggleFullscreen}
                className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full"
                aria-label="Fullscreen"
              >
                <FaExpand />
              </button>
            )}
          </div>
        )}

        {/* Recording indicator */}
        {status === "recording" && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md flex items-center">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
            REC
          </div>
        )}
      </div>

      {/* Step-by-step instructions */}
      <div className="mb-6 text-gray-300 text-sm text-center">
        {status === "idle" && (
          <p>Start by opening your camera or uploading a video file</p>
        )}
        {status === "ready" && (
          <p>Camera is ready. Press record when you're prepared</p>
        )}
        {status === "recording" && (
          <p>Recording in progress. Press stop when finished</p>
        )}
        {status === "preview" && (
          <p>Review your video {isMobile && "or tap fullscreen icon"}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        {/* Idle state */}
        {status === "idle" && (
          <>
            <button
              onClick={startCamera}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-medium transition flex-1 justify-center"
            >
              <FaCamera /> Open Camera
            </button>
            <label className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 px-4 py-3 rounded-lg font-medium cursor-pointer transition flex-1 justify-center">
              <FaUpload /> Upload Video
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </>
        )}

        {/* Camera ready state */}
        {status === "ready" && (
          <>
            <button
              onClick={startRecording}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-medium transition flex-1 justify-center"
            >
              🎥 Start Recording
            </button>
            <button
              onClick={switchCamera}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg font-medium transition"
            >
              <FaSyncAlt /> Switch Camera
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 px-4 py-3 rounded-lg font-medium transition"
            >
              Cancel
            </button>
          </>
        )}

        {/* Recording state */}
        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg font-medium transition w-full justify-center"
          >
            <FaStop /> Stop Recording
          </button>
        )}

        {/* Preview state */}
        {status === "preview" && (
          <div className="flex gap-3 w-full">
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg font-medium transition flex-1"
            >
              <FaRedo /> Re-record
            </button>
            <button
              onClick={() => alert("Upload logic here")}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-medium transition flex-1"
            >
              <FaCheck /> Confirm
            </button>
          </div>
        )}

        {/* Loading state */}
        {status === "loading" && (
          <button
            className="flex items-center gap-2 bg-gray-700 px-4 py-3 rounded-lg font-medium w-full justify-center"
            disabled
          >
            Loading...
          </button>
        )}
      </div>

      {/* Camera facing mode indicator */}
      {(status === "ready" || status === "recording") && (
        <div className="mt-4 text-center text-sm text-gray-400">
          Using {cameraFacing === "environment" ? "back" : "front"} camera
        </div>
      )}
    </div>
  );
};

export default CameraOrBrowse;
