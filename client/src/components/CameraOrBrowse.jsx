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
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const fileInputRef = useRef(null);

  // Check if mobile device
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  // Initialize camera when facing mode changes
  useEffect(() => {
    if (status === "ready" || status === "recording") {
      startCamera();
    }
  }, [cameraFacing]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    setStatus("loading");
    try {
      stopCamera(); // Stop any existing stream first

      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 480 : 720 },
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
      alert(`Camera error: ${error.message}`);
    }
  };

  const handleUpload = async (
    videoBlob = null,
    fileName = "recorded-video.webm"
  ) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Append the metadata
      formData.append("styleId", uploadingData.style_id || 1);
      formData.append("styleNo", uploadingData.styleNo);
      formData.append("moId", uploadingData.moId);
      formData.append("sopId", uploadingData.sopId);
      formData.append("sopName", uploadingData.sopName);
      formData.append("subOpId", uploadingData.sopId);

      // Append the video file
      if (videoBlob) {
        formData.append("video", videoBlob, fileName);
      } else if (recordedBlob) {
        formData.append("video", recordedBlob, "recorded-video.webm");
      } else {
        Swal.fire({
          title: "Error occurred",
          text: "No video to upload",
          timer: 3000,
          showTimeProgress: true,
          showCancelButton: false,
          icon: "error",
        });
        setUploading(false);
        return;
      }

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
          timeout: 300000,
        }
      );

      console.log("🔍 Upload response:", response.data); // Debug log

      // FIXED: Enhanced success checking with storage type awareness
      if (response.status === 201) {
        if (response.data.success === true) {
          // ✅ True success case - handle different storage scenarios
          let successTitle = "Success!";
          let successText = "Video uploaded successfully!";
          let iconType = "success";
          let timerDuration = 4000;

          // Check storage type and show appropriate message
          if (response.data.storageType === "local" || response.data.warning) {
            successTitle = "Uploaded with Note";
            successText =
              response.data.warning ||
              "Video saved to local storage (network unavailable - 404)";
            iconType = "warning";
            timerDuration = 5000; // Longer for warnings
          }

          Swal.fire({
            title: successTitle,
            text: successText,
            timer: timerDuration,
            showTimeProgress: true,
            showCancelButton: false,
            icon: iconType,
          });

          console.log("✅ Upload successful:", response.data);
          console.log(
            "📁 Storage type:",
            response.data.storageType || "unknown"
          );
          if (response.data.warning) {
            console.log("⚠️ Warning:", response.data.warning);
          }

          // Reset states after successful upload
          setRecordedBlob(null);
          setRecordedVideo(null);
          setStatus("idle");
          setUploading(false);
          setUploadProgress(0);

          // Optional: Refresh video list if needed
          // if (typeof onUploadSuccess === 'function') {
          //   onUploadSuccess();
          // }
        } else if (response.data.success === false) {
          // ❌ Server returned 201 but success is explicitly false
          console.error("❌ Server returned failure:", response.data);
          throw new Error(response.data.message || "Upload failed on server");
        } else {
          // ❌ No success flag in response - this indicates a server issue
          console.error(
            "❌ Malformed response - no success flag:",
            response.data
          );
          throw new Error(
            "Server response format error - please contact administrator"
          );
        }
      } else {
        // ❌ Non-201 status code
        console.error("❌ Unexpected status code:", response.status);
        throw new Error(`Upload failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      console.error("❌ Error response data:", error.response?.data);
      console.error("❌ Error details:", {
        message: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        responseHeaders: error.response?.headers,
      });

      let errorMessage = "Upload failed";
      let errorTitle = "Upload Failed";
      let timerDuration = 5000;

      if (error.response) {
        // Server responded with error status
        errorMessage =
          error.response.data?.message ||
          error.response.statusText ||
          "Server error occurred";

        // Handle specific error types with better messages
        if (error.response.status === 400) {
          errorTitle = "Invalid Request";
          if (errorMessage?.includes("too large")) {
            errorMessage = "Video file is too large. Maximum size is 1GB";
          } else if (errorMessage?.includes("Missing required fields")) {
            errorMessage = "Please fill all required fields";
          } else if (errorMessage?.includes("No file uploaded")) {
            errorMessage = "No video file selected";
          }
        } else if (error.response.status === 413) {
          errorTitle = "File Too Large";
          errorMessage = "Video file exceeds size limit. Maximum size is 100MB";
        } else if (error.response.status === 415) {
          errorTitle = "Unsupported Format";
          errorMessage =
            "Video format not supported. Please use MP4, AVI, MOV, MKV, or WebM";
        } else if (error.response.status >= 500) {
          errorTitle = "Server Error";
          errorMessage =
            "Network storage is not accessible. Please check the network connection and try again. error code 404";
          timerDuration = 6000; // Longer for server errors
        }
      } else if (error.request) {
        // Request was made but no response received
        errorTitle = "Network Error";
        errorMessage =
          "Unable to connect to server. Please check your internet connection.";
      } else if (error.code === "ECONNABORTED") {
        // Request timeout
        errorTitle = "Timeout Error";
        errorMessage =
          "Upload took too long. Please try again with a smaller video file.";
      } else {
        // Something else happened
        errorTitle = "Upload Error";
        errorMessage = error.message || "An unexpected error occurred";
      }

      Swal.fire({
        title: errorTitle,
        text: errorMessage,
        timer: timerDuration,
        showTimeProgress: true,
        showCancelButton: false,
        icon: "error",
      });

      // Keep the video for retry (don't reset recordedBlob)
      setUploading(false);
      setUploadProgress(0);

      // Optional: Keep the preview for retry
      // setStatus("preview");
    }
  };

  // Handle file selection for upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.includes("video")) {
      const videoUrl = URL.createObjectURL(file);
      setRecordedVideo(videoUrl);
      setRecordedBlob(file);
      setStatus("preview");

      if (previewVideoRef.current) {
        previewVideoRef.current.load();
      }
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

    // Try different mimeTypes for better compatibility
    const options = {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    };

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
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideo(videoUrl);
        setRecordedBlob(blob);
        setStatus("preview");

        // Auto-play the preview on mobile
        if (previewVideoRef.current && isMobile) {
          previewVideoRef.current
            .play()
            .catch((e) => console.log("Autoplay prevented:", e));
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setStatus("recording");
    } catch (error) {
      console.error("Recording error:", error);
      setStatus("error");
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
        /* Safari */
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        /* IE11 */
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
    setRecordedVideo(null);
    setRecordedBlob(null);
    setStatus("idle");
    stopCamera();
  };

  return (
    <div className="bg-gray-900 min-h-screen lg:min-h-[50vh] p-4 lg:p-6 w-full mx-auto text-white lg:rounded-lg shadow-xl shadow-black/20">
      <div className="text-right relative">
        <button
          className="hover:bg-red-600 px-4 py-2 rounded-full absolute -top-2 -right-2 z-10"
          onClick={() => {
            // setIsUploading(false);
            setUploadingMaterial(null);
          }}
          disabled={uploading}
        >
          <RxCross2 className="text-2xl" />
        </button>
      </div>
      <h2 className="text-2xl font-bold mb-6 text-center">
        {status === "preview" ? "Video Preview" : "Record or Upload a Video"}
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

      {/* Status indicators */}
      {status === "error" && (
        <div className="bg-red-900 text-red-100 p-3 rounded-lg mb-4">
          Camera/recording error occurred. Please try again.
        </div>
      )}

      {/* Video Preview Area */}
      <div className="relative rounded-lg overflow-hidden border-2 border-red-700 mb-6 bg-black h-[70vh] md:h-auto flex items-center">
        {status !== "preview" ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video"
          />
        ) : (
          <div className="relative">
            <video
              ref={previewVideoRef}
              src={recordedVideo}
              controls
              playsInline
              className="w-full aspect-video"
            />
            {isMobile && (
              <button
                onClick={toggleFullscreen}
                className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full"
                aria-label="Fullscreen"
              >
                <FaExpand />
              </button>
            )}
          </div>
        )}

        {/* Recording indicator */}
        {status === "recording" && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md flex items-center">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
            REC
          </div>
        )}
      </div>

      {/* Step-by-step instructions */}
      <div className="mb-6 text-gray-300 text-sm text-center">
        {status === "idle" && (
          <p>Start by opening your camera or uploading a video file</p>
        )}
        {status === "ready" && (
          <p>Camera is ready. Press record when you're prepared</p>
        )}
        {status === "recording" && (
          <p>Recording in progress. Press stop when finished</p>
        )}
        {status === "preview" && (
          <p>Review your video {isMobile && "or tap fullscreen icon"}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        {/* Idle state */}
        {status === "idle" && (
          <>
            <button
              onClick={startCamera}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-medium transition flex-1 justify-center"
              disabled={uploading}
            >
              <FaCamera /> Open Camera
            </button>
            <label className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 px-4 py-3 rounded-lg font-medium cursor-pointer transition flex-1 justify-center">
              <FaUpload /> Upload Video
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
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-medium transition flex-1 justify-center"
              disabled={uploading}
            >
              🎥 Start Recording
            </button>
            <button
              onClick={switchCamera}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg font-medium transition"
              disabled={uploading}
            >
              <FaSyncAlt /> Switch Camera
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 px-4 py-3 rounded-lg font-medium transition"
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
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg font-medium transition w-full justify-center"
            disabled={uploading}
          >
            <FaStop /> Stop Recording
          </button>
        )}

        {/* Preview state */}
        {status === "preview" && (
          <div className="flex gap-3 w-full">
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg font-medium transition flex-1"
              disabled={uploading}
            >
              <FaRedo /> Re-record
            </button>
            <button
              onClick={() => handleUpload()}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-medium transition flex-1"
              disabled={uploading}
            >
              {uploading ? <ClipLoader size={16} color="white" /> : <FaCheck />}
              {uploading ? "Uploading..." : "Confirm"}
            </button>
          </div>
        )}

        {/* Loading state */}
        {status === "loading" && (
          <button
            className="flex items-center gap-2 bg-gray-700 px-4 py-3 rounded-lg font-medium w-full justify-center"
            disabled
          >
            <ClipLoader size={16} color="white" /> Loading...
          </button>
        )}
      </div>

      {/* Camera facing mode indicator */}
      {(status === "ready" || status === "recording") && (
        <div className="mt-4 text-center text-sm text-gray-400">
          Using {cameraFacing === "environment" ? "back" : "front"} camera
        </div>
      )}
    </div>
  );
};

export default CameraOrBrowse;
