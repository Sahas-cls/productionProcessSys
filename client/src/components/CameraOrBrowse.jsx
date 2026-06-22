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
import fixWebmDuration from "webm-duration-fix";

// ============================================================
// MEDIA MANAGER - Pure media handling logic
// ============================================================

class MediaManager {
  constructor() {
    this.browserInfo = this.detectBrowser();
    this.supportedMimeTypes = this.detectSupportedMimeTypes();
    this.videoElement = null;
    this.currentUrl = null;
    this.cleanupFn = null;
  }

  detectBrowser() {
    const ua = navigator.userAgent;
    return {
      isMobile: /Android|iPhone|iPad|iPod/i.test(ua),
      isSafari: /^((?!chrome|android).)*safari/i.test(ua),
      isChrome: /Chrome/i.test(ua) && !/Edge/i.test(ua),
      isSamsung: /SamsungBrowser/i.test(ua),
      isIOS: /iPhone|iPad|iPod/i.test(ua),
      isAndroid: /Android/i.test(ua),
      userAgent: ua,
    };
  }

  detectSupportedMimeTypes() {
    const types = [
      // MP4 (most compatible)
      {
        mime: "video/mp4;codecs=h264,mp4a.40.2",
        extension: "mp4",
        label: "MP4 H.264",
      },
      { mime: "video/mp4", extension: "mp4", label: "MP4" },
      // WebM (good fallback)
      {
        mime: "video/webm;codecs=vp9,opus",
        extension: "webm",
        label: "WebM VP9",
      },
      {
        mime: "video/webm;codecs=vp8,opus",
        extension: "webm",
        label: "WebM VP8",
      },
      { mime: "video/webm", extension: "webm", label: "WebM" },
    ];

    const supported = types.filter((t) => {
      try {
        return MediaRecorder.isTypeSupported(t.mime);
      } catch {
        return false;
      }
    });

    console.log("[MediaManager] Supported MIME types:", supported);
    return supported;
  }

  getBestRecordingMimeType() {
    // Priority: MP4 H.264 > WebM VP9 > WebM VP8 > fallback WebM
    const priority = [
      "video/mp4;codecs=h264,mp4a.40.2",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    for (const mime of priority) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return "video/webm"; // Fallback
  }

  createPreviewURL(file) {
    this.cleanupURL();

    const url = URL.createObjectURL(file);
    this.currentUrl = url;

    console.log("[MediaManager] Created preview URL:", {
      url: url.substring(0, 50) + "...",
      fileType: file.type,
      fileSize: (file.size / (1024 * 1024)).toFixed(2) + "MB",
      browser: this.browserInfo,
    });

    return url;
  }

  cleanupURL() {
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      console.log(
        "[MediaManager] Revoked URL:",
        this.currentUrl.substring(0, 50) + "...",
      );
      this.currentUrl = null;
    }
  }

