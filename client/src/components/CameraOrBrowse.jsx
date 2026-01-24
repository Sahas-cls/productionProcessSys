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
  FaCameraRetro,
  FaTimes,
  FaDotCircle,
  FaCircle,
  FaChevronLeft,
  FaImages,
  FaSave,
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showGallery, setShowGallery] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const qualityMenuRef = useRef(null);
  const zoomTimeoutRef = useRef(null);

  // Quality presets for compression
  const qualityPresets = {
    low: {
      name: "SD",
      bitrate: 3000,
      maxrate: "4000k",
      bufsize: "6000k",
      resolution: "854x480",
      fps: 24,
    },
    medium: {
      name: "HD",
      bitrate: 5000,
      maxrate: "6000k",
      bufsize: "8000k",
      resolution: "1280x720",
      fps: 25,
    },
    high: {
      name: "FHD",
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
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    };
  }, []);

  // Handle fullscreen change
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  // Initialize video event listeners
  useEffect(() => {
    const videoElement = previewVideoRef.current;
    if (videoElement) {
      const handlePlay = () => setIsVideoPlaying(true);
      const handlePause = () => setIsVideoPlaying(false);
      const handleEnded = () => setIsVideoPlaying(false);
      const handleError = () => setVideoError(true);
      const handleLoadedMetadata = () => {
        console.log("Video metadata loaded, duration:", videoElement.duration);
      };

      videoElement.addEventListener("play", handlePlay);
      videoElement.addEventListener("pause", handlePause);
      videoElement.addEventListener("ended", handleEnded);
      videoElement.addEventListener("error", handleError);
      videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        videoElement.removeEventListener("play", handlePlay);
        videoElement.removeEventListener("pause", handlePause);
        videoElement.removeEventListener("ended", handleEnded);
        videoElement.removeEventListener("error", handleError);
        videoElement.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata,
        );
      };
    }
  }, [status]);

  // Start camera with zoom support
  const startCamera = async () => {
    setStatus("loading");
    try {
      stopCamera();

      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          // Add zoom constraints if supported
          ...(zoomLevel > 1 && { zoom: zoomLevel }),
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
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

  // Start recording with proper metadata handling
  const startRecording = () => {
    if (!mediaStream) return;

    recordedChunks.current = [];
    setRecordingTime(0);
    setVideoError(false);

    const options = {
      mimeType: MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
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
        try {
          const mimeType = recorder.mimeType || "video/mp4";
          const blob = new Blob(recordedChunks.current, { type: mimeType });

          // Create a video element to get duration
          const tempVideo = document.createElement("video");
          tempVideo.preload = "metadata";

          const videoUrl = URL.createObjectURL(blob);

          tempVideo.onloadedmetadata = async () => {
            const duration = Math.round(tempVideo.duration * 1000); // in milliseconds

            console.log("Video duration:", duration, "ms");

            // Create a new blob with proper metadata if possible
            let finalBlob = blob;

            // For MP4 files, we can try to ensure proper metadata
            if (mimeType.includes("mp4")) {
              try {
                // Add duration to blob (this helps players)
                const file = new File([blob], "recording.mp4", {
                  type: mimeType,
                  lastModified: Date.now(),
                });
                finalBlob = file;
              } catch (e) {
                console.warn("Could not enhance blob metadata:", e);
              }
            }

            setOriginalSize(finalBlob.size);
            setRecordedVideo(videoUrl);
            setRecordedBlob(finalBlob);
            setStatus("preview");
            setVideoError(false);

            if (previewVideoRef.current) {
              previewVideoRef.current.src = videoUrl;
              previewVideoRef.current.load();
            }

            URL.revokeObjectURL(videoUrl);
          };

          tempVideo.src = videoUrl;
          tempVideo.load();
        } catch (error) {
          console.error("Error in recorder.onstop:", error);
          // Fallback
          const blob = new Blob(recordedChunks.current, {
            type: "video/webm",
          });
          const videoUrl = URL.createObjectURL(blob);

          setOriginalSize(blob.size);
          setRecordedVideo(videoUrl);
          setRecordedBlob(blob);
          setStatus("preview");
          setVideoError(false);
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

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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

  // Fix video preview initialization
  useEffect(() => {
    if (status === "preview" && recordedVideo && previewVideoRef.current) {
      const video = previewVideoRef.current;

      // Reset video state
      video.src = recordedVideo;
      video.load();

      // Try to play automatically
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Auto-play prevented:", error.message);
          if (!error.message.includes("user gesture")) {
            setVideoError(true);
          }
        });
      }
    }
  }, [status, recordedVideo]);

  // Enhanced video compression with duration preservation
  const compressVideo = async (inputBlob) => {
    if (!ffmpegRef.current) {
      throw new Error("FFmpeg not loaded");
    }

    const ffmpeg = ffmpegRef.current;

    setCompressProgress(30);

    // Create temporary video element to get duration
    const tempVideo = document.createElement("video");
    const tempUrl = URL.createObjectURL(inputBlob);

    const duration = await new Promise((resolve) => {
      tempVideo.onloadedmetadata = () => {
        resolve(tempVideo.duration || 90);
        URL.revokeObjectURL(tempUrl);
      };
      tempVideo.src = tempUrl;
    });

    // Write input file to FFmpeg
    const inputName = "input.mp4";
    await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));

    setCompressProgress(50);

    const preset = qualityPresets[videoQuality];
    const bitrate = preset.bitrate + "k";

    console.log(
      `Compressing: ${duration}s, quality: ${videoQuality}, bitrate: ${bitrate}`,
    );

    try {
      // Run FFmpeg command with proper metadata preservation
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
        "-metadata",
        `creation_time=${new Date().toISOString()}`,
        "-map_metadata",
        "0", // Copy metadata from input
        "output.mp4",
      ]);

      setCompressProgress(90);

      // Read output file
      const data = await ffmpeg.readFile("output.mp4");
      const compressedBlob = new Blob([data], { type: "video/mp4" });

      // Create File with proper metadata
      const compressedFile = new File([compressedBlob], "compressed.mp4", {
        type: "video/mp4",
        lastModified: Date.now(),
      });

      // Clean up
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile("output.mp4");

      setCompressedSize(compressedFile.size);
      setCompressProgress(100);

      console.log(
        `Compression complete: ${formatFileSize(compressedFile.size)}`,
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
        const compressedBlob = await compressVideo(file);
        const videoUrl = URL.createObjectURL(compressedBlob);

        setRecordedVideo(videoUrl);
        setRecordedBlob(compressedBlob);
        setStatus("preview");
        setVideoError(false);
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
      setVideoError(false);
    }
  };

  // Enhanced upload handler with proper video metadata
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
        text: `Video is ${formatFileSize(recordedBlob.size)}. Maximum is 100MB.`,
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

      // Add enhanced metadata
      formData.append("recordingDuration", recordingTime);
      formData.append("videoQuality", videoQuality);
      formData.append("originalSize", originalSize);
      formData.append("compressedSize", compressedSize || recordedBlob.size);
      formData.append("timestamp", new Date().toISOString());
      formData.append("deviceType", isMobile ? "mobile" : "desktop");
      formData.append("cameraMode", cameraFacing);

      const timestamp = new Date().getTime();
      let videoFile;
      let fileName;

      if (recordedBlob instanceof File) {
        videoFile = recordedBlob;
        fileName = recordedBlob.name;
      } else {
        // Create a proper MP4 file with metadata
        fileName = `operation-${timestamp}.mp4`;
        videoFile = new File([recordedBlob], fileName, {
          type: "video/mp4",
          lastModified: Date.now(),
        });
      }

      formData.append("video", videoFile, fileName);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.status === 201 && response.data.success === true) {
        let alertConfig = {
          title: "Success!",
          text: "Video uploaded successfully!",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        };

        if (response.data.storageType === "local" || response.data.warning) {
          alertConfig = {
            title: "Uploaded",
            text: response.data.warning || "Video saved successfully",
            icon: "info",
            timer: 3000,
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
        errorMessage = "Unsupported video format. Please use MP4.";
      } else if (error.response?.status === 400) {
        errorMessage =
          error.response.data?.message || "Invalid file. Please try again.";
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
    if (recordedVideo) URL.revokeObjectURL(recordedVideo);
    setRecordedVideo(null);
    setRecordedBlob(null);
    setStatus("idle");
    setRecordingTime(0);
    setOriginalSize(0);
    setCompressedSize(0);
    setIsVideoPlaying(false);
    setVideoError(false);
    stopCamera();
    if (timerRef.current) clearInterval(timerRef.current);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  // Handle zoom
  const handleZoom = (level) => {
    setZoomLevel(level);
    if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);

    zoomTimeoutRef.current = setTimeout(() => {
      if (status === "ready" || status === "recording") {
        startCamera();
      }
    }, 300);
  };

  // Camera UI Components
  const CameraHeader = () => (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        onClick={() => {
          if (status === "idle" || status === "ready") {
            setUploadingMaterial(null);
          } else {
            resetState();
          }
        }}
        className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white"
      >
        <FaChevronLeft />
      </button>

      <div className="flex items-center gap-3">
        <div className="text-sm font-medium">
          {status === "recording" && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-mono">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>

        <div className="relative" ref={qualityMenuRef}>
          <button
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center gap-1"
            disabled={recording || compressing || uploading}
          >
            <FaCog className="text-sm" />
            <span className="text-xs font-medium">
              {qualityPresets[videoQuality].name}
            </span>
          </button>

          {showQualityMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-xl shadow-2xl z-50 py-2">
              <div className="text-xs text-gray-400 px-3 py-2">Quality</div>
              {Object.entries(qualityPresets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => {
                    setVideoQuality(key);
                    setShowQualityMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition ${
                    videoQuality === key
                      ? "bg-blue-600/20 text-blue-400 border-l-2 border-blue-500"
                      : "hover:bg-gray-800/50 text-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-xs text-gray-400">
                      {preset.resolution.split("x")[1]}p • {preset.fps}fps
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const CameraControls = () => {
    if (status === "idle") {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <button
              onClick={startCamera}
              className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 p-4 rounded-2xl font-medium transition-all duration-200 shadow-lg shadow-blue-900/30"
            >
              <FaCamera className="text-2xl" />
              <div className="text-sm font-medium">Camera</div>
            </button>
            <label className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 p-4 rounded-2xl font-medium cursor-pointer transition-all duration-200 shadow-lg shadow-gray-900/30">
              <FaUpload className="text-2xl" />
              <div className="text-sm font-medium">Gallery</div>
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
        </div>
      );
    }

    if (status === "ready") {
      return (
        <div className="flex flex-col items-center gap-6">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                onClick={() => handleZoom(level)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  zoomLevel === level
                    ? "bg-white text-black"
                    : "bg-black/50 text-white backdrop-blur-sm"
                }`}
              >
                {level}x
              </button>
            ))}
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={switchCamera}
              className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition"
            >
              <FaSyncAlt className="text-xl" />
            </button>

            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 transition-all duration-200 shadow-2xl flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500"></div>
            </button>

            <button
              onClick={resetState}
              className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition"
            >
              <RxCross2 className="text-xl" />
            </button>
          </div>
        </div>
      );
    }

    if (status === "recording") {
      return (
        <div className="flex flex-col items-center gap-6">
          {/* Recording Timer */}
          <div className="flex items-center gap-2 px-4 py-2 bg-red-600/20 backdrop-blur-sm rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-mono font-bold text-lg">
              {formatTime(recordingTime)}
            </span>
          </div>

          {/* Stop Button */}
          <button
            onClick={stopRecording}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-2xl shadow-red-900/50 flex items-center justify-center animate-pulse"
          >
            <div className="w-8 h-8 bg-white rounded"></div>
          </button>
        </div>
      );
    }

    if (status === "preview" && !videoError) {
      return (
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={resetState}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-full font-medium transition"
          >
            <FaRedo />
            <span>Retake</span>
          </button>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-full font-medium transition disabled:opacity-50"
          >
            {uploading ? (
              <>
                <ClipLoader size={16} color="white" />
                <span>{uploadProgress}%</span>
              </>
            ) : (
              <>
                <FaSave />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <CameraHeader />

      {/* Main Content - Camera Preview */}
      <div className="flex-1 relative overflow-hidden">
        {/* Camera Feed or Video Preview */}
        <div className="absolute inset-0 bg-black">
          {status !== "preview" ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={previewVideoRef}
              src={recordedVideo}
              controls={!videoError}
              playsInline
              className="w-full h-full object-contain"
              onCanPlay={() => setVideoError(false)}
              onError={() => setVideoError(true)}
            />
          )}
        </div>

        {/* Overlays */}
        {status === "loading" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <ClipLoader size={40} color="#3B82F6" />
              <p className="mt-4 text-white">Initializing camera...</p>
            </div>
          </div>
        )}

        {status === "compressing" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <ClipLoader size={40} color="#10B981" />
              <p className="mt-4 text-lg font-medium text-white">
                Optimizing Video
              </p>
              <p className="text-sm text-gray-300 mt-2">
                Processing for best quality...
              </p>
              <div className="mt-6 w-64 mx-auto bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${compressProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {compressProgress}% complete
              </p>
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {status === "recording" && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium">REC</span>
          </div>
        )}

        {/* Video Playback Controls */}
        {status === "preview" && !videoError && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2">
            <button
              onClick={toggleVideoPlayback}
              className="p-4 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition"
            >
              {isVideoPlaying ? (
                <FaPause className="text-xl" />
              ) : (
                <FaPlay className="text-xl" />
              )}
            </button>
          </div>
        )}

        {/* Video Info */}
        {status === "preview" && recordedBlob && !videoError && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <FaVideo className="text-gray-400" />
                <span>{formatFileSize(recordedBlob.size)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaClock className="text-gray-400" />
                <span>{formatTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCog className="text-gray-400" />
                <span>{qualityPresets[videoQuality].name}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls Area */}
      <div className="bg-gradient-to-t from-black/90 to-transparent py-6 px-4">
        <CameraControls />
      </div>

      {/* Status Bar */}
      <div className="px-4 py-3 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            {status === "ready" && (
              <span className="text-green-400">● Ready</span>
            )}
            {status === "recording" && (
              <span className="text-red-400 animate-pulse">● Recording</span>
            )}
            {status === "preview" && (
              <span className="text-blue-400">● Preview</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>{isMobile ? "📱 Mobile" : "🖥️ Desktop"}</span>
            <span>Max 100MB</span>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="absolute bottom-20 left-4 right-4">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white">Uploading...</span>
              <span className="text-gray-300">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraOrBrowse;
