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
} from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { ClipLoader } from "react-spinners";
import Swal from "sweetalert2";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const CameraOrBrowse = ({
  setIsUploading,
  uploadingData,
  setUploadingMaterial,
}) => {
  // FFmpeg instance
  const ffmpegRef = useRef(null);

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

  // Refs
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const qualityMenuRef = useRef(null);

  // Quality presets for compression
  const qualityPresets = {
    low: {
      name: "Low",
      bitrate: 3000,
      maxrate: "4000k",
      bufsize: "6000k",
      resolution: "854x480",
      fps: 24,
    },
    medium: {
      name: "Medium",
      bitrate: 5000,
      maxrate: "6000k",
      bufsize: "8000k",
      resolution: "1280x720",
      fps: 25,
    },
    high: {
      name: "High",
      bitrate: 8000,
      maxrate: "10000k",
      bufsize: "12000k",
      resolution: "1920x1080",
      fps: 30,
    },
  };

  // Check if mobile device
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

    // Initialize FFmpeg
    const loadFFmpeg = async () => {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      try {
        await ffmpeg.load({
          coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js",
          wasmURL:
            "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm",
        });
      } catch (error) {
        console.error("FFmpeg load error:", error);
      }
    };
    loadFFmpeg();

    // Fullscreen change listener
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Close quality menu when clicking outside
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
          frameRate: { ideal: 30 },
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
      Swal.fire({
        title: "Camera Error",
        text: error.message,
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
  };

  // Start recording
  const startRecording = () => {
    if (!mediaStream) return;

    recordedChunks.current = [];
    setRecordingTime(0);

    const options = {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm;codecs=vp8,opus",
      videoBitsPerSecond: qualityPresets[videoQuality].bitrate * 1000,
    };

    try {
      const recorder = new MediaRecorder(mediaStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunks.current, { type: "video/webm" });
        const videoUrl = URL.createObjectURL(blob);

        setOriginalSize(blob.size);
        setRecordedVideo(videoUrl);
        setRecordedBlob(blob);
        setStatus("preview");

        if (previewVideoRef.current) {
          previewVideoRef.current.src = videoUrl;
          previewVideoRef.current.load();
        }
      };

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setStatus("recording");

      // Enter fullscreen on mobile when recording starts
      if (isMobile && videoRef.current) {
        requestFullscreen(videoRef.current);
      }
    } catch (error) {
      console.error("Recording error:", error);
      setStatus("error");
      Swal.fire({
        title: "Recording Error",
        text: error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setRecording(false);

      // Exit fullscreen
      if (isFullscreen) {
        exitFullscreen();
      }
    }
    stopCamera();
  };

  // Format time to MM:SS
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
    if (!isFullscreen) {
      requestFullscreen(previewVideoRef.current || videoRef.current);
    } else {
      exitFullscreen();
    }
  };

  // Video compression using FFmpeg
  const compressVideo = async (inputBlob) => {
    if (!ffmpegRef.current) {
      throw new Error("FFmpeg not loaded");
    }

    const ffmpeg = ffmpegRef.current;

    setCompressProgress(30);

    // Write input file to FFmpeg
    const inputName = "input.webm";
    await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));

    setCompressProgress(50);

    // Get video duration for bitrate calculation
    const tempVideo = document.createElement("video");
    tempVideo.src = URL.createObjectURL(inputBlob);

    await new Promise((resolve) => {
      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(tempVideo.src);
        resolve();
      };
    });

    const duration = tempVideo.duration || 90;
    const targetSize = 90 * 1024 * 1024;
    const targetBitrate = Math.floor((targetSize * 8) / duration / 1000) - 100;

    const preset = qualityPresets[videoQuality];
    const bitrate = Math.min(preset.bitrate, targetBitrate) + "k";

    console.log(
      `Compressing: ${duration}s, target: ${targetSize} bytes, bitrate: ${bitrate}`,
    );

    try {
      // Run FFmpeg command
      await ffmpeg.exec([
        "-i",
        inputName,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-b:v",
        bitrate,
        "-maxrate",
        preset.maxrate,
        "-bufsize",
        preset.bufsize,
        "-vf",
        `scale=${preset.resolution},fps=${preset.fps}`,
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "output.mp4",
      ]);

      setCompressProgress(90);

      // Read output file
      const data = await ffmpeg.readFile("output.mp4");
      const compressedBlob = new Blob([data], { type: "video/mp4" });

      // Clean up
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile("output.mp4");

      setCompressedSize(compressedBlob.size);
      setCompressProgress(100);

      console.log(
        `Compression complete: ${(compressedBlob.size / (1024 * 1024)).toFixed(2)}MB`,
      );

      return compressedBlob;
    } catch (error) {
      console.error("FFmpeg error:", error);
      throw new Error("Compression failed: " + error.message);
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

    if (file.size > 95 * 1024 * 1024) {
      // Need compression
      setStatus("compressing");
      setCompressing(true);
      setCompressProgress(0);

      try {
        const compressedBlob = await compressVideo(file);
        const videoUrl = URL.createObjectURL(compressedBlob);

        setRecordedVideo(videoUrl);
        setRecordedBlob(compressedBlob);
        setStatus("preview");

        if (previewVideoRef.current) {
          previewVideoRef.current.src = videoUrl;
          previewVideoRef.current.load();
        }
      } catch (error) {
        console.error("Compression error:", error);
        Swal.fire({
          title: "Compression Failed",
          text: "Unable to compress video. Please try a smaller file.",
          icon: "error",
          confirmButtonText: "OK",
        });
        setStatus("idle");
      } finally {
        setCompressing(false);
        setCompressProgress(0);
      }
    } else {
      // No compression needed
      const videoUrl = URL.createObjectURL(file);
      setRecordedVideo(videoUrl);
      setRecordedBlob(file);
      setStatus("preview");

      if (previewVideoRef.current) {
        previewVideoRef.current.src = videoUrl;
        previewVideoRef.current.load();
      }
    }
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

    // Final size check
    if (recordedBlob.size > 100 * 1024 * 1024) {
      Swal.fire({
        title: "File Too Large",
        text: `Video is ${(recordedBlob.size / (1024 * 1024)).toFixed(1)}MB. Maximum is 100MB.`,
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

      // Add recording metadata
      formData.append("recordingDuration", recordingTime);
      formData.append("videoQuality", videoQuality);
      formData.append("originalSize", originalSize);
      formData.append("compressedSize", compressedSize || recordedBlob.size);

      const timestamp = new Date().getTime();
      const fileName = `sawing-operation-${timestamp}.mp4`;
      formData.append("video", recordedBlob, fileName);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

      const response = await axios.post(
        `${apiUrl}/api/subOperationMedia/uploadVideos`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart-form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setUploadProgress(percentCompleted);
            }
          },
          timeout: 600000,
        },
      );

      if (response.status === 201 && response.data.success === true) {
        let alertConfig = {
          title: "Success!",
          text: "Video uploaded successfully!",
          icon: "success",
          timer: 4000,
          showConfirmButton: false,
        };

        if (response.data.storageType === "local" || response.data.warning) {
          alertConfig = {
            title: "Uploaded with Note",
            text: response.data.warning || "Video saved to local storage",
            icon: "warning",
            timer: 5000,
            showConfirmButton: false,
          };
        }

        Swal.fire(alertConfig);

        // Cleanup
        if (recordedVideo) URL.revokeObjectURL(recordedVideo);
        resetState();
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);

      let errorMessage = "Upload failed. Please try again.";
      if (error.response?.status === 413) {
        errorMessage = "File too large for server. Please compress further.";
      } else if (error.response?.status === 415) {
        errorMessage = "Unsupported video format.";
      } else if (!error.response) {
        errorMessage = "Network error. Please check your connection.";
      }

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

  // Reset state
  const resetState = () => {
    setRecordedVideo(null);
    setRecordedBlob(null);
    setStatus("idle");
    setRecordingTime(0);
    setOriginalSize(0);
    setCompressedSize(0);
    stopCamera();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Switch camera
  const switchCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Initialize camera when facing mode changes
  useEffect(() => {
    if (status === "ready" || status === "recording") {
      startCamera();
    }
  }, [cameraFacing]);

  return (
    <div className="bg-gray-900 min-h-screen p-4 w-full mx-auto text-white">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {status === "preview" ? "Video Preview" : "Record Operation"}
        </h2>
        <div className="flex items-center gap-2">
          {/* Quality Selector Dropdown */}
          <div className="relative" ref={qualityMenuRef}>
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
            >
              <FaCog className="text-sm" />
              <span className="hidden sm:inline">
                {qualityPresets[videoQuality].name}
              </span>
              <span className="sm:hidden">Quality</span>
            </button>

            {showQualityMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <div className="text-xs text-gray-400 px-2 py-1">
                    Video Quality
                  </div>
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
                      <div className="flex justify-between items-center">
                        <span>{preset.name}</span>
                        <span className="text-xs text-gray-400">
                          {preset.resolution.split("x")[1]}p
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            className="p-1.5 hover:bg-red-600 rounded-lg transition"
            onClick={() => setUploadingMaterial(null)}
            disabled={uploading || compressing || recording}
          >
            <RxCross2 className="text-xl" />
          </button>
        </div>
      </div>

      {/* Progress Indicators */}
      {(uploading || compressing) && (
        <div className="mb-4 space-y-3">
          {compressing && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-yellow-400">Compressing...</span>
                <span>{compressProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: `${compressProgress}%` }}
                ></div>
              </div>
            </div>
          )}
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
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAIN VIDEO PREVIEW - LARGER */}
      <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-black mb-4 h-[60vh] min-h-[400px]">
        {/* Recording Timer */}
        {status === "recording" && (
          <div className="absolute top-3 left-3 z-20 bg-red-600/90 text-white px-2.5 py-1 rounded-md flex items-center shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse"></div>
            <span className="font-mono font-bold text-sm">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {/* Fullscreen Toggle */}
        {(status === "preview" || status === "recording") && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-20 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded backdrop-blur-sm transition"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <FaCompress className="text-sm" />
            ) : (
              <FaExpand className="text-sm" />
            )}
          </button>
        )}

        {/* Video Element */}
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
              controls
              playsInline
              className="w-full h-full object-contain"
              onLoadedMetadata={() => {
                if (previewVideoRef.current) {
                  previewVideoRef.current.play().catch(console.log);
                }
              }}
            />
          )}
        </div>

        {/* Overlay Messages */}
        {status === "loading" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <ClipLoader size={30} color="#3B82F6" />
              <p className="mt-3 text-sm">Initializing camera...</p>
            </div>
          </div>
        )}
        {status === "compressing" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <ClipLoader size={30} color="#F59E0B" />
              <p className="mt-3 text-sm">Compressing video...</p>
            </div>
          </div>
        )}
      </div>

      {/* Compact Stats */}
      {status === "preview" && recordedBlob && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400">
            <span>
              Size: {(recordedBlob.size / (1024 * 1024)).toFixed(1)}MB
            </span>
            <span>Duration: {formatTime(recordingTime)}</span>
            {originalSize > recordedBlob.size && (
              <span className="text-green-400">
                Saved{" "}
                {((originalSize - recordedBlob.size) / (1024 * 1024)).toFixed(
                  1,
                )}
                MB
              </span>
            )}
          </div>
        </div>
      )}

      {/* Compact Status Indicator */}
      <div className="mb-4">
        <div className="flex items-center justify-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status === "recording"
                ? "bg-red-500 animate-pulse"
                : status === "ready"
                  ? "bg-green-500"
                  : status === "preview"
                    ? "bg-blue-500"
                    : "bg-gray-500"
            }`}
          ></div>
          <span className="text-sm text-gray-300">
            {status === "idle" && "Ready to record or upload"}
            {status === "ready" && "Camera ready - Start recording"}
            {status === "recording" &&
              `Recording - ${formatTime(recordingTime)}`}
            {status === "preview" && "Preview your video"}
          </span>
        </div>
      </div>

      {/* COMPACT ACTION BUTTONS */}
      <div className="space-y-2">
        {/* Idle State */}
        {status === "idle" && (
          <div className="flex gap-2">
            <button
              onClick={startCamera}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2.5 rounded-lg font-medium text-sm transition"
              disabled={uploading || compressing}
            >
              <FaCamera />
              <span>Open Camera</span>
            </button>
            <label className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2.5 rounded-lg font-medium text-sm cursor-pointer transition">
              <FaUpload />
              <span>Upload Video</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading || compressing}
              />
            </label>
          </div>
        )}

        {/* Ready State */}
        {status === "ready" && (
          <div className="flex gap-2">
            <button
              onClick={startRecording}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2.5 rounded-lg font-medium text-sm transition"
            >
              <div className="relative">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <div className="w-3 h-3 bg-red-300 rounded-full absolute top-0 animate-ping opacity-75"></div>
              </div>
              <span>Start Recording</span>
            </button>
            <button
              onClick={switchCamera}
              className="px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition flex items-center gap-2 text-sm"
            >
              <FaSyncAlt />
              <span className="hidden sm:inline">Switch</span>
            </button>
            <button
              onClick={resetState}
              className="px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Recording State */}
        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2.5 rounded-lg font-medium text-sm transition animate-pulse"
          >
            <FaStop />
            <span>Stop Recording</span>
          </button>
        )}

        {/* Preview State */}
        {status === "preview" && (
          <div className="flex gap-2">
            <button
              onClick={resetState}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-3 py-2.5 rounded-lg font-medium text-sm transition"
              disabled={uploading}
            >
              <FaRedo />
              <span>Re-record</span>
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? <ClipLoader size={14} color="white" /> : <FaCheck />}
              <span>{uploading ? "Uploading..." : "Upload"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Minimal Footer */}
      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="flex justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>Ready</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              <span>Recording</span>
            </div>
          </div>
          <span>Max: 100MB • {isMobile ? "Mobile" : "Desktop"}</span>
        </div>
      </div>
    </div>
  );
};

export default CameraOrBrowse;
