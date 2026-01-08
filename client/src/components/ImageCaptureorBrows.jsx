import axios from "axios";
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
import { ClipLoader } from "react-spinners";
import Swal from "sweetalert2";

const CameraOrBrowse = ({
  setIsUploading,
  uploadingData,
  setUploadingMaterial,
}) => {
  const [mediaStream, setMediaStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [status, setStatus] = useState("idle");
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const fileInputRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Check if mobile device and screen orientation
  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(userAgent));

    // Handle orientation changes
    const handleOrientationChange = () => {
      if (videoRef.current && mediaStream) {
        // Re-apply video constraints on orientation change
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.style.transform =
              window.orientation === 90 || window.orientation === -90
                ? "rotate(90deg)"
                : "";
          }
        }, 100);
      }
    };

    window.addEventListener("orientationchange", handleOrientationChange);
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Initialize camera when facing mode changes
  useEffect(() => {
    if (status === "ready" || status === "recording") {
      startCamera();
    }
    return () => {
      if (status === "recording") {
        stopRecording();
      }
    };
  }, [cameraFacing]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      clearInterval(recordingTimerRef.current);
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo);
      }
    };
  }, []);

  // Start recording timer
  useEffect(() => {
    if (recording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }

    return () => {
      clearInterval(recordingTimerRef.current);
    };
  }, [recording]);

  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Start camera with mobile optimizations
  const startCamera = async () => {
    setStatus("loading");
    try {
      stopCamera();

      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: isMobileDevice ? 1280 : 1920 },
          height: { ideal: isMobileDevice ? 720 : 1080 },
          frameRate: { ideal: isMobileDevice ? 24 : 30 },
          // iOS specific constraints
          ...(isIOS && {
            aspectRatio: { exact: 16 / 9 },
          }),
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          // iOS needs explicit audio constraints
          ...(isIOS && {
            channelCount: 2,
            sampleSize: 16,
          }),
        },
      };

      console.log("Camera constraints:", constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Handle iOS auto-play restrictions
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.warn("Autoplay prevented:", e);
            // Show manual play button for iOS
            if (isIOS) {
              Swal.fire({
                title: "Tap to Start Camera",
                text: "Tap the video to start the camera preview",
                icon: "info",
                timer: 3000,
                showConfirmButton: false,
              });
            }
          });
        }
      }

      setStatus("ready");
    } catch (error) {
      console.error("Camera error:", error);
      setStatus("error");

      let errorMessage = "Cannot access camera";
      if (error.name === "NotAllowedError") {
        errorMessage =
          "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera found on your device.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is already in use by another application.";
      }

      Swal.fire({
        title: "Camera Error",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Get optimal recording settings
  const getRecordingSettings = () => {
    const options = {};

    // Try WebM first (browser default)
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
      options.mimeType = "video/webm;codecs=vp9,opus";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
      options.mimeType = "video/webm;codecs=vp8,opus";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      options.mimeType = "video/webm";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      options.mimeType = "video/mp4";
    }

    return options;
  };

  // Handle video file upload
  const handleUpload = async () => {
    if (!recordedBlob) {
      Swal.fire({
        title: "No Video",
        text: "Please record or select a video first",
        icon: "warning",
        timer: 3000,
      });
      return;
    }

    // Check file size (100MB limit)
    if (recordedBlob.size > 100 * 1024 * 1024) {
      Swal.fire({
        title: "File Too Large",
        text: "Video exceeds 100MB limit. Please record a shorter video or use lower quality.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Append metadata
      formData.append("styleId", uploadingData.style_id || 1);
      formData.append("styleNo", uploadingData.styleNo);
      formData.append("moId", uploadingData.moId);
      formData.append("sopId", uploadingData.sopId);
      formData.append("sopName", uploadingData.sopName);
      formData.append("subOpId", uploadingData.subOpId || uploadingData.sopId);

      // Determine file extension based on MIME type
      let fileExtension = ".webm";
      if (recordedBlob.type.includes("mp4")) {
        fileExtension = ".mp4";
      } else if (recordedBlob.type.includes("quicktime")) {
        fileExtension = ".mov";
      }

      const timestamp = new Date().getTime();
      const fileName = `video-${timestamp}${fileExtension}`;

      // Append video file
      formData.append("video", recordedBlob, fileName);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

      const response = await axios.post(
        `${apiUrl}/api/subOperationMedia/uploadVideos`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
          timeout: 300000, // 5 minutes for large files
        }
      );

      console.log("Upload response:", response.data);

      if (response.status === 201 && response.data.success === true) {
        Swal.fire({
          title: "Success!",
          text: "Video uploaded successfully",
          icon: "success",
          timer: 4000,
          showConfirmButton: false,
        });

        // Cleanup
        if (recordedVideo) {
          URL.revokeObjectURL(recordedVideo);
        }

        setRecordedBlob(null);
        setRecordedVideo(null);
        setStatus("idle");
        setUploading(false);
        setUploadProgress(0);

        // Optionally close the modal
        if (setUploadingMaterial) {
          setUploadingMaterial(null);
        }
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);

      let errorMessage = "Upload failed";
      let errorTitle = "Upload Failed";

      if (error.response) {
        errorMessage =
          error.response.data?.message || error.response.statusText;

        if (error.response.status === 413) {
          errorTitle = "File Too Large";
          errorMessage = "Video exceeds server size limit.";
        } else if (error.response.status === 415) {
          errorTitle = "Unsupported Format";
          errorMessage =
            "Video format not supported. Please try recording again.";
        }
      } else if (error.code === "ECONNABORTED") {
        errorTitle = "Timeout";
        errorMessage = "Upload took too long. Please try again.";
      } else if (!error.response) {
        errorTitle = "Network Error";
        errorMessage = "Unable to connect to server.";
      }

      Swal.fire({
        title: errorTitle,
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });

      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file selection for upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
    ];

    const isValidType = validTypes.some((type) =>
      file.type.includes(type.replace("video/", ""))
    );

    if (!isValidType) {
      Swal.fire({
        title: "Invalid File",
        text: "Please select a video file (MP4, WebM, MOV, AVI, MKV)",
        icon: "error",
        timer: 4000,
      });
      return;
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      Swal.fire({
        title: "File Too Large",
        text: "Video exceeds 100MB limit. Please select a smaller file.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    const videoUrl = URL.createObjectURL(file);
    setRecordedVideo(videoUrl);
    setRecordedBlob(file);
    setStatus("preview");

    if (previewVideoRef.current) {
      previewVideoRef.current.load();
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
      setMediaStream(null);
    }
  };

  // Start recording
  const startRecording = () => {
    if (!mediaStream) return;

    recordedChunks.current = [];
    const options = getRecordingSettings();

    console.log("Starting recording with options:", options);

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

        // Check if file is too large before preview
        if (blob.size > 100 * 1024 * 1024) {
          Swal.fire({
            title: "Recording Too Long",
            text: "Your recording exceeds 100MB. Please record a shorter video.",
            icon: "warning",
            confirmButtonText: "OK",
          });
          reset();
          return;
        }

        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideo(videoUrl);
        setRecordedBlob(blob);
        setStatus("preview");

        if (previewVideoRef.current) {
          previewVideoRef.current.load();
          previewVideoRef.current.play().catch((e) => {
            console.log("Preview autoplay prevented:", e);
          });
        }
      };

      // For mobile, use timeslice for better performance
      const timeslice = isMobile ? 500 : 1000;
      recorder.start(timeslice);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setStatus("recording");
    } catch (error) {
      console.error("Recording error:", error);
      setStatus("error");
      Swal.fire({
        title: "Recording Error",
        text: `Cannot start recording: ${error.message}`,
        icon: "error",
        timer: 4000,
      });
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
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
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
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    setRecordedVideo(null);
    setRecordedBlob(null);
    setStatus("idle");
    stopCamera();
    stopRecording();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen lg:min-h-[50vh] p-3 sm:p-4 lg:p-6 w-full mx-auto text-white lg:rounded-lg shadow-xl shadow-black/20">
      <div className="text-right relative">
        <button
          className="hover:bg-red-600 px-3 py-1 sm:px-4 sm:py-2 rounded-full absolute -top-1 -right-1 sm:-top-2 sm:-right-2 z-10 transition-colors"
          onClick={() => {
            reset();
            setUploadingMaterial?.(null);
          }}
          disabled={uploading}
        >
          <RxCross2 className="text-xl sm:text-2xl" />
        </button>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">
        {status === "preview" ? "Video Preview" : "Record or Upload Video"}
      </h2>

      {/* Upload progress */}
      {uploading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Video Preview Area - Responsive */}
      <div className="relative rounded-lg overflow-hidden border-2 border-red-700 mb-4 sm:mb-6 bg-black">
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          {" "}
          {/* 16:9 aspect ratio */}
          {status !== "preview" ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute top-0 left-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute top-0 left-0 w-full h-full">
              <video
                ref={previewVideoRef}
                src={recordedVideo}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
              {isMobile && (
                <button
                  onClick={toggleFullscreen}
                  className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-black bg-opacity-70 text-white p-1 sm:p-2 rounded-full hover:bg-opacity-90 transition"
                  aria-label="Fullscreen"
                >
                  <FaExpand className="text-sm sm:text-base" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recording indicator with timer */}
        {status === "recording" && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-red-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"></div>
            <span className="font-semibold text-xs sm:text-sm">REC</span>
            <span className="text-xs sm:text-sm font-mono">
              {formatRecordingTime(recordingTime)}
            </span>
          </div>
        )}

        {/* File size warning */}
        {status === "preview" && recordedBlob && (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            Size: {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mb-4 sm:mb-6 text-gray-300 text-xs sm:text-sm text-center px-2">
        {status === "idle" && <p>Open camera or upload a video (max 100MB)</p>}
        {status === "ready" && <p>Camera ready. Tap record when prepared</p>}
        {status === "recording" && (
          <p>
            <span className="text-red-400 font-semibold">● Recording</span> -
            Tap stop when finished
          </p>
        )}
        {status === "preview" && (
          <p>
            Review your video {isMobile && "• Tap fullscreen for better view"}
          </p>
        )}
      </div>

      {/* Action Buttons - Responsive */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {/* Idle state */}
        {status === "idle" && (
          <>
            <button
              onClick={startCamera}
              className="flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition flex-1 justify-center min-w-[120px] text-sm sm:text-base"
              disabled={uploading}
            >
              <FaCamera className="text-sm sm:text-base" /> Open Camera
            </button>
            <label className="flex items-center gap-1 sm:gap-2 bg-gray-700 hover:bg-gray-800 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium cursor-pointer transition flex-1 justify-center min-w-[120px] text-sm sm:text-base">
              <FaUpload className="text-sm sm:text-base" /> Upload Video
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </>
        )}

        {/* Camera ready state */}
        {status === "ready" && (
          <>
            <button
              onClick={startRecording}
              className="flex items-center gap-1 sm:gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition flex-1 justify-center text-sm sm:text-base"
              disabled={uploading}
            >
              🎥 Start Recording
            </button>
            {isMobile && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-1 sm:gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition min-w-[80px] sm:min-w-[100px] justify-center text-sm sm:text-base"
                disabled={uploading}
              >
                <FaSyncAlt className="text-sm sm:text-base" /> Flip
              </button>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-1 sm:gap-2 bg-gray-700 hover:bg-gray-800 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition min-w-[80px] sm:min-w-[100px] justify-center text-sm sm:text-base"
              disabled={uploading}
            >
              Cancel
            </button>
          </>
        )}

        {/* Recording state */}
        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-1 sm:gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition w-full justify-center text-sm sm:text-base animate-pulse"
            disabled={uploading}
          >
            <FaStop className="text-sm sm:text-base" /> Stop Recording
          </button>
        )}

        {/* Preview state */}
        {status === "preview" && (
          <div className="flex gap-2 sm:gap-3 w-full">
            <button
              onClick={reset}
              className="flex items-center gap-1 sm:gap-2 bg-yellow-600 hover:bg-yellow-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition flex-1 justify-center text-sm sm:text-base"
              disabled={uploading}
            >
              <FaRedo className="text-sm sm:text-base" /> Re-record
            </button>
            <button
              onClick={handleUpload}
              className="flex items-center gap-1 sm:gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition flex-1 justify-center text-sm sm:text-base"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <ClipLoader size={14} color="white" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <FaCheck className="text-sm sm:text-base" /> Upload
                </>
              )}
            </button>
          </div>
        )}

        {/* Loading state */}
        {status === "loading" && (
          <div className="w-full text-center py-3">
            <ClipLoader size={20} color="white" />
            <p className="mt-2 text-sm">Loading camera...</p>
          </div>
        )}
      </div>

      {/* Camera facing mode indicator */}
      {(status === "ready" || status === "recording") && (
        <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-400">
          Using {cameraFacing === "environment" ? "back" : "front"} camera
        </div>
      )}

      {/* Size warning */}
      <div className="mt-3 text-center text-xs text-yellow-400">
        ⚠️ Maximum video size: 100MB
      </div>
    </div>
  );
};

export default CameraOrBrowse;
