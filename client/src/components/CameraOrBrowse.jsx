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
  const [recordedFile, setRecordedFile] = useState(null); // NEW: Store File object
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

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

  // Handle video events for preview
  const handleVideoPlay = () => setIsVideoPlaying(true);
  const handleVideoPause = () => setIsVideoPlaying(false);
  const handleVideoEnded = () => setIsVideoPlaying(false);
  const handleVideoError = () => setVideoError(true);

  // Initialize video event listeners
  useEffect(() => {
    const videoElement = previewVideoRef.current;
    if (videoElement && status === "preview") {
      videoElement.addEventListener("play", handleVideoPlay);
      videoElement.addEventListener("pause", handleVideoPause);
      videoElement.addEventListener("ended", handleVideoEnded);
      videoElement.addEventListener("error", handleVideoError);

      // Auto-play preview on mobile
      if (isMobile && videoElement.src) {
        setTimeout(() => {
          videoElement.play().catch((e) => {
            console.log("Auto-play prevented:", e);
          });
        }, 500);
      }
    }

    return () => {
      if (videoElement) {
        videoElement.removeEventListener("play", handleVideoPlay);
        videoElement.removeEventListener("pause", handleVideoPause);
        videoElement.removeEventListener("ended", handleVideoEnded);
        videoElement.removeEventListener("error", handleVideoError);
      }
    };
  }, [status, isMobile]);

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
    setVideoError(false);

    const options = {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=h264,opus")
          ? "video/webm;codecs=h264,opus"
          : "video/webm",
      videoBitsPerSecond: qualityPresets[videoQuality].bitrate * 1000,
      audioBitsPerSecond: 128000,
    };

    try {
      const recorder = new MediaRecorder(mediaStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunks.current, {
          type: recorder.mimeType || "video/webm",
        });

        // Create a File object from the Blob
        const timestamp = new Date().getTime();
        const fileName = `recording-${timestamp}.mp4`;
        const file = new File([blob], fileName, {
          type: "video/mp4", // Force MP4 type
          lastModified: Date.now(),
        });

        const videoUrl = URL.createObjectURL(blob);

        setOriginalSize(blob.size);
        setRecordedVideo(videoUrl);
        setRecordedBlob(blob);
        setRecordedFile(file); // Store File object
        setStatus("preview");
        setVideoError(false);

        // Small delay to ensure video element is ready
        setTimeout(() => {
          if (
            previewVideoRef.current &&
            previewVideoRef.current.src !== videoUrl
          ) {
            previewVideoRef.current.src = videoUrl;
            previewVideoRef.current.load();
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
    const element = previewVideoRef.current || videoRef.current;
    if (!element) return;

    if (!isFullscreen) {
      requestFullscreen(element);
    } else {
      exitFullscreen();
    }
  };

  // Video playback controls
  const toggleVideoPlayback = () => {
    if (previewVideoRef.current) {
      if (previewVideoRef.current.paused) {
        previewVideoRef.current.play().catch(console.error);
      } else {
        previewVideoRef.current.pause();
      }
    }
  };

  // Video compression using FFmpeg
  const compressVideo = async (inputBlob, fileName) => {
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

      // Create File object instead of just Blob
      const compressedFile = new File([data], fileName, {
        type: "video/mp4",
        lastModified: Date.now(),
      });

      // Clean up
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile("output.mp4");

      setCompressedSize(compressedFile.size);
      setCompressProgress(100);

      console.log(
        `Compression complete: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`,
      );

      return compressedFile;
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
        const compressedFile = await compressVideo(file, file.name);
        const videoUrl = URL.createObjectURL(compressedFile);

        setRecordedVideo(videoUrl);
        setRecordedBlob(compressedFile);
        setRecordedFile(compressedFile); // Store File object
        setStatus("preview");
        setVideoError(false);

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
      setRecordedFile(file); // Store original File object
      setStatus("preview");
      setVideoError(false);

      if (previewVideoRef.current) {
        previewVideoRef.current.src = videoUrl;
        previewVideoRef.current.load();
      }
    }
  };

  // Main upload handler - FIXED VERSION
  const handleUpload = async () => {
    // Use recordedFile instead of recordedBlob for upload
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

    // Final size check
    if (recordedFile.size > 100 * 1024 * 1024) {
      Swal.fire({
        title: "File Too Large",
        text: `Video is ${(recordedFile.size / (1024 * 1024)).toFixed(1)}MB. Maximum is 100MB.`,
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
      formData.append("compressedSize", compressedSize || recordedFile.size);

      // Append the File object directly
      // Ensure the file has correct extension (.mp4) for backend validation
      let fileName = recordedFile.name;
      if (!fileName.toLowerCase().endsWith(".mp4")) {
        fileName = fileName.replace(/\.[^/.]+$/, "") + ".mp4";
      }

      formData.append("video", recordedFile, fileName);

      // Debug: Log FormData contents
      console.log("Uploading file details:");
      console.log("File name:", fileName);
      console.log("File type:", recordedFile.type);
      console.log("File size:", recordedFile.size);

      for (let pair of formData.entries()) {
        console.log(pair[0] + ":", pair[1]);
      }

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

      // IMPORTANT: Don't set Content-Type header for FormData
      // axios will automatically set it with the correct boundary
      const response = await axios.post(
        `${apiUrl}/api/subOperationMedia/uploadVideos`,
        formData,
        {
          withCredentials: true,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setUploadProgress(percentCompleted);
            }
          },
          timeout: 600000,
          // Add headers for debugging
          headers: {
            Accept: "application/json",
          },
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
      console.error("Error details:", error.response?.data);

      let errorMessage = "Upload failed. Please try again.";
      if (error.response?.status === 413) {
        errorMessage = "File too large for server. Please compress further.";
      } else if (error.response?.status === 415) {
        errorMessage = "Unsupported video format.";
      } else if (error.response?.status === 400) {
        errorMessage =
          error.response.data?.message ||
          "Invalid file format. Please ensure you're uploading a valid video file.";
      } else if (error.code === "ECONNABORTED") {
        errorMessage = "Upload timeout. Please try again with a smaller file.";
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
    setRecordedFile(null);
    setStatus("idle");
    setRecordingTime(0);
    setOriginalSize(0);
    setCompressedSize(0);
    setIsVideoPlaying(false);
    setVideoError(false);
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
      <div className="flex justify-between items-center pt-12">
        <h2 className="text-xl font-semibold">
          {status === "preview" ? "Video Preview" : "Record Operation"}
        </h2>
        <div className="flex items-center gap-2">
          {/* Quality Selector Dropdown */}
          <div className="relative" ref={qualityMenuRef}>
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
              disabled={recording || compressing || uploading}
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
            onClick={() => {
              if (!uploading && !compressing && !recording) {
                setUploadingMaterial(null);
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

      {/* MAIN VIDEO PREVIEW */}
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

        {/* Video Error Message */}
        {videoError && status === "preview" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center p-4">
              <div className="text-red-400 text-lg mb-2">
                ⚠️ Video Playback Error
              </div>
              <p className="text-gray-300 text-sm">
                The video cannot be played. Please try re-recording.
              </p>
              <button
                onClick={resetState}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
              >
                Re-record Video
              </button>
            </div>
          </div>
        )}

        {/* Video Playback Controls (for preview) */}
        {status === "preview" && !videoError && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <button
              onClick={toggleVideoPlayback}
              className="bg-black/60 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-sm transition transform hover:scale-105"
            >
              {isVideoPlaying ? <FaPause /> : <FaPlay />}
            </button>
          </div>
        )}

        {/* Fullscreen Toggle */}
        {(status === "preview" || status === "recording") && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
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
              src={recordedVideo}
              controls={!videoError}
              playsInline
              className="w-full h-full object-contain"
              poster={videoError ? "" : undefined}
              onLoadedData={() => {
                console.log("Video loaded successfully");
                setVideoError(false);
              }}
              onError={(e) => {
                console.error("Video error:", e);
                setVideoError(true);
              }}
              autoPlay
            />
          )}
        </div>

        {/* Overlay Messages */}
        {status === "loading" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <ClipLoader size={30} color="#3B82F6" />
              <p className="mt-3 text-sm">Starting camera...</p>
            </div>
          </div>
        )}
        {status === "compressing" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <ClipLoader size={30} color="#F59E0B" />
              <p className="mt-3 text-lg font-medium">Optimizing Video Size</p>
              <p className="text-sm text-gray-300 mt-2">
                Compressing for Cloudflare...
              </p>
              <div className="mt-3 w-48 mx-auto bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${compressProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {compressProgress}% complete
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Compact Stats */}
      {status === "preview" && recordedFile && !videoError && (
        <div className="bg-gray-800/30 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-400 text-xs">File Size</div>
              <div className="font-medium">
                {(recordedFile.size / (1024 * 1024)).toFixed(1)} MB
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs">Duration</div>
              <div className="font-medium">{formatTime(recordingTime)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs">Status</div>
              <div
                className={`font-medium ${recordedFile.size > 95 * 1024 * 1024 ? "text-red-400" : "text-green-400"}`}
              >
                {recordedFile.size > 95 * 1024 * 1024
                  ? "Needs Compression"
                  : "Ready"}
              </div>
            </div>
          </div>
          {originalSize > recordedFile.size && (
            <div className="text-center text-xs text-green-400 mt-2">
              ✓ Saved{" "}
              {((originalSize - recordedFile.size) / (1024 * 1024)).toFixed(1)}
              MB
            </div>
          )}
        </div>
      )}

      {/* Compact Status Indicator */}
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
          ></div>
          <span className="text-sm text-gray-300">
            {status === "idle" && "Select an option to begin"}
            {status === "ready" && "Camera ready - Position your operation"}
            {status === "recording" &&
              `Recording - ${formatTime(recordingTime)}`}
            {status === "preview" && "Review your video"}
            {status === "compressing" && "Optimizing video..."}
          </span>
        </div>
      </div>

      {/* COMPACT ACTION BUTTONS */}
      <div className="space-y-3 max-w-md mx-auto">
        {/* Idle State */}
        {status === "idle" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={startCamera}
              className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-2 py-2 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-900/30 disabled:opacity-50"
              disabled={uploading || compressing}
              title="Start recording"
            >
              <FaCamera className="text-sm" />
              <div className="text-sm">Open Camera</div>
              <div className="hidden md:block text-xs opacity-75">
                Record new video
              </div>
            </button>
            <label className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 px-2 py-2 rounded-xl font-medium cursor-pointer transition-all duration-200 shadow-lg shadow-gray-900/30 disabled:opacity-50">
              <FaUpload className="text-sm" />
              <div className="text-sm">Upload Video</div>
              <div className="hidden md:block text-xs opacity-75">
                Select existing file
              </div>
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
          <div className="flex gap-3">
            <button
              onClick={startRecording}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-5 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-red-900/30"
            >
              <div className="relative">
                <div className="w-4 h-4 bg-white rounded-full"></div>
                <div className="w-4 h-4 bg-red-300 rounded-full absolute top-0 animate-ping opacity-75"></div>
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

        {/* Recording State */}
        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-5 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-red-900/30 animate-pulse"
          >
            <FaStop className="text-xl" />
            <div className="text-left">
              <div className="font-semibold">Stop Recording</div>
              <div className="text-xs opacity-75">Finish operation</div>
            </div>
          </button>
        )}

        {/* Preview State */}
        {status === "preview" && !videoError && (
          <div className="flex gap-3">
            <button
              onClick={resetState}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 px-5 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-yellow-900/30 disabled:opacity-50"
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
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-green-900/30 disabled:opacity-50"
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

        {/* Video Error State */}
        {status === "preview" && videoError && (
          <div className="text-center">
            <button
              onClick={resetState}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-2 py-2 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-red-900/30"
            >
              <FaRedo />
              <div className="text-left">
                <div className="font-semibold">Re-record Video</div>
                <div className="text-xs opacity-75">
                  Previous video had issues
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Footer */}
      <div className="mt-8 pt-4 border-t border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
          <div className="flex items-center gap-4">
            {/* <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Camera Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Recording</span>
            </div> */}
          </div>
          <div className="text-center">
            <span className="inline-flex items-center gap-1 bg-gray-800/50 px-2 py-1 rounded">
              <FaVideo className="text-xs" />
              Max 100MB • Auto-compression •{" "}
              {isMobile ? "📱 Mobile" : "🖥️ Desktop"}
            </span>
          </div>
          <div className="text-right">
            <span>Quality: {qualityPresets[videoQuality].name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraOrBrowse;
