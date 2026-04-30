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
  const [recordingTime, setRecordingTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoQuality, setVideoQuality] = useState("medium");
  const [originalSize, setOriginalSize] = useState(0);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isEdge, setIsEdge] = useState(false);

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
      bitrate: 800000,
      resolution: "640x480",
      fps: 24,
    },
    medium: {
      name: "Medium",
      bitrate: 1500000,
      resolution: "854x480",
      fps: 25,
    },
    high: {
      name: "High",
      bitrate: 2500000,
      resolution: "1280x720",
      fps: 30,
    },
  };

  // Check if Edge browser
  useEffect(() => {
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent,
    );
    const isEdgeBrowser = /Edg\/\d+/.test(navigator.userAgent);

    setIsMobile(isMobileDevice);
    setIsEdge(isEdgeBrowser);

    if (isEdgeBrowser && isMobileDevice) {
      setVideoQuality("low");
    }

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

      const isEdgeMobile = isEdge && isMobile;
      const quality = qualityPresets[videoQuality];
      const [width, height] = quality.resolution.split("x").map(Number);

      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: isEdgeMobile ? 640 : width },
          height: { ideal: isEdgeMobile ? 480 : height },
          frameRate: { ideal: isEdgeMobile ? 24 : quality.fps },
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

    // Choose best supported MIME type
    let mimeType = "video/webm";
    const codecOptions = [
      "video/webm;codecs=vp8",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    for (const codec of codecOptions) {
      if (MediaRecorder.isTypeSupported(codec)) {
        mimeType = codec;
        break;
      }
    }

    const bitrate = isEdge
      ? Math.min(qualityPresets[videoQuality].bitrate, 1000000)
      : qualityPresets[videoQuality].bitrate;

    const options = {
      mimeType: mimeType,
      videoBitsPerSecond: bitrate,
      audioBitsPerSecond: isEdge ? 64000 : 128000,
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

          // Reset video error - we'll try to play but not block upload
          setVideoError(false);
          setRecordingTime((prev) => prev || Math.floor(prev));

          if (previewVideoRef.current) {
            previewVideoRef.current.src = videoUrl;
            previewVideoRef.current.load();
          }
        } catch (error) {
          console.error("Error in recorder.onstop:", error);
          Swal.fire({
            title: "Recording Error",
            text: error.message || "Failed to process recording",
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
          text: "Failed to record video. Please try again.",
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
      setRecordingTime(Math.floor(tempVideo.duration));
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

  // Main upload handler - THIS WILL WORK EVEN IF VIDEO PREVIEW FAILED
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
        formData.append(
          "subOpId",
          uploadingData.subOpId || uploadingData.sopId || "",
        );
      }

      formData.append("recordingDuration", recordingTime || 0);
      formData.append("videoQuality", videoQuality);
      formData.append("originalSize", originalSize || recordedBlob.size);
      formData.append("compressedSize", recordedBlob.size);
      formData.append("browserInfo", isEdge ? "Edge" : "Other");

      const timestamp = new Date().getTime();
      let videoFile;
      let fileName = `operation-recording-${timestamp}.webm`;

      if (recordedBlob instanceof File) {
        videoFile = recordedBlob;
        fileName = recordedBlob.name;
      } else {
        videoFile = new File([recordedBlob], fileName, {
          type: recordedBlob.type || "video/webm",
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
        timeout: 600000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.status === 201 || response.status === 200) {
        if (response.data?.success === true) {
          await Swal.fire({
            title: "Success!",
            text: "Video uploaded successfully!",
            icon: "success",
            timer: 4000,
            showConfirmButton: false,
          });

          if (recordedVideo) {
            URL.revokeObjectURL(recordedVideo);
          }
          resetState();

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

      Swal.fire({
        title: "Upload Failed",
        text: error.message || "Please try again",
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
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    setRecordedVideo(null);
    setRecordedBlob(null);
    setStatus("idle");
    setRecordingTime(0);
    setOriginalSize(0);
    setIsVideoPlaying(false);
    setVideoError(false);
    stopCamera();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const switchCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

  useEffect(() => {
    if (status === "ready" || status === "recording") {
      startCamera();
    }
  }, [cameraFacing, videoQuality]);

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
      {/* Edge Browser Warning Banner */}
      {isEdge && status === "preview" && videoError && (
        <div className="mb-4 bg-yellow-600/20 border border-yellow-600 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-yellow-300 font-semibold mb-1">
                Preview Not Available
              </p>
              <p className="text-gray-300 text-xs">
                Your video was recorded successfully but cannot be previewed in
                Edge browser.
                <strong className="text-yellow-300">
                  {" "}
                  You can still upload it
                </strong>{" "}
                - the server will process it correctly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {status === "preview" ? "Video Preview" : "Record Operation"}
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative" ref={qualityMenuRef}>
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
              disabled={recording || uploading}
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
                    Video Quality {isEdge && "(Edge: Low Recommended)"}
                  </div>
                  {Object.entries(qualityPresets).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setVideoQuality(key);
                        setShowQualityMenu(false);
                        if (status === "ready") {
                          startCamera();
                        }
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
                          {preset.resolution}
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
              if (!uploading && !recording) {
                resetState();
                if (setUploadingMaterial) {
                  setUploadingMaterial(null);
                }
              }
            }}
            disabled={uploading || recording}
          >
            <RxCross2 className="text-xl" />
          </button>
        </div>
      </div>

      {/* Progress Indicators */}
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
            ></div>
          </div>
        </div>
      )}

      {/* MAIN VIDEO PREVIEW */}
      <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-black mb-4 h-[60vh] min-h-[400px]">
        {status === "recording" && (
          <div className="absolute top-3 left-3 z-20 bg-red-600/90 text-white px-2.5 py-1 rounded-md flex items-center shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse"></div>
            <span className="font-mono font-bold text-sm">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {/* Video Preview Error - But still allow upload */}
        {videoError && status === "preview" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
            <div className="text-center p-6 max-w-sm">
              <div className="text-yellow-400 text-5xl mb-3">🎥</div>
              <div className="text-yellow-400 text-lg mb-2">
                Preview Not Available
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Your browser (Edge) cannot preview this video format, but the
                video data is valid.
              </p>
              <div className="bg-gray-800 rounded-lg p-3 mb-4 text-left">
                <p className="text-xs text-gray-400 mb-1">Video Information:</p>
                <p className="text-sm text-white">
                  Size: {(recordedBlob?.size / (1024 * 1024)).toFixed(1)} MB
                </p>
                <p className="text-sm text-white">
                  Duration: {formatTime(recordingTime)}
                </p>
                <p className="text-xs text-gray-400 mt-2">✓ Ready to upload</p>
              </div>
              <button
                onClick={() => {
                  // Try to reload video
                  if (previewVideoRef.current && recordedVideo) {
                    previewVideoRef.current.src = recordedVideo;
                    previewVideoRef.current.load();
                  }
                }}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm mr-2"
              >
                Try Reload
              </button>
            </div>
          </div>
        )}

        {/* Video Playback Controls */}
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
              controls={!videoError}
              playsInline
              className="w-full h-full object-contain"
              onCanPlay={() => {
                console.log("Video can play");
                setVideoError(false);
              }}
              onError={(e) => {
                console.error(
                  "Video error event - preview failed but upload still works:",
                  e,
                );
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
              <div className="font-medium">{formatTime(recordingTime)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs">Status</div>
              <div
                className={`font-medium ${videoError ? "text-yellow-400" : "text-green-400"}`}
              >
                {videoError ? "Preview Failed ✓" : "Ready"}
              </div>
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
                    ? videoError
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                    : "bg-gray-500"
            }`}
          ></div>
          <span className="text-sm text-gray-300">
            {status === "idle" && "Select an option to begin"}
            {status === "ready" && "Camera ready - Position your operation"}
            {status === "recording" &&
              `Recording - ${formatTime(recordingTime)}`}
            {status === "preview" &&
              videoError &&
              "Preview unavailable - Video ready for upload"}
            {status === "preview" && !videoError && "Review your video"}
            {status === "error" && "Error occurred. Please try again."}
          </span>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="space-y-3 max-w-md mx-auto">
        {status === "idle" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={startCamera}
              className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-2 py-2 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-900/30 disabled:opacity-50"
              disabled={uploading}
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
                disabled={uploading}
              />
            </label>
          </div>
        )}

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

        {status === "preview" && (
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
                  {uploading ? "Uploading..." : "Upload Video"}
                </div>
                <div className="text-xs opacity-75">
                  {uploading
                    ? `${uploadProgress}% complete`
                    : videoError
                      ? "Upload anyway ✓"
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
              {isMobile ? "📱 Mobile" : "🖥️ Desktop"}
              {isEdge && " • Edge Compatible"}
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
