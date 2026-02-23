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
  operationType,
}) => {
  // FFmpeg instance (keep but don't rely on it)
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
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const qualityMenuRef = useRef(null);
  const progressHandlerRef = useRef(null);

  // Quality presets for compression (keep for UI only)
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

    // Try to initialize FFmpeg but don't block uploads
    const loadFFmpeg = async () => {
      if (ffmpegRef.current || ffmpegLoading) return;

      setFfmpegLoading(true);
      try {
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        ffmpeg.on("log", ({ message }) => {
          console.log("FFmpeg log:", message);
        });

        await ffmpeg.load();
        setFfmpegLoaded(true);
        console.log("FFmpeg loaded successfully");
      } catch (error) {
        console.error("FFmpeg load error:", error);
        setFfmpegLoaded(false);
        ffmpegRef.current = null;
      } finally {
        setFfmpegLoading(false);
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
      if (ffmpegRef.current && progressHandlerRef.current) {
        ffmpegRef.current.off("progress", progressHandlerRef.current);
      }
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

      videoElement.addEventListener("play", handlePlay);
      videoElement.addEventListener("pause", handlePause);
      videoElement.addEventListener("ended", handleEnded);
      videoElement.addEventListener("error", handleError);

      return () => {
        videoElement.removeEventListener("play", handlePlay);
        videoElement.removeEventListener("pause", handlePause);
        videoElement.removeEventListener("ended", handleEnded);
        videoElement.removeEventListener("error", handleError);
      };
    }
  }, [status]);

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

    // Determine best MIME type
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

      recorder.onstop = () => {
        try {
          if (recordedChunks.current.length === 0) {
            throw new Error("No data recorded");
          }

          const blob = new Blob(recordedChunks.current, {
            type: recorder.mimeType || "video/webm",
          });

          const videoUrl = URL.createObjectURL(blob);

          setOriginalSize(blob.size);
          setRecordedVideo(videoUrl);
          setRecordedBlob(blob);
          setStatus("preview");
          setVideoError(false);
          setRecordingTime((prev) => prev || Math.floor(prev));

          // Force video reload with new source
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

  // Fix: Improved video preview initialization
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
          // Don't treat autoplay prevention as an error
          if (
            error.name !== "NotAllowedError" &&
            !error.message.includes("user gesture")
          ) {
            setVideoError(true);
          }
        });
      }
    }
  }, [status, recordedVideo]);

  // Handle file upload - NO FRONTEND COMPRESSION, let backend handle it
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

    // Bypass frontend compression completely
    // Just create video URL and set state, no compression check
    const videoUrl = URL.createObjectURL(file);
    setRecordedVideo(videoUrl);
    setRecordedBlob(file);

    // Get duration from video
    const tempVideo = document.createElement("video");
    tempVideo.src = videoUrl;
    tempVideo.onloadedmetadata = () => {
      setRecordingTime(Math.floor(tempVideo.duration));
    };

    setStatus("preview");
    setVideoError(false);

    // Clear file input
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
      if (!uploadingData.hoId || !uploadingData.hOpName) {
        Swal.fire({
          title: "Missing Data",
          text: "Helper operation data is incomplete",
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

    // Validate upload data
    if (!validateUploadData()) {
      setUploading(false);
      return;
    }

    // REMOVED size check - let backend handle any size
    // Just show warning but still upload
    // if (recordedBlob.size > 100 * 1024 * 1024) {
    //   const confirmUpload = await Swal.fire({
    //     title: "Large File",
    //     text: `Video is ${(recordedBlob.size / (1024 * 1024)).toFixed(1)}MB. Large files may take longer to upload and process. Continue?`,
    //     icon: "warning",
    //     showCancelButton: true,
    //     confirmButtonText: "Yes, upload",
    //     cancelButtonText: "Cancel",
    //   });

    //   if (!confirmUpload.isConfirmed) {
    //     return;
    //   }
    // }

    setUploading(true);
    setUploadProgress(0);

    try {
      console.log("Uploading data:", uploadingData);

      const formData = new FormData();

      // Append operation-specific data
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
        formData.append(
          "subOpId",
          uploadingData.subOpId || uploadingData.sopId || "",
        );
      }

      // Add recording metadata
      formData.append("recordingDuration", recordingTime || 0);
      formData.append("videoQuality", videoQuality);
      formData.append("originalSize", originalSize || recordedBlob.size);
      formData.append("compressedSize", compressedSize || recordedBlob.size);

      const timestamp = new Date().getTime();

      // Create a File object from the Blob with proper MIME type
      let videoFile;
      let fileName;
      let mimeType;

      if (recordedBlob instanceof File) {
        // If it's already a File object, use it directly
        videoFile = recordedBlob;
        fileName = recordedBlob.name;
        mimeType = recordedBlob.type;
      } else {
        // Determine MIME type and filename
        let rawMimeType = recordedBlob.type || "video/webm";

        // Clean up MIME type string
        mimeType = rawMimeType.split(";")[0].trim();

        if (mimeType.includes("webm")) {
          mimeType = "video/webm";
          fileName = `operation-recording-${timestamp}.webm`;
        } else if (mimeType.includes("mp4") || mimeType.includes("mp4")) {
          mimeType = "video/mp4";
          fileName = `operation-recording-${timestamp}.mp4`;
        } else {
          mimeType = "video/mp4";
          fileName = `operation-recording-${timestamp}.mp4`;
        }

        // Create the File object
        videoFile = new File([recordedBlob], fileName, {
          type: mimeType,
          lastModified: Date.now(),
        });
      }

      console.log("Upload details:", {
        mimeType: mimeType,
        fileName: fileName,
        size: recordedBlob.size,
        operationType: operationType,
      });

      formData.append("video", videoFile);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      console.log("API URL:", apiUrl);

      const endpoint =
        operationType === "HelperOperation"
          ? `${apiUrl}/api/helperOpMedia/uploadVideos`
          : `${apiUrl}/api/subOperationMedia/uploadVideos`;

      console.log("Upload endpoint:", endpoint);

      const response = await axios.post(endpoint, formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(percentCompleted);
          }
        },
        timeout: 600000, // Increased to 10 minutes for large files
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log("Upload response:", response.data);

      if (response.status === 201 || response.status === 200) {
        if (response.data?.success === true) {
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

          await Swal.fire(alertConfig);

          // Cleanup
          if (recordedVideo) {
            URL.revokeObjectURL(recordedVideo);
          }
          resetState();

          // Close the component
          if (setUploadingMaterial) {
            setUploadingMaterial(null);
          }
        } else {
          throw new Error(response.data?.message || "Upload failed");
        }
      } else {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (error) {
      console.error("Upload error:", error);

      let errorMessage = "Upload failed. Please try again.";
      let errorTitle = "Upload Failed";

      if (error.code === "ECONNABORTED") {
        errorMessage =
          "Upload timeout. Please try again with a smaller file or better connection.";
      } else if (error.message?.includes("Network Error")) {
        errorMessage =
          "Network error. Please check:\n• Your internet connection\n• Server is running\n• CORS configuration";
        errorTitle = "Connection Failed";
      } else if (error.response) {
        // Server responded with error
        switch (error.response.status) {
          case 413:
            errorMessage = "File too large for server. Please contact support.";
            break;
          case 415:
            errorMessage = "Unsupported video format.";
            break;
          case 400:
            errorMessage =
              error.response.data?.message ||
              "Invalid request. Please try again.";
            break;
          case 401:
            errorMessage = "Please login again to upload.";
            break;
          case 403:
            errorMessage = "You don't have permission to upload.";
            break;
          case 404:
            errorMessage =
              "Upload endpoint not found. Please check server configuration.";
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = "Server error. Please try again later.";
            break;
          default:
            errorMessage = `Server error (${error.response.status}). Please try again.`;
        }
      } else if (error.request) {
        errorMessage =
          "No response from server. Please check:\n• Server is running\n• Network connection\n• Firewall settings";
        errorTitle = "Server Unreachable";
      }

      Swal.fire({
        title: errorTitle,
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Reset state
  const resetState = () => {
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    setRecordedVideo(null);
    setRecordedBlob(null);
    setStatus("idle");
    setRecordingTime(0);
    setOriginalSize(0);
    setCompressedSize(0);
    setIsVideoPlaying(false);
    setVideoError(false);
    stopCamera();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo);
      }
      stopCamera();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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
              disabled={recording || compressing || uploading}
            >
              <FaCog className="text-sm" />
              <span className="hidden sm:inline">
                {qualityPresets[videoQuality]?.name || "Medium"}
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
                resetState();
                if (setUploadingMaterial) {
                  setUploadingMaterial(null);
                }
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
              onCanPlay={() => {
                console.log("Video can play");
                setVideoError(false);
              }}
              onError={(e) => {
                console.error("Video error event:", e);
                setVideoError(true);
              }}
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
                {ffmpegLoaded ? "Compressing..." : "Loading compressor..."}
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
              <div className="font-medium">{formatTime(recordingTime)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs">Status</div>
              <div
                className={`font-medium ${
                  recordedBlob.size > 95 * 1024 * 1024
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {recordedBlob.size > 95 * 1024 * 1024
                  ? "Will be compressed on server"
                  : "Ready"}
              </div>
            </div>
          </div>
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
                    : status === "compressing"
                      ? "bg-yellow-500"
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
            {status === "error" && "Error occurred. Please try again."}
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
            >
              <FaCamera className="text-xl" />
              <div className="text-sm">Open Camera</div>
            </button>
            <label className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 px-2 py-2 rounded-xl font-medium cursor-pointer transition-all duration-200 shadow-lg shadow-gray-900/30 disabled:opacity-50">
              <FaUpload className="text-xl" />
              <div className="text-sm">Upload Video</div>
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
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-5 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-red-900/30"
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
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Camera Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Recording</span>
            </div>
          </div>
          <div className="text-center">
            <span className="inline-flex items-center gap-1 bg-gray-800/50 px-2 py-1 rounded">
              <FaVideo className="text-xs" />
              Server-side compression • {isMobile ? "📱 Mobile" : "🖥️ Desktop"}
            </span>
          </div>
          <div className="text-right">
            <span>
              Quality: {qualityPresets[videoQuality]?.name || "Medium"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraOrBrowse;
