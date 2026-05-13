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
  FaCompress,
  FaVideo,
  FaCog,
  FaPlay,
  FaPause,
} from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { ClipLoader } from "react-spinners";
import Swal from "sweetalert2";
import fixWebmDuration from "webm-duration-fix"; // Add this import

const CameraOrBrowse = ({
  setIsUploading,
  uploadingData,
  setUploadingMaterial,
  operationType,
}) => {
  // States
  const [mediaStream, setMediaStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [status, setStatus] = useState("idle");
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoQuality, setVideoQuality] = useState("medium");
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Refs
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const qualityMenuRef = useRef(null);
  const progressBarRef = useRef(null);

  // Quality presets
  const qualityPresets = {
    low: {
      name: "Low",
      bitrate: 3000,
      resolution: "854x480",
    },
    medium: {
      name: "Medium",
      bitrate: 5000,
      resolution: "1280x720",
    },
    high: {
      name: "High",
      bitrate: 8000,
      resolution: "1920x1080",
    },
  };

  // Check if mobile device
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    const handleClickOutside = (event) => {
      if (
        qualityMenuRef.current &&
        !qualityMenuRef.current.contains(event.target)
      ) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("mousedown", handleClickOutside);
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  // Start camera
  const startCamera = async () => {
    setStatus("loading");
    try {
      stopCamera();

      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current
          .play()
          .catch((e) => console.error("Play error:", e));
      }

      setStatus("ready");
    } catch (error) {
      console.error("Camera error:", error);
      setStatus("error");
      Swal.fire({
        title: "Camera Error",
        text: error.message || "Unable to access camera",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setMediaStream(null);
    }
  };

  // Start recording
  const startRecording = () => {
    if (!mediaStream) {
      Swal.fire({
        title: "Camera Not Ready",
        text: "Please wait for camera to initialize",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    recordedChunks.current = [];
    setRecordingTime(0);
    setVideoError(false);

    let mimeType = "video/webm";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
      mimeType = "video/webm;codecs=vp9,opus";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=h264,opus")) {
      mimeType = "video/webm;codecs=h264,opus";
    }

    const options = {
      mimeType: mimeType,
      videoBitsPerSecond:
        qualityPresets[videoQuality]?.bitrate * 1000 || 5000000,
      audioBitsPerSecond: 128000,
    };

    try {
      const recorder = new MediaRecorder(mediaStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Make this async
        try {
          if (recordedChunks.current.length === 0) {
            throw new Error("No data recorded");
          }

          // Create original blob
          let blob = new Blob(recordedChunks.current, {
            type: recorder.mimeType || "video/webm",
          });

          // Fix WebM duration if it's a WebM file
          if (blob.type.includes("webm")) {
            try {
              console.log("Fixing WebM duration metadata...");
              // Pass the actual recording duration to the fixer
              const fixedBlob = await fixWebmDuration(blob, {
                duration: recordingTime,
              });
              console.log("WebM duration fixed successfully");
              blob = fixedBlob;
            } catch (fixError) {
              console.warn("Failed to fix WebM duration:", fixError);
              // Continue with original blob if fix fails
            }
          }

          const videoUrl = URL.createObjectURL(blob);
          const duration = recordingTime;

          setOriginalSize(blob.size);
          setRecordedVideo(videoUrl);
          setRecordedBlob(blob);
          setVideoDuration(duration);
          setCurrentTime(0);
          setStatus("preview");
          setVideoError(false);
          setRecordingTime(duration);

          // Force video reload to use fixed metadata
          if (previewVideoRef.current) {
            previewVideoRef.current.src = videoUrl;
            previewVideoRef.current.load();
          }
        } catch (error) {
          console.error("Error in recorder.onstop:", error);
          Swal.fire({
            title: "Recording Error",
            text: "Failed to process recording",
            icon: "error",
            confirmButtonText: "OK",
          });
          setStatus("ready");
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        Swal.fire({
          title: "Recording Error",
          text: event.error?.message || "Failed to record video",
          icon: "error",
          confirmButtonText: "OK",
        });
        setStatus("ready");
        setRecording(false);
      };

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setStatus("recording");
    } catch (error) {
      console.error("Recording error:", error);
      setStatus("error");
      Swal.fire({
        title: "Recording Error",
        text: error.message || "Failed to start recording",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setRecording(false);

      if (isFullscreen) {
        exitFullscreen();
      }
    }
    stopCamera();
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Fullscreen functions
  const requestFullscreen = (element) => {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  };

  const toggleFullscreen = () => {
    const element = previewVideoRef.current || videoRef.current;
    if (!element) return;

    if (!isFullscreen) {
      requestFullscreen(element);
    } else {
      exitFullscreen();
    }
  };

  // Custom video controls for WebM duration fix
  const handleVideoTimeUpdate = () => {
    if (previewVideoRef.current) {
      const video = previewVideoRef.current;
      let current = video.currentTime;

      // Fix for WebM where duration might be Infinity
      if (video.duration === Infinity || isNaN(video.duration)) {
        if (current > videoDuration) {
          current = videoDuration;
        }
        setCurrentTime(current);
      } else {
        setCurrentTime(current);
        // Update our duration if we finally got it
        if (video.duration > 0 && video.duration !== videoDuration) {
          setVideoDuration(video.duration);
        }
      }
    }
  };

  const handleVideoLoadedMetadata = () => {
    const video = previewVideoRef.current;
    if (video) {
      // If video duration is valid, use it
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        setVideoDuration(video.duration);
      } else {
        // For WebM with missing duration, use recorded time
        setVideoDuration(recordingTime);
      }
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = seekTime;
    }
  };

  const toggleVideoPlayback = () => {
    if (previewVideoRef.current) {
      if (previewVideoRef.current.paused) {
        previewVideoRef.current.play().catch(console.error);
      } else {
        previewVideoRef.current.pause();
      }
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.includes("video")) {
      Swal.fire({
        title: "Invalid File",
        text: "Please select a video file",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    setOriginalSize(file.size);
    const videoUrl = URL.createObjectURL(file);
    setRecordedVideo(videoUrl);
    setRecordedBlob(file);

    const tempVideo = document.createElement("video");
    tempVideo.src = videoUrl;
    tempVideo.onloadedmetadata = () => {
      const duration = tempVideo.duration;
      setRecordingTime(Math.floor(duration));
      setVideoDuration(duration);
    };

    setStatus("preview");
    setVideoError(false);
    event.target.value = null;
  };

  // Validate upload data
  const validateUploadData = () => {
    if (!uploadingData) {
      Swal.fire({
        title: "Missing Data",
        text: "Operation data is missing",
        icon: "error",
        confirmButtonText: "OK",
      });
      return false;
    }

    if (operationType === "HelperOperation") {
      if (!uploadingData.hoId) {
        Swal.fire({
          title: "Missing Data",
          text: "Helper operation ID (hoId) is missing",
          icon: "error",
          confirmButtonText: "OK",
        });
        return false;
      }

      if (!uploadingData.styleNo) {
        Swal.fire({
          title: "Missing Data",
          text: "Style number (styleNo) is missing",
          icon: "error",
          confirmButtonText: "OK",
        });
        return false;
      }
    } else {
      if (!uploadingData.sopId || !uploadingData.moId) {
        Swal.fire({
          title: "Missing Data",
          text: "Sub operation data is incomplete",
          icon: "error",
          confirmButtonText: "OK",
        });
        return false;
      }
    }
    return true;
  };

  // Main upload handler
  const handleUpload = async () => {
    if (!recordedBlob) {
      Swal.fire({
        title: "No Video",
        text: "Please record or select a video first",
        icon: "warning",
        timer: 3000,
        showConfirmButton: false,
      });
      return;
    }

    if (!validateUploadData()) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      if (operationType === "HelperOperation") {
        formData.append("hOpName", uploadingData.hOpName || "");
        formData.append("hoId", uploadingData.hoId || "");
        formData.append("styleNo", uploadingData.styleNo || "");
      } else {
        formData.append(
          "styleId",
          uploadingData.style_id || uploadingData.styleId || 1,
        );
        formData.append("styleNo", uploadingData.styleNo || "");
        formData.append("moId", uploadingData.moId || "");
        formData.append("sopId", uploadingData.sopId || "");
        formData.append("sopName", uploadingData.sopName || "");
      }

      formData.append("recordingDuration", recordingTime || 0);
      formData.append("videoQuality", videoQuality);
      formData.append("originalSize", originalSize || recordedBlob.size);
      formData.append("compressedSize", compressedSize || recordedBlob.size);

      const timestamp = new Date().getTime();
      let videoFile;
      let fileName;

      if (recordedBlob instanceof File) {
        videoFile = recordedBlob;
        fileName = recordedBlob.name;
      } else {
        const mimeType = recordedBlob.type?.includes("webm")
          ? "video/webm"
          : "video/mp4";
        const extension = mimeType === "video/webm" ? "webm" : "mp4";
        fileName = `operation-recording-${timestamp}.${extension}`;
        videoFile = new File([recordedBlob], fileName, {
          type: mimeType,
          lastModified: Date.now(),
        });
      }

      formData.append("video", videoFile);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const endpoint =
        operationType === "HelperOperation"
          ? `${apiUrl}/api/helperOpMedia/uploadVideos`
          : `${apiUrl}/api/subOperationMedia/uploadVideos`;

      const response = await axios.post(endpoint, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(
              Math.round((progressEvent.loaded * 100) / progressEvent.total),
            );
          }
        },
        timeout: 600000,
      });

      if (response.status === 201 || response.status === 200) {
        await Swal.fire({
          title: "Success!",
          text: "Video uploaded successfully!",
          icon: "success",
          timer: 4000,
          showConfirmButton: false,
        });

        if (recordedVideo) URL.revokeObjectURL(recordedVideo);
        resetState();
        if (setUploadingMaterial) setUploadingMaterial(null);
      } else {
        throw new Error(response.data?.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Swal.fire({
        title: "Upload Failed",
        text: error.response?.data?.message || "Please try again",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Reset state
  const resetState = () => {
    if (recordedVideo) URL.revokeObjectURL(recordedVideo);
    setRecordedVideo(null);
    setRecordedBlob(null);
    setStatus("idle");
    setRecordingTime(0);
    setOriginalSize(0);
    setCompressedSize(0);
    setVideoDuration(0);
    setCurrentTime(0);
    setVideoError(false);
    stopCamera();

    if (timerRef.current) clearInterval(timerRef.current);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const switchCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

  useEffect(() => {
    if (status === "ready" || status === "recording") {
      startCamera();
    }
  }, [cameraFacing]);

  useEffect(() => {
    return () => {
      if (recordedVideo) URL.revokeObjectURL(recordedVideo);
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="bg-gray-900 min-h-screen p-4 w-full mx-auto text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {status === "preview" ? "Video Preview" : "Record Operation"}
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative" ref={qualityMenuRef}>
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
              disabled={recording || compressing || uploading}
            >
              <FaCog className="text-sm" />
              <span className="hidden sm:inline">
                {qualityPresets[videoQuality]?.name || "Medium"}
              </span>
            </button>

            {showQualityMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  {Object.entries(qualityPresets).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setVideoQuality(key);
                        setShowQualityMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                        videoQuality === key
                          ? "bg-blue-600 text-white"
                          : "hover:bg-gray-700 text-gray-300"
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            className="p-1.5 hover:bg-red-600 rounded-lg transition"
            onClick={() => {
              if (!uploading && !compressing && !recording) {
                resetState();
                if (setUploadingMaterial) setUploadingMaterial(null);
              }
            }}
            disabled={uploading || compressing || recording}
          >
            <RxCross2 className="text-xl" />
          </button>
        </div>
      </div>

      {/* Progress Indicators */}
      {(uploading || compressing) && (
        <div className="mb-4 space-y-3">
          {uploading && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-400">Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Container */}
      <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-black mb-4 h-[60vh] min-h-[400px]">
        {status === "recording" && (
          <div className="absolute top-3 left-3 z-20 bg-red-600/90 text-white px-2.5 py-1 rounded-md flex items-center shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
            <span className="font-mono font-bold text-sm">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {videoError && status === "preview" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center p-4">
              <div className="text-red-400 text-lg mb-2">
                ⚠️ Video Playback Error
              </div>
              <button
                onClick={resetState}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
              >
                Re-record Video
              </button>
            </div>
          </div>
        )}

        {(status === "preview" || status === "recording") && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        )}

        <div className="w-full h-full flex items-center justify-center">
          {status !== "preview" ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              ref={previewVideoRef}
              src={recordedVideo}
              controls
              playsInline
              className="w-full h-full object-contain"
              onLoadedMetadata={handleVideoLoadedMetadata}
              onError={(e) => {
                console.error("Video error:", e);
                setVideoError(true);
              }}
            />
          )}
        </div>

        {status === "loading" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <ClipLoader size={30} color="#3B82F6" />
              <p className="mt-3 text-sm">Starting camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {status === "preview" && recordedBlob && !videoError && (
        <div className="bg-gray-800/30 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-400 text-xs">File Size</div>
              <div className="font-medium">
                {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs">Duration</div>
              <div className="font-medium">
                {formatTime(videoDuration || recordingTime)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs">Status</div>
              <div className="font-medium text-green-400">Ready</div>
            </div>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              status === "recording"
                ? "bg-red-500 animate-pulse"
                : status === "ready"
                  ? "bg-green-500"
                  : status === "preview"
                    ? "bg-blue-500"
                    : "bg-gray-500"
            }`}
          />
          <span className="text-sm text-gray-300">
            {status === "idle" && "Select an option to begin"}
            {status === "ready" && "Camera ready - Position your operation"}
            {status === "recording" &&
              `Recording - ${formatTime(recordingTime)}`}
            {status === "preview" && "Review your video"}
            {status === "error" && "Error occurred. Please try again."}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 max-w-md mx-auto">
        {status === "idle" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={startCamera}
              className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-2 py-2 rounded-xl font-medium transition"
            >
              <FaCamera className="text-xl" />
              <div className="text-sm">Open Camera</div>
            </button>
            <label className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 px-2 py-2 rounded-xl font-medium cursor-pointer transition">
              <FaUpload className="text-xl" />
              <div className="text-sm">Upload Video</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {status === "ready" && (
          <div className="flex gap-3">
            <button
              onClick={startRecording}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-5 py-3 rounded-xl font-medium transition"
            >
              <div className="relative">
                <div className="w-4 h-4 bg-white rounded-full" />
                <div className="w-4 h-4 bg-red-300 rounded-full absolute top-0 animate-ping opacity-75" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Start Recording</div>
                <div className="text-xs opacity-75">Begin operation</div>
              </div>
            </button>
            <div className="flex flex-col gap-2">
              <button
                onClick={switchCamera}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition flex items-center justify-center gap-2 text-sm"
              >
                <FaSyncAlt />
                <span>Switch</span>
              </button>
              <button
                onClick={resetState}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-5 py-3 rounded-xl font-medium transition animate-pulse"
          >
            <FaStop className="text-xl" />
            <div className="text-left">
              <div className="font-semibold">Stop Recording</div>
              <div className="text-xs opacity-75">Finish operation</div>
            </div>
          </button>
        )}

        {status === "preview" && !videoError && (
          <div className="flex gap-3">
            <button
              onClick={resetState}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 px-5 py-3 rounded-xl font-medium transition"
              disabled={uploading}
            >
              <FaRedo />
              <div className="text-left">
                <div className="font-semibold">Re-record</div>
                <div className="text-xs opacity-75">Try again</div>
              </div>
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-3 rounded-xl font-medium transition"
              disabled={uploading}
            >
              {uploading ? (
                <ClipLoader size={16} color="white" />
              ) : (
                <FaCheck className="text-xl" />
              )}
              <div className="text-left">
                <div className="font-semibold">
                  {uploading ? "Uploading..." : "Upload"}
                </div>
                <div className="text-xs opacity-75">
                  {uploading
                    ? `${uploadProgress}% complete`
                    : "To cloud storage"}
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Camera Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Recording</span>
            </div>
          </div>
          <div>
            Quality: {qualityPresets[videoQuality]?.name || "Medium"} •{" "}
            {isMobile ? "📱 Mobile" : "🖥️ Desktop"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraOrBrowse;
