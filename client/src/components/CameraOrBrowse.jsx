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

const CameraOrBrowse = ({
  setIsUploading,
  uploadingData,
  setUploadingMaterial,
}) => {
  // States
  const [mediaStream, setMediaStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [recordedFile, setRecordedFile] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [status, setStatus] = useState("idle");
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoQuality, setVideoQuality] = useState("medium");
  const [originalSize, setOriginalSize] = useState(0);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  // Refs
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const qualityMenuRef = useRef(null);

  // Quality presets
  const qualityPresets = {
    low: {
      name: "Low",
      bitrate: 1000000,
    },
    medium: {
      name: "Medium",
      bitrate: 2500000,
    },
    high: {
      name: "High",
      bitrate: 5000000,
    },
  };

  // Initialize
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
      if (recordedVideo) URL.revokeObjectURL(recordedVideo);
    };
  }, []);

  // Handle fullscreen change
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
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus("ready");
    } catch (error) {
      console.error("Camera error:", error);
      setStatus("error");
      Swal.fire({
        title: "Camera Error",
        text: "Please allow camera access to record videos",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start recording
  const startRecording = () => {
    if (!mediaStream) return;

    recordedChunks.current = [];
    setRecordingTime(0);
    setVideoError(false);
    setVideoDuration(0);

    // Get supported mimeType
    let mimeType = "";
    const types = [
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=h264,opus",
      "video/webm",
      "video/mp4",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    if (!mimeType) mimeType = "video/webm";

    try {
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: mimeType,
        videoBitsPerSecond: qualityPresets[videoQuality].bitrate,
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, {
          type: recorder.mimeType,
        });
        const videoUrl = URL.createObjectURL(blob);
        const extension = blob.type.includes("mp4") ? "mp4" : "webm";
        const fileName = `recording-${Date.now()}.${extension}`;

        const file = new File([blob], fileName, {
          type: blob.type,
          lastModified: Date.now(),
        });

        setOriginalSize(blob.size);
        setRecordedVideo(videoUrl);
        setRecordedFile(file);
        setStatus("preview");
        setVideoError(false);

        // Load the preview video
        setTimeout(() => {
          if (previewVideoRef.current) {
            previewVideoRef.current.src = videoUrl;
            previewVideoRef.current.load();

            // Set up event listeners for the preview
            previewVideoRef.current.onloadedmetadata = () => {
              const duration = previewVideoRef.current.duration;
              console.log("Video duration:", duration);
              if (duration && !isNaN(duration) && duration !== Infinity) {
                setVideoDuration(duration);
              } else {
                setVideoDuration(recordingTime);
              }
            };

            // Auto-play
            previewVideoRef.current.play().catch((e) => {
              console.log("Auto-play prevented:", e.name);
            });
          }
        }, 100);
      };

      // Start timer
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
        text: "Unable to start recording. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    stopCamera();
  };

  // Format time
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Fullscreen functions
  const toggleFullscreen = () => {
    const element =
      document.querySelector(".video-container") ||
      previewVideoRef.current ||
      videoRef.current;
    if (!element) return;

    if (!isFullscreen) {
      if (element.requestFullscreen) element.requestFullscreen();
      else if (element.webkitRequestFullscreen)
        element.webkitRequestFullscreen();
      else if (element.msRequestFullscreen) element.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  };

  // Video controls
  const toggleVideoPlayback = () => {
    if (!previewVideoRef.current) return;

    if (previewVideoRef.current.paused) {
      previewVideoRef.current
        .play()
        .then(() => setIsVideoPlaying(true))
        .catch((e) => {
          console.error("Play error:", e);
          setVideoError(true);
        });
    } else {
      previewVideoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!file.type.startsWith("video/")) {
      Swal.fire({
        title: "Invalid File",
        text: "Please select a video file",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      Swal.fire({
        title: "File Too Large",
        text: "Maximum file size is 100MB",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    setOriginalSize(file.size);
    setVideoError(false);
    setRecordingTime(0);

    const videoUrl = URL.createObjectURL(file);
    setRecordedVideo(videoUrl);
    setRecordedFile(file);
    setStatus("preview");

    // Get duration
    const tempVideo = document.createElement("video");
    tempVideo.src = videoUrl;
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration && tempVideo.duration !== Infinity) {
        setVideoDuration(tempVideo.duration);
      }
      URL.revokeObjectURL(videoUrl); // Clean temp URL

      // Set up preview
      setTimeout(() => {
        if (previewVideoRef.current) {
          previewVideoRef.current.src = videoUrl;
          previewVideoRef.current.load();

          previewVideoRef.current.onloadedmetadata = () => {
            if (
              previewVideoRef.current.duration &&
              previewVideoRef.current.duration !== Infinity
            ) {
              setVideoDuration(previewVideoRef.current.duration);
            }
          };
        }
      }, 100);
    };
  };

  // Upload handler - FIXED HEADER ISSUE
  const handleUpload = async () => {
    if (!recordedFile) {
      Swal.fire({
        title: "No Video",
        text: "Please record or select a video first",
        icon: "warning",
        timer: 3000,
        showConfirmButton: false,
      });
      return;
    }

    if (recordedFile.size > 100 * 1024 * 1024) {
      Swal.fire({
        title: "File Too Large",
        text: "Video exceeds 100MB limit",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("styleId", uploadingData.style_id || 1);
      formData.append("styleNo", uploadingData.styleNo);
      formData.append("moId", uploadingData.moId);
      formData.append("sopId", uploadingData.sopId);
      formData.append("sopName", uploadingData.sopName);
      formData.append("subOpId", uploadingData.sopId);

      // Use videoDuration instead of recordingTime for uploaded files
      const duration =
        videoDuration > 0 ? Math.round(videoDuration) : recordingTime;
      formData.append("recordingDuration", duration);
      formData.append("videoQuality", videoQuality);
      formData.append("originalSize", originalSize);

      // Append the File object - CRITICAL FIX
      formData.append("video", recordedFile, recordedFile.name);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

      const response = await axios.post(
        `${apiUrl}/api/subOperationMedia/uploadVideos`,
        formData,
        {
          withCredentials: true,
          // REMOVED Content-Type header - axios sets it automatically with correct boundary
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setUploadProgress(percent);
            }
          },
          timeout: 300000,
        },
      );

      if (response.status === 201 && response.data.success === true) {
        Swal.fire({
          title: "Success!",
          text: "Video uploaded successfully!",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });

        resetState();
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);

      let errorMessage = "Upload failed. Please try again.";
      if (error.response?.status === 413) errorMessage = "File too large.";
      if (error.response?.status === 415) errorMessage = "Unsupported format.";
      if (error.response?.status === 400)
        errorMessage = error.response.data?.message || "Invalid file.";
      if (!error.response) errorMessage = "Network error.";

      Swal.fire({
        title: "Upload Failed",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Reset
  const resetState = () => {
    if (recordedVideo) URL.revokeObjectURL(recordedVideo);
    setRecordedVideo(null);
    setRecordedFile(null);
    setStatus("idle");
    setRecordingTime(0);
    setVideoDuration(0);
    setOriginalSize(0);
    setIsVideoPlaying(false);
    setVideoError(false);
    stopCamera();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Switch camera
  const switchCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Reinitialize camera when facing changes
  useEffect(() => {
    if (cameraFacing && (status === "ready" || status === "recording")) {
      startCamera();
    }
  }, [cameraFacing]);

  return (
    <div className="bg-gray-900 min-h-screen p-4 w-full mx-auto text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {status === "preview" ? "Video Preview" : "Record Video"}
        </h2>
        <div className="flex items-center gap-2">
          {/* Quality Selector */}
          <div className="relative" ref={qualityMenuRef}>
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
              disabled={recording || uploading}
            >
              <FaCog className="text-sm" />
              <span>{qualityPresets[videoQuality].name}</span>
            </button>

            {showQualityMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <div className="text-xs text-gray-400 px-2 py-1">Quality</div>
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
              if (!uploading && !recording) {
                setUploadingMaterial(null);
              }
            }}
            disabled={uploading || recording}
          >
            <RxCross2 className="text-xl" />
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="mb-4">
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

      {/* Video Container */}
      <div className="video-container relative rounded-xl overflow-hidden border border-gray-700 bg-black mb-4 h-[60vh] min-h-[400px]">
        {/* Recording Timer */}
        {status === "recording" && (
          <div className="absolute top-3 left-3 z-20 bg-red-600/90 text-white px-2.5 py-1 rounded-md flex items-center shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
            <span className="font-mono font-bold text-sm">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {/* Error Message */}
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center p-4">
              <div className="text-red-400 text-lg mb-2">Playback Error</div>
              <p className="text-gray-300 text-sm">
                Cannot play this video. Please try again.
              </p>
            </div>
          </div>
        )}

        {/* Video Duration Display */}
        {status === "preview" && videoDuration > 0 && (
          <div className="absolute top-3 right-3 z-20 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {formatTime(videoDuration)}
          </div>
        )}

        {/* Video Elements */}
        <div className="w-full h-full flex items-center justify-center">
          {/* Live Camera View */}
          {status === "ready" || status === "recording" ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
          ) : null}

          {/* Recorded Video Preview */}
          {status === "preview" && recordedVideo && !videoError ? (
            <video
              ref={previewVideoRef}
              src={recordedVideo}
              controls
              playsInline
              className="w-full h-full object-contain"
              onError={() => setVideoError(true)}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />
          ) : null}

          {/* Placeholder */}
          {status === "idle" && (
            <div className="text-center p-6">
              <FaVideo className="text-6xl text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Ready to record or upload</p>
            </div>
          )}

          {/* Loading */}
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <ClipLoader size={30} color="#3B82F6" />
                <p className="mt-3 text-sm">Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        {(status === "preview" || status === "recording") && (
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-3 right-3 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        )}
      </div>

      {/* Stats */}
      {status === "preview" && recordedFile && (
        <div className="bg-gray-800/30 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-400 text-xs">Size</div>
              <div className="font-medium">
                {(recordedFile.size / (1024 * 1024)).toFixed(1)} MB
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

      {/* Action Buttons */}
      <div className="space-y-3 max-w-md mx-auto">
        {/* Idle */}
        {status === "idle" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={startCamera}
              className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 p-3 rounded-xl font-medium transition-all"
              disabled={uploading}
            >
              <FaCamera className="text-xl" />
              <div className="text-sm">Open Camera</div>
            </button>
            <label className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 p-3 rounded-xl font-medium cursor-pointer transition-all">
              <FaUpload className="text-xl" />
              <div className="text-sm">Upload Video</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        )}

        {/* Ready */}
        {status === "ready" && (
          <div className="flex gap-3">
            <button
              onClick={startRecording}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 p-3 rounded-xl font-medium"
            >
              <div className="relative">
                <div className="w-4 h-4 bg-white rounded-full" />
                <div className="w-4 h-4 bg-red-300 rounded-full absolute top-0 animate-ping opacity-75" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Start Recording</div>
              </div>
            </button>
            <div className="flex flex-col gap-2">
              <button
                onClick={switchCamera}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
              >
                <FaSyncAlt />
              </button>
              <button
                onClick={resetState}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Recording */}
        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 p-3 rounded-xl font-medium animate-pulse"
          >
            <FaStop className="text-xl" />
            <div className="text-left">
              <div className="font-semibold">Stop Recording</div>
            </div>
          </button>
        )}

        {/* Preview */}
        {status === "preview" && !videoError && (
          <div className="flex gap-3">
            <button
              onClick={resetState}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 p-3 rounded-xl font-medium"
              disabled={uploading}
            >
              <FaRedo />
              <div>Re-record</div>
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 p-3 rounded-xl font-medium"
              disabled={uploading}
            >
              {uploading ? (
                <ClipLoader size={16} color="white" />
              ) : (
                <FaCheck className="text-xl" />
              )}
              <div>{uploading ? "Uploading..." : "Upload"}</div>
            </button>
          </div>
        )}

        {/* Error */}
        {videoError && (
          <button
            onClick={resetState}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 p-3 rounded-xl font-medium"
          >
            <FaRedo />
            <div>Try Again</div>
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-800 text-center text-xs text-gray-500">
        <div className="inline-flex items-center gap-1 bg-gray-800/50 px-2 py-1 rounded">
          <FaVideo className="text-xs" />
          Max 100MB • {qualityPresets[videoQuality].name} •{" "}
          {isMobile ? "Mobile" : "Desktop"}
        </div>
      </div>
    </div>
  );
};

export default CameraOrBrowse;
