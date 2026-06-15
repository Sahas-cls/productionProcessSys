import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  FaCamera,
  FaUpload,
  FaSyncAlt,
  FaCheck,
  FaRedo,
  FaStop,
  FaExpand,
  FaCompress,
  FaCog,
  FaPlay,
  FaPause,
} from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { ClipLoader } from "react-spinners";
import Swal from "sweetalert2";
import fixWebmDuration from "webm-duration-fix";
import { IoArrowBack } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const SpecialVideoUpload = () => {
  // hooks
  const navigate = useNavigate();

  // States
  const [mediaStream, setMediaStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [status, setStatus] = useState("idle");
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoQuality, setVideoQuality] = useState("medium");
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Modal states
  const [showVideoNameModal, setShowVideoNameModal] = useState(false);
  const [videoName, setVideoName] = useState("");
  const [videoDescription, setVideoDescription] = useState("");

  // Refs
  const mediaRecorderRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const qualityMenuRef = useRef(null);
  const modalRef = useRef(null);

  // Quality presets
  const qualityPresets = {
    low: { name: "Low", bitrate: 3000, resolution: "854x480" },
    medium: { name: "Medium", bitrate: 5000, resolution: "1280x720" },
    high: { name: "High", bitrate: 8000, resolution: "1920x1080" },
  };

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
      // Close modal if clicking outside
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        showVideoNameModal
      ) {
        setShowVideoNameModal(false);
        setVideoName("");
        setVideoDescription("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    // Handle escape key to close modal
    const handleEscKey = (event) => {
      if (event.key === "Escape" && showVideoNameModal) {
        setShowVideoNameModal(false);
        setVideoName("");
        setVideoDescription("");
      }
    };
    document.addEventListener("keydown", handleEscKey);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [showVideoNameModal]);

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

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
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current
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
      });
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  };

  const startRecording = () => {
    if (!mediaStream) {
      Swal.fire({
        title: "Camera Not Ready",
        text: "Please wait for camera to initialize",
        icon: "warning",
        timer: 2000,
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
        if (event.data && event.data.size > 0)
          recordedChunks.current.push(event.data);
      };
      recorder.onstop = async () => {
        try {
          if (recordedChunks.current.length === 0)
            throw new Error("No data recorded");

          let blob = new Blob(recordedChunks.current, {
            type: recorder.mimeType || "video/webm",
          });

          if (blob.type.includes("webm")) {
            try {
              console.log("Fixing WebM duration...");
              blob = await fixWebmDuration(blob, { duration: recordingTime });
              console.log("WebM duration fixed");
            } catch (fixError) {
              console.warn("Failed to fix WebM duration:", fixError);
            }
          }

          if (videoUrl) URL.revokeObjectURL(videoUrl);
          const newUrl = URL.createObjectURL(blob);
          setVideoUrl(newUrl);
          setRecordedBlob(blob);
          setOriginalSize(blob.size);
          setDuration(recordingTime);
          setCurrentTime(0);
          setStatus("preview");

          setTimeout(() => {
            if (previewVideoRef.current) {
              previewVideoRef.current.load();
              previewVideoRef.current
                .play()
                .catch((e) => console.log("Autoplay prevented"));
            }
          }, 100);
        } catch (error) {
          console.error("Error in recorder.onstop:", error);
          Swal.fire({
            title: "Recording Error",
            text: "Failed to process recording",
            icon: "error",
          });
          setStatus("ready");
        }
      };
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        Swal.fire({
          title: "Recording Error",
          text: "Failed to record video",
          icon: "error",
        });
        setStatus("ready");
      };

      timerRef.current = setInterval(
        () => setRecordingTime((prev) => prev + 1),
        1000,
      );
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setStatus("recording");
    } catch (error) {
      console.error("Recording error:", error);
      Swal.fire({
        title: "Recording Error",
        text: error.message || "Failed to start recording",
        icon: "error",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setRecording(false);
      if (isFullscreen) exitFullscreen();
    }
    stopCamera();
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity) {
      seconds = 0;
    }
    const roundedSeconds = Math.round(seconds);
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const requestFullscreen = (element) => {
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  };

  const toggleFullscreen = () => {
    const element = previewVideoRef.current || cameraVideoRef.current;
    if (!element) return;
    if (!isFullscreen) requestFullscreen(element);
    else exitFullscreen();
  };

  const togglePlayPause = () => {
    const video = previewVideoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (previewVideoRef.current) {
      const time = previewVideoRef.current.currentTime;
      setCurrentTime(time);
      if (
        previewVideoRef.current.duration &&
        isFinite(previewVideoRef.current.duration)
      ) {
        setDuration(previewVideoRef.current.duration);
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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.includes("video")) {
      Swal.fire({
        title: "Invalid File",
        text: "Please select a video file",
        icon: "warning",
      });
      event.target.value = null;
      return;
    }

    setVideoError(false);

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const newUrl = URL.createObjectURL(file);
    setVideoUrl(newUrl);
    setRecordedBlob(file);
    setOriginalSize(file.size);
    setStatus("preview");

    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration && isFinite(tempVideo.duration)) {
        setDuration(tempVideo.duration);
        setRecordingTime(Math.floor(tempVideo.duration));
      }
      tempVideo.remove();
    };
    tempVideo.onerror = () => {
      console.warn(
        "Could not load video metadata, but preview is still available",
      );
      tempVideo.remove();
    };
    tempVideo.src = newUrl;

    event.target.value = null;
  };

  // Show modal when user clicks upload
  const handleUploadClick = () => {
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

    // Open modal to collect video name
    setShowVideoNameModal(true);
    setVideoName("");
    setVideoDescription("");
  };

  // Handle actual upload after collecting video name
  const handleConfirmUpload = async () => {
    // Validate video name
    if (!videoName.trim()) {
      Swal.fire({
        title: "Video Name Required",
        text: "Please enter a name for your video",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    // Close modal
    setShowVideoNameModal(false);

    // Start upload process
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Add video metadata
      formData.append("videoName", videoName.trim());
      formData.append("videoDescription", videoDescription.trim() || "");
      formData.append("recordingDuration", recordingTime || 0);
      formData.append("videoQuality", videoQuality);
      formData.append("originalSize", originalSize || recordedBlob.size);
      formData.append("compressedSize", compressedSize || recordedBlob.size);

      const timestamp = new Date().getTime();

      let videoFile;
      let mimeType;
      let fileExtension;

      if (recordedBlob.type.includes("webm")) {
        mimeType = "video/webm";
        fileExtension = "webm";
      } else if (recordedBlob.type.includes("mp4")) {
        mimeType = "video/mp4";
        fileExtension = "mp4";
      } else {
        mimeType = "video/mp4";
        fileExtension = "mp4";
      }

      // Use the user-provided video name for the filename (sanitize it)
      const sanitizedName = videoName
        .trim()
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const fileName = `${sanitizedName}_${timestamp}.${fileExtension}`;
      videoFile = new File([recordedBlob], fileName, {
        type: mimeType,
        lastModified: Date.now(),
      });

      formData.append("video", videoFile);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const endpoint = `${apiUrl}/api/specialOp/upload-special-video`;

      const response = await axios.post(endpoint, formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
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
          text: `Video "${videoName.trim()}" uploaded successfully!`,
          icon: "success",
          timer: 4000,
          showConfirmButton: false,
        });
        resetState();
      }
    } catch (error) {
      console.error("Upload error:", error);

      if (error.response) {
        Swal.fire({
          title: "Upload Failed",
          text:
            error.response.data?.message ||
            `Server error: ${error.response.status}`,
          icon: "error",
          confirmButtonText: "OK",
        });
      } else if (error.request) {
        Swal.fire({
          title: "Upload Failed",
          text: "No response from server. Please check your connection.",
          icon: "error",
          confirmButtonText: "OK",
        });
      } else {
        Swal.fire({
          title: "Upload Failed",
          text: error.message || "Please try again",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setVideoName("");
      setVideoDescription("");
    }
  };

  const resetState = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setRecordedBlob(null);
    setStatus("idle");
    setRecordingTime(0);
    setOriginalSize(0);
    setCompressedSize(0);
    setDuration(0);
    setCurrentTime(0);
    setVideoError(false);
    setIsPlaying(false);
    stopCamera();
    if (timerRef.current) clearInterval(timerRef.current);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const switchCamera = () =>
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));

  useEffect(() => {
    if (status === "ready" || status === "recording") startCamera();
  }, [cameraFacing]);

  return (
    <div className="bg-gray-900 min-h-screen p-4 w-full mx-auto text-white">
      {/* Video Name Modal */}
      {showVideoNameModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div
            ref={modalRef}
            className="bg-gray-800 rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200"
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">
                Video Information
              </h3>
              <button
                onClick={() => {
                  setShowVideoNameModal(false);
                  setVideoName("");
                  setVideoDescription("");
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <RxCross2 className="text-2xl" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Video Preview Info */}
              {recordedBlob && (
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                  <div className="text-sm text-gray-300">
                    <div className="flex justify-between mb-1">
                      <span>File Size:</span>
                      <span className="font-medium">
                        {(recordedBlob.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">
                        {formatTime(duration || recordingTime)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Video Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                  placeholder="Enter a name for your video"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  maxLength={100}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {videoName.length}/100 characters
                </p>
              </div>

              {/* Video Description (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Add a description for your video..."
                  rows="4"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {videoDescription.length}/500 characters
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowVideoNameModal(false);
                  setVideoName("");
                  setVideoDescription("");
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition font-medium"
              >
                Upload Video
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center justify-center gap-2 ">
          <button
            className="bg-white rounded-full w-8 md:w-6 h-6 flex items-center justify-center group shadow-lg border border-white"
            onClick={() => navigate(-1)}
          >
            <IoArrowBack
              size={18}
              className="text-black/70 group-hover:animate-ping"
            />
          </button>
          <h2 className="text-xl font-semibold hidden md:block">
            {status === "preview" ? "Video Preview" : "Video Upload & Record"}
          </h2>
          <h2 className="block md:hidden">&nbsp;</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={qualityMenuRef}>
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
              disabled={recording || uploading}
            >
              <FaCog className="text-sm" />
              <span>{qualityPresets[videoQuality]?.name || "Medium"}</span>
            </button>
            {showQualityMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                {Object.entries(qualityPresets).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setVideoQuality(key);
                      setShowQualityMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 ${
                      videoQuality === key ? "bg-blue-600" : ""
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* <button
            className="p-1.5 hover:bg-red-600 rounded-lg"
            onClick={() => {
              if (!uploading && !recording) resetState();
            }}
            disabled={uploading || recording}
          >
            <RxCross2 className="text-xl" />
          </button> */}
        </div>
      </div>

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

      <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-black mb-4 h-[100vh] min-h-[400px]">
        {status === "recording" && (
          <div className="absolute top-3 left-3 z-20 bg-red-600/90 text-white px-2.5 py-1 rounded-md flex items-center shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
            <span className="font-mono font-bold text-sm">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {(status === "preview" || status === "recording") && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        )}

        <div className="w-full h-full flex items-center justify-center">
          {status !== "preview" ? (
            <video
              ref={cameraVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="relative w-full h-full">
              <video
                ref={previewVideoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={() => {
                  if (
                    previewVideoRef.current &&
                    previewVideoRef.current.duration &&
                    isFinite(previewVideoRef.current.duration)
                  ) {
                    setDuration(previewVideoRef.current.duration);
                  }
                }}
                onError={() => {
                  console.warn(
                    "Video preview error, but buttons will still work",
                  );
                }}
              />

              <div className="left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <input
                  type="range"
                  min="0"
                  max={duration || recordingTime || 1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 ${
                      (currentTime / (duration || recordingTime || 1)) * 100
                    }%, #4b5563 ${(currentTime / (duration || recordingTime || 1)) * 100}%)`,
                  }}
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-white">
                    {formatTime(currentTime)} /{" "}
                    {formatTime(duration || recordingTime)}
                  </div>
                  <button
                    onClick={togglePlayPause}
                    className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition"
                  >
                    {isPlaying ? <FaPause /> : <FaPlay />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {status === "loading" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <ClipLoader size={30} color="#3B82F6" />
            <p className="mt-3 text-sm">Starting camera...</p>
          </div>
        )}
      </div>

      {status === "preview" && recordedBlob && (
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
                {formatTime(duration || recordingTime)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs">Status</div>
              <div className="font-medium text-green-400">Ready</div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 text-center text-sm text-gray-300 hidden md:block">
        {status === "idle" && "Select an option to begin"}
        {status === "ready" && "Camera ready - Position your video"}
        {status === "recording" && `Recording - ${formatTime(recordingTime)}`}
        {status === "preview" && "Review your video"}
        {status === "error" && "Error occurred. Please try again."}
      </div>

      <div className="space-y-3 mt-4 max-w-md mx-auto">
        {status === "idle" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={startCamera}
              className="flex justify-center md:flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700 px-2 py-4 rounded-md md:rounded-lg"
            >
              <FaCamera className="text-xl" />
              <div className="text-sm">Open Camera</div>
            </button>
            <label className="flex justify-center md:flex-col items-center gap-2 bg-gray-700 hover:bg-gray-800 px-2 py-4 rounded-md md:rounded-lg cursor-pointer">
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
              className="flex-1 flex items-center gap-3 bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl"
            >
              <div className="relative">
                <div className="w-4 h-4 bg-white rounded-full" />
                <div className="w-4 h-4 bg-red-300 rounded-full absolute top-0 animate-ping" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Start Recording</div>
                <div className="text-xs opacity-75">Begin recording</div>
              </div>
            </button>
            <div className="flex flex-col gap-2">
              <button
                onClick={switchCamera}
                className="px-2 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
              >
                <FaSyncAlt /> Switch
              </button>
              <button
                onClick={resetState}
                className="px-2 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="w-full flex items-center gap-3 bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl animate-pulse"
          >
            <FaStop className="text-xl" />
            <div className="text-left">
              <div className="font-semibold">Stop Recording</div>
              <div className="text-xs opacity-75">Finish recording</div>
            </div>
          </button>
        )}

        {status === "preview" && (
          <div className="flex gap-3">
            <button
              onClick={resetState}
              className="flex-1 flex items-center gap-3 bg-yellow-600 hover:bg-yellow-700 px-5 py-3 rounded-xl"
              disabled={uploading}
            >
              <FaRedo />
              <div className="text-left">
                <div className="font-semibold">Re-record</div>
                <div className="text-xs opacity-75">Try again</div>
              </div>
            </button>
            <button
              onClick={handleUploadClick}
              className="flex-1 flex items-center gap-3 bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl"
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

      <div className="mt-0 pt-4 md:pt-0 border-t border-gray-800 text-center text-xs text-gray-500">
        Quality: {qualityPresets[videoQuality]?.name || "Medium"}{" "}
        <span className="hidden">• </span>
        {/* {isMobile ? "📱 Mobile" : "🖥️ Desktop"} */}
      </div>
    </div>
  );
};

export default SpecialVideoUpload;
