import axios from "axios";
import React, { useState, useRef, useEffect } from "react";
import {
  FaCamera,
  FaUpload,
  FaSyncAlt,
  FaCheck,
  FaRedo,
  FaExpand,
} from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { ClipLoader } from "react-spinners";
import Swal from "sweetalert2";

const ImageCaptureOrBrowse = ({
  setIsUploading,
  uploadingData,
  setUploadingMaterial,
}) => {
  const [mediaStream, setMediaStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [status, setStatus] = useState("idle");
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef(null);
  const previewImageRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check if mobile device
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  // Initialize camera when facing mode changes
  useEffect(() => {
    if (status === "ready") {
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
          width: { ideal: isMobile ? 1280 : 1920 },
          height: { ideal: isMobile ? 720 : 1080 },
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
      alert(`Camera error: ${error.message}`);
    }
  };

  // Capture image
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob and create URL
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          setImageBlob(blob);
          setStatus("preview");
          stopCamera();
        }
      },
      "image/jpeg",
      0.8
    );
  };

  const handleUpload = async (
    imageBlobToUpload = null,
    fileName = "captured-image.jpg"
  ) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Append the metadata - ADD subOpId HERE!
      formData.append("styleId", uploadingData.style_id || 1);
      formData.append("styleNo", uploadingData.styleNo);
      formData.append("moId", uploadingData.moId);
      formData.append("sopId", uploadingData.sopId);
      formData.append("sopName", uploadingData.sopName);
      // ADD THIS LINE - if you have subOpId available
      formData.append("subOpId", uploadingData.subOpId || uploadingData.sopId); // Use sopId as fallback

      // Append the image file
      if (imageBlobToUpload) {
        formData.append("image", imageBlobToUpload, fileName);
      } else if (imageBlob) {
        formData.append("image", imageBlob, "captured-image.jpg");
      } else {
        Swal.fire({
          title: "Error occurred",
          text: "No image to upload",
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
        `${apiUrl}/api/subOperationMedia/uploadImages`,
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
          timeout: 30000, // Reduced timeout for images
        }
      );

      console.log("🔍 Upload response:", response.data);

      // Enhanced success checking
      if (response.status === 201) {
        if (response.data.success === true) {
          let successTitle = "Success!";
          let successText = "Image uploaded successfully!";
          let iconType = "success";
          let timerDuration = 4000;

          // Check if it's Backblaze B2 storage
          if (
            response.data.storage &&
            response.data.storage.type === "backblaze_b2"
          ) {
            successTitle = "Uploaded to Cloud!";
            successText = "Image uploaded to cloud storage successfully!";
            iconType = "success";
            timerDuration = 4000;

            console.log("☁️ Stored in Backblaze B2:", {
              bucket: response.data.storage.bucket,
              region: response.data.storage.region,
              fileId: response.data.data?.b2_file_id,
            });
          }
          // Check for any warnings
          else if (response.data.warning) {
            successTitle = "Uploaded with Note";
            successText = response.data.warning;
            iconType = "warning";
            timerDuration = 5000;
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
            "📁 Storage provider:",
            response.data.storage?.type ||
              response.data.storageProvider ||
              "unknown"
          );

          // Store the returned data for later use if needed
          if (response.data.data) {
            console.log("📦 Uploaded image details:", {
              id: response.data.data.so_img_id,
              url:
                response.data.data.image_url_proxy ||
                response.data.data.image_url,
              filename: response.data.data.file_name,
              b2FileId: response.data.data.b2_file_id,
            });
          }

          // Reset states after successful upload
          setImageBlob(null);
          setCapturedImage(null);
          setStatus("idle");
          setUploading(false);
          setUploadProgress(0);

          // Optionally trigger a refresh of image list
          if (typeof onUploadSuccess === "function") {
            onUploadSuccess(response.data.data);
          }
        } else if (response.data.success === false) {
          console.error("❌ Server returned failure:", response.data);
          throw new Error(response.data.message || "Upload failed on server");
        } else {
          console.error(
            "❌ Malformed response - no success flag:",
            response.data
          );
          throw new Error("Server response format error");
        }
      } else {
        console.error("❌ Unexpected status code:", response.status);
        throw new Error(`Upload failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      console.error("❌ Error response data:", error.response?.data);

      let errorMessage = "Upload failed";
      let errorTitle = "Upload Failed";
      let timerDuration = 5000;

      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          error.response.statusText ||
          "Server error occurred";

        if (error.response.status === 400) {
          errorTitle = "Invalid Request";
          if (errorMessage?.includes("too large")) {
            errorMessage = "Image file is too large. Maximum size is 50MB";
          } else if (errorMessage?.includes("Missing required fields")) {
            // More specific error for missing subOpId
            if (errorMessage?.includes("subOpId")) {
              errorMessage = "Please provide sub-operation ID";
            } else {
              errorMessage = "Please fill all required fields";
            }
          } else if (errorMessage?.includes("No file uploaded")) {
            errorMessage = "No image file selected";
          }
        } else if (error.response.status === 413) {
          errorTitle = "File Too Large";
          errorMessage = "Image file exceeds size limit. Maximum size is 50MB";
        } else if (error.response.status === 415) {
          errorTitle = "Unsupported Format";
          errorMessage =
            "Image format not supported. Please use JPEG, PNG, or WebP";
        } else if (
          error.response.status === 502 ||
          error.response.status === 503
        ) {
          errorTitle = "Cloud Storage Error";
          errorMessage = "Unable to upload to cloud storage. Please try again.";
          timerDuration = 6000;
        } else if (error.response.status >= 500) {
          errorTitle = "Server Error";
          errorMessage = "Server encountered an error. Please try again later.";
          timerDuration = 6000;
        }
      } else if (error.request) {
        errorTitle = "Network Error";
        errorMessage =
          "Unable to connect to server. Please check your internet connection.";
      } else if (error.code === "ECONNABORTED") {
        errorTitle = "Timeout Error";
        errorMessage = "Upload took too long. Please try again.";
      } else {
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

      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file selection for upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.includes("image")) {
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage(imageUrl);
      setImageBlob(file);
      setStatus("preview");
      stopCamera();
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  };

  // Switch camera
  const switchCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Toggle fullscreen for image preview
  const toggleFullscreen = () => {
    const element = previewImageRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
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
    setCapturedImage(null);
    setImageBlob(null);
    setStatus("idle");
    stopCamera();
  };

  return (
    <div className="bg-gray-900 min-h-screen lg:min-h-[50vh] p-4 lg:p-6 w-full mx-auto text-white lg:rounded-lg shadow-xl shadow-black/20">
      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />

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
        {status === "preview" ? "Image Preview" : "Capture or Upload an Image"}
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
          Camera error occurred. Please try again.
        </div>
      )}

      {/* Camera/Image Preview Area */}
      <div className="relative rounded-lg overflow-hidden border-2 border-gray-700 mb-6 bg-black">
        {status !== "preview" ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video object-cover"
          />
        ) : (
          <div className="relative">
            <img
              ref={previewImageRef}
              src={capturedImage}
              alt="Captured preview"
              className="w-full aspect-video object-contain bg-black"
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

        {/* Capture indicator */}
        {status === "ready" && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-16 h-16 border-4 border-white rounded-full bg-transparent flex items-center justify-center">
              <div className="w-12 h-12 bg-white rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {/* Step-by-step instructions */}
      <div className="mb-6 text-gray-300 text-sm text-center">
        {status === "idle" && (
          <p>Start by opening your camera or uploading an image file</p>
        )}
        {status === "ready" && (
          <p>Camera is ready. Press capture to take a photo</p>
        )}
        {status === "preview" && (
          <p>Review your image {isMobile && "or tap fullscreen icon"}</p>
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
              <FaUpload /> Upload Image
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
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
              onClick={captureImage}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-medium transition flex-1 justify-center"
              disabled={uploading}
            >
              📸 Capture Image
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

        {/* Preview state */}
        {status === "preview" && (
          <div className="flex gap-3 w-full">
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg font-medium transition flex-1"
              disabled={uploading}
            >
              <FaRedo /> Re-capture
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
            <ClipLoader size={16} color="white" /> Loading Camera...
          </button>
        )}
      </div>

      {/* Camera facing mode indicator */}
      {status === "ready" && (
        <div className="mt-4 text-center text-sm text-gray-400">
          Using {cameraFacing === "environment" ? "back" : "front"} camera
        </div>
      )}
    </div>
  );
};

export default ImageCaptureOrBrowse;