  validateVideoFile(file) {
    const errors = [];
    const warnings = [];

    // Check file type
    if (!file.type.startsWith("video/")) {
      errors.push("File is not a video");
    }

    // Check for common unsupported types
    const unsupportedTypes = ["video/x-msvideo", "video/quicktime"];
    if (unsupportedTypes.includes(file.type)) {
      errors.push(`Unsupported video format: ${file.type}`);
    }

    // Check file size (200MB limit)
    if (file.size > 200 * 1024 * 1024) {
      warnings.push("Video exceeds 200MB, may cause issues");
    }

    // Log codec info if available
    if (file.type) {
      console.log("[MediaManager] File validation:", {
        type: file.type,
        size: (file.size / (1024 * 1024)).toFixed(2) + "MB",
        extension: file.name.split(".").pop().toLowerCase(),
        errors,
        warnings,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async loadVideoMetadata(videoElement, timeout = 10000) {
    if (!videoElement) {
      throw new Error("Video element is null");
    }

    this.videoElement = videoElement;

    return new Promise((resolve, reject) => {
      let timeoutId = setTimeout(() => {
        reject(new Error("Metadata loading timeout"));
      }, timeout);

      const cleanup = () => {
        clearTimeout(timeoutId);
        videoElement.removeEventListener("loadedmetadata", onLoaded);
        videoElement.removeEventListener("error", onError);
      };

      const onLoaded = () => {
        cleanup();
        const duration = videoElement.duration;
        const readyState = videoElement.readyState;
        const videoWidth = videoElement.videoWidth;
        const videoHeight = videoElement.videoHeight;

        console.log("[MediaManager] Metadata loaded:", {
          duration: isFinite(duration) ? duration + "s" : "unknown",
          readyState,
          dimensions: `${videoWidth}x${videoHeight}`,
          videoElement: videoElement.id || "unnamed",
        });

        resolve({ duration, readyState, videoWidth, videoHeight });
      };

      const onError = (e) => {
        cleanup();
        const error = videoElement.error;
        const errorMsg = error
          ? `Code ${error.code}: ${error.message}`
          : "Unknown error";

        console.error("[MediaManager] Video error:", {
          error: errorMsg,
          code: error?.code,
          networkState: videoElement.networkState,
          readyState: videoElement.readyState,
          src: videoElement.src?.substring(0, 50) + "...",
        });

        reject(new Error(errorMsg));
      };

      videoElement.addEventListener("loadedmetadata", onLoaded);
      videoElement.addEventListener("error", onError);

      // Force load if not already loading
      if (videoElement.networkState === 0) {
        videoElement.load();
      }

      // If metadata already loaded, trigger immediately
      if (videoElement.readyState >= 1) {
        onLoaded();
      }
    });
  }

  setupVideoElement(videoElement, url, options = {}) {
    if (!videoElement) return;

    const {
      autoPlay = false,
      playsInline = true,
      muted = true,
      preload = "metadata",
    } = options;

    // Set attributes for mobile compatibility
    videoElement.setAttribute("playsinline", playsInline ? "true" : "false");
    videoElement.setAttribute("preload", preload);
    if (muted) videoElement.muted = true;
    if (autoPlay) videoElement.autoplay = true;

    // Set source
    videoElement.src = url;

    // Force load for mobile browsers
    videoElement.load();

    console.log("[MediaManager] Video element setup:", {
      src: url?.substring(0, 50) + "...",
      playsInline: videoElement.getAttribute("playsinline"),
      preload: videoElement.getAttribute("preload"),
      muted: videoElement.muted,
      browser: this.browserInfo,
    });
  }

  destroy() {
    this.cleanupURL();
    this.videoElement = null;
  }

  // Get browser capability info
  getCapabilities() {
    const video = document.createElement("video");
    const capabilities = {
      h264: !!video.canPlayType("video/mp4;codecs=h264"),
      webm: !!video.canPlayType("video/webm"),
      mp4: !!video.canPlayType("video/mp4"),
      browser: this.browserInfo,
      supportedMimeTypes: this.supportedMimeTypes,
    };
    console.log("[MediaManager] Capabilities:", capabilities);
    return capabilities;
  }
}

// ============================================================
// REACT COMPONENT - UI remains unchanged
// ============================================================

const CameraOrBrowse = ({
  setIsUploading,
  uploadingData,
  setUploadingMaterial,
  operationType,
}) => {
  // States - unchanged
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
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const qualityMenuRef = useRef(null);
  const mediaManagerRef = useRef(null);

  // Quality presets - unchanged
  const qualityPresets = {
    low: { name: "Low", bitrate: 3000, resolution: "854x480" },
    medium: { name: "Medium", bitrate: 5000, resolution: "1280x720" },
    high: { name: "High", bitrate: 8000, resolution: "1920x1080" },
  };

  // Initialize MediaManager
  useEffect(() => {
    mediaManagerRef.current = new MediaManager();
    mediaManagerRef.current.getCapabilities();

    return () => {
      if (mediaManagerRef.current) {
        mediaManagerRef.current.destroy();
      }
    };
  }, []);

  // Detect mobile
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
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (mediaManagerRef.current) {
        mediaManagerRef.current.destroy();
      }
    };
  }, []);

  // Watch videoUrl changes to handle preview loading
  useEffect(() => {
    if (videoUrl && status === "preview") {
      setMetadataLoaded(false);
      setVideoError(false);

      // Ensure video element is properly set up
      const videoEl = previewVideoRef.current;
      if (videoEl) {
        mediaManagerRef.current?.setupVideoElement(videoEl, videoUrl, {
          playsInline: true,
          muted: false,
          preload: "metadata",
        });

        // Load metadata with timeout
        mediaManagerRef.current
          ?.loadVideoMetadata(videoEl, 15000)
          .then((data) => {
            setMetadataLoaded(true);
            setDuration(data.duration || 0);
            setRecordingTime(Math.floor(data.duration || 0));
            console.log("[Component] Metadata loaded successfully");
          })
          .catch((error) => {
            console.warn("[Component] Metadata load error:", error);
            setVideoError(true);
          });
      }
    }
  }, [videoUrl, status]);

  // Handle fullscreen change - unchanged
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  // ============================================================
  // CAMERA FUNCTIONS
  // ============================================================

  const startCamera = async () => {
    setStatus("loading");
    try {
      stopCamera();

      // Determine constraints based on device
      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      };

      // iOS Safari specific handling
      if (mediaManagerRef.current?.browserInfo.isIOS) {
        constraints.video = {
          ...constraints.video,
          facingMode: cameraFacing,
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.setAttribute("playsinline", "true");
        cameraVideoRef.current.setAttribute("muted", "true");
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
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  // ============================================================
  // RECORDING FUNCTIONS
  // ============================================================

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

    // Get best supported MIME type
    const mimeType =
      mediaManagerRef.current?.getBestRecordingMimeType() || "video/webm";

    // Adjust bitrate for mobile
    const isMobile = mediaManagerRef.current?.browserInfo.isMobile;
    const bitrateMultiplier = isMobile ? 0.7 : 1;
    const bitrate =
      (qualityPresets[videoQuality]?.bitrate || 5000) * bitrateMultiplier;

    const options = {
      mimeType: mimeType,
      videoBitsPerSecond: bitrate * 1000,
      audioBitsPerSecond: 128000,
    };

    console.log("[Component] Recording options:", {
      mimeType,
      bitrate,
      isMobile,
      browser: mediaManagerRef.current?.browserInfo,
    });

    try {
      const recorder = new MediaRecorder(mediaStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          if (recordedChunks.current.length === 0) {
            throw new Error("No data recorded");
          }

          let blob = new Blob(recordedChunks.current, {
            type: recorder.mimeType || "video/webm",
          });

          // Fix duration for WebM
          if (blob.type.includes("webm")) {
            try {
              console.log("Fixing WebM duration...");
              blob = await fixWebmDuration(blob, { duration: recordingTime });
              console.log("WebM duration fixed");
            } catch (fixError) {
              console.warn("Failed to fix WebM duration:", fixError);
            }
          }

          // Convert to MP4 for better mobile compatibility if needed
          if (
            mediaManagerRef.current?.browserInfo.isIOS &&
            blob.type.includes("webm")
          ) {
            console.warn(
              "iOS may not support WebM playback, but we keep it for upload",
            );
          }

          if (videoUrl) {
            mediaManagerRef.current?.cleanupURL();
            URL.revokeObjectURL(videoUrl);
          }

          const newUrl =
            mediaManagerRef.current?.createPreviewURL(blob) ||
            URL.createObjectURL(blob);
          setVideoUrl(newUrl);
          setRecordedBlob(blob);
          setOriginalSize(blob.size);
          setStatus("preview");
          setCurrentTime(0);

          // The useEffect watching videoUrl will handle metadata loading
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

  // ============================================================
  // FILE UPLOAD FUNCTIONS - IMPROVED MOBILE SUPPORT
  // ============================================================

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    const validation = mediaManagerRef.current?.validateVideoFile(file);
    if (validation && !validation.valid) {
      Swal.fire({
        title: "Invalid Video File",
        text: validation.errors.join("\n"),
        icon: "error",
      });
      event.target.value = null;
      return;
    }

    if (!file.type.includes("video")) {
      Swal.fire({
        title: "Invalid File",
        text: "Please select a video file",
        icon: "warning",
      });
      event.target.value = null;
      return;
    }

    // Show validation warnings if any
    if (validation?.warnings.length > 0) {
      console.warn("Video validation warnings:", validation.warnings);
    }

    // Reset error state
    setVideoError(false);
    setMetadataLoaded(false);

    // Clean up old URL
    if (videoUrl) {
      mediaManagerRef.current?.cleanupURL();
      URL.revokeObjectURL(videoUrl);
    }

    // Create new URL using MediaManager
    const newUrl =
      mediaManagerRef.current?.createPreviewURL(file) ||
      URL.createObjectURL(file);
    setVideoUrl(newUrl);
    setRecordedBlob(file);
    setOriginalSize(file.size);
    setStatus("preview");
    setDuration(0);
    setCurrentTime(0);

    // The useEffect watching videoUrl will handle metadata loading

    event.target.value = null;
  };

  // ============================================================
  // UPLOAD FUNCTIONS - UNCHANGED
  // ============================================================

  const validateUploadData = () => {
    if (!uploadingData) {
      Swal.fire({
        title: "Missing Data",
        text: "Operation data is missing",
        icon: "error",
      });
      return false;
    }
    if (operationType === "HelperOperation") {
      if (!uploadingData.hoId) {
        Swal.fire({
          title: "Missing Data",
          text: "Helper operation ID (hoId) is missing",
          icon: "error",
        });
        return false;
      }
      if (!uploadingData.styleNo) {
        Swal.fire({
          title: "Missing Data",
          text: "Style number (styleNo) is missing",
          icon: "error",
        });
        return false;
      }
    }
    return true;
  };

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

    if (!validateUploadData()) return;

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

      const fileName = `operation-recording-${timestamp}.${fileExtension}`;
      videoFile = new File([recordedBlob], fileName, {
        type: mimeType,
        lastModified: Date.now(),
      });

      console.log("Uploading file:", {
        name: videoFile.name,
        type: videoFile.type,
        size: videoFile.size,
        originalBlobType: recordedBlob.type,
      });

      formData.append("video", videoFile);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const endpoint =
        operationType === "HelperOperation"
          ? `${apiUrl}/api/helperOpMedia/uploadVideos`
          : `${apiUrl}/api/subOperationMedia/uploadVideos`;

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
          text: "Video uploaded successfully!",
          icon: "success",
          timer: 4000,
          showConfirmButton: false,
        });
        resetState();
        if (setUploadingMaterial) setUploadingMaterial(null);
      }
    } catch (error) {
      console.error("Upload error:", error);

      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);

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
    }
  };

  // ============================================================
  // UI HELPER FUNCTIONS - UNCHANGED
  // ============================================================

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
    if (previewVideoRef.current) {
      if (isPlaying) previewVideoRef.current.pause();
      else previewVideoRef.current.play().catch(console.error);
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

  const switchCamera = () =>
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));

  const resetState = () => {
    if (videoUrl) {
      mediaManagerRef.current?.cleanupURL();
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setRecordedBlob(null);
    setStatus("idle");
    setRecordingTime(0);
    setOriginalSize(0);
    setCompressedSize(0);
    setDuration(0);
    setCurrentTime(0);
    setVideoError(false);
    setMetadataLoaded(false);
    setIsPlaying(false);
    stopCamera();
    if (timerRef.current) clearInterval(timerRef.current);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Effect for camera switching
  useEffect(() => {
    if (status === "ready" || status === "recording") {
      startCamera();
    }
  }, [cameraFacing]);

  // ============================================================
  // RENDER - UNCHANGED UI
  // ============================================================

  return (
    <div className="bg-gray-900 min-h-screen p-4 w-full mx-auto text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {status === "preview" ? "Video Preview" : "Record Operation"}
        </h2>
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
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 ${videoQuality === key ? "bg-blue-600" : ""}`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="p-1.5 hover:bg-red-600 rounded-lg"
            onClick={() => {
              if (!uploading && !recording) resetState();
            }}
            disabled={uploading || recording}
          >
            <RxCross2 className="text-xl" />
          </button>
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

      <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-black mb-4 h-[60vh] min-h-[400px]">
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
                playsInline
                preload="metadata"
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
                    setMetadataLoaded(true);
                  }
                }}
                onError={() => {
                  console.warn("Video preview error");
                  setVideoError(true);
                }}
              />

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <input
                  type="range"
                  min="0"
                  max={duration || recordingTime || 1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 ${(currentTime / (duration || recordingTime || 1)) * 100}%, #4b5563 ${(currentTime / (duration || recordingTime || 1)) * 100}%)`,
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

      <div className="mb-6 text-center text-sm text-gray-300">
        {status === "idle" && "Select an option to begin"}
        {status === "ready" && "Camera ready - Position your operation"}
        {status === "recording" && `Recording - ${formatTime(recordingTime)}`}
        {status === "preview" && "Review your video"}
        {status === "error" && "Error occurred. Please try again."}
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {status === "idle" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={startCamera}
              className="flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700 px-2 py-2 rounded-xl"
            >
              <FaCamera className="text-xl" />
              <div className="text-sm">Open Camera</div>
            </button>
            <label className="flex flex-col items-center gap-2 bg-gray-700 hover:bg-gray-800 px-2 py-2 rounded-xl cursor-pointer">
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
                <div className="text-xs opacity-75">Begin operation</div>
              </div>
            </button>
            <div className="flex flex-col gap-2">
              <button
                onClick={switchCamera}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
              >
                <FaSyncAlt /> Switch
              </button>
              <button
                onClick={resetState}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
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
              <div className="text-xs opacity-75">Finish operation</div>
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
              onClick={handleUpload}
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

      <div className="mt-8 pt-4 border-t border-gray-800 text-center text-xs text-gray-500">
        Quality: {qualityPresets[videoQuality]?.name || "Medium"} •{" "}
        {isMobile ? "📱 Mobile" : "🖥️ Desktop"}
      </div>
    </div>
  );
};

export default CameraOrBrowse;
