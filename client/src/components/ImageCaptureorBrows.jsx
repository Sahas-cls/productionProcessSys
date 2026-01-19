import axios from "axios";
import React, { useState, useRef, useEffect } from "react";
import {
  FaCamera,
  FaUpload,
  FaSyncAlt,
  FaCheck,
  FaRedo,
  FaDownload,
} from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { ClipLoader } from "react-spinners";
import Swal from "sweetalert2";

const ImageCaptureorBrows = ({
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
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check if mobile device
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    return () => {
      stopCamera();
    };
  }, []);

  // Initialize camera when facing mode changes
  useEffect(() => {
    if (status === "ready") {
      startCamera();
    }
  }, [cameraFacing]);

  // Start camera
  const startCamera = async () => {
    setStatus("loading");
    try {
      stopCamera();

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

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        // Check file size (5MB limit for images)
        if (blob.size > 5 * 1024 * 1024) {
          // Compress if too large
          compressImage(blob);
        } else {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          setImageBlob(blob);
          setStatus("preview");
        }
      },
      "image/jpeg",
      0.9, // 90% quality
    );
  };

  // Compress image if needed
  const compressImage = (originalBlob) => {
    const img = new Image();
    img.src = URL.createObjectURL(originalBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Calculate new dimensions (max 1920x1080)
      const maxWidth = 1920;
      const maxHeight = 1080;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (compressedBlob) => {
          if (!compressedBlob) {
            // Fallback to original
            const imageUrl = URL.createObjectURL(originalBlob);
            setCapturedImage(imageUrl);
            setImageBlob(originalBlob);
            setStatus("preview");
            return;
          }

          const imageUrl = URL.createObjectURL(compressedBlob);
          setCapturedImage(imageUrl);
          setImageBlob(compressedBlob);
          setStatus("preview");
        },
        "image/jpeg",
        0.8, // 80% quality after resize
      );

      URL.revokeObjectURL(img.src);
    };
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.includes("image")) {
      Swal.fire({
        title: "Invalid File",
        text: "Please select an image file (JPG, PNG, etc.)",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        title: "File Too Large",
        text: "Image exceeds 5MB limit. Please select a smaller image.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setCapturedImage(imageUrl);
    setImageBlob(file);
    setStatus("preview");
  };

  // Handle image upload
  const handleUpload = async () => {
    if (!imageBlob) {
      Swal.fire({
        title: "No Image",
        text: "Please capture or select an image first",
        icon: "warning",
        timer: 3000,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Append metadata
      formData.append("styleId", uploadingData.style_id || 1);
      formData.append("styleNo", uploadingData.styleNo);
      formData.append("moId", uploadingData.moId);
      formData.append("sopId", uploadingData.sopId);
      formData.append("sopName", uploadingData.sopName);
      formData.append("subOpId", uploadingData.subOpId || uploadingData.sopId);

      // Determine file extension
      const timestamp = new Date().getTime();
      const fileName = `image-${timestamp}.jpg`;

      // Append image file
      formData.append("image", imageBlob, fileName);

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
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setUploadProgress(percentCompleted);
            }
          },
          timeout: 60000, // 1 minute for images
        },
      );

      if (response.status === 201 && response.data.success === true) {
        Swal.fire({
          title: "Success!",
          text: "Image uploaded successfully",
          icon: "success",
          timer: 4000,
          showConfirmButton: false,
        });

        // Cleanup
        if (capturedImage) {
          URL.revokeObjectURL(capturedImage);
        }

        setImageBlob(null);
        setCapturedImage(null);
        setStatus("idle");
        setUploading(false);
        setUploadProgress(0);

        // Optionally close the modal
        if (setUploadingMaterial) {
          setUploadingMaterial(null);
        }
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);

      let errorMessage = "Upload failed";
      let errorTitle = "Upload Failed";

      if (error.response) {
        errorMessage =
          error.response.data?.message || error.response.statusText;

        if (error.response.status === 413) {
          errorTitle = "File Too Large";
          errorMessage = "Image exceeds server size limit.";
        } else if (error.response.status === 415) {
          errorTitle = "Unsupported Format";
          errorMessage = "Image format not supported.";
        }
      } else if (error.code === "ECONNABORTED") {
        errorTitle = "Timeout";
        errorMessage = "Upload took too long. Please try again.";
      } else if (!error.response) {
        errorTitle = "Network Error";
        errorMessage = "Unable to connect to server.";
      }

      Swal.fire({
        title: errorTitle,
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });

      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Reset flow
  const reset = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setImageBlob(null);
    setStatus("idle");
    stopCamera();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Switch camera
  const switchCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div className="bg-gray-900 min-h-screen w-[800px] p-10 lg:min-h-[50vh] sm:p-4 lg:p-6 mx-auto text-white lg:rounded-lg shadow-xl shadow-black/20">
      {/* Close button */}
      <div className="text-right relative">
        <button
          className="hover:bg-red-600 px-3 py-1 sm:px-4 sm:py-2 rounded-full absolute -top-1 -right-1 sm:-top-2 sm:-right-2 z-10 transition-colors"
          onClick={() => {
            reset();
            setUploadingMaterial?.(null);
          }}
          disabled={uploading}
        >
          <RxCross2 className="text-xl sm:text-2xl" />
        </button>
      </div>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">
        {status === "preview" ? "Image Preview" : "Capture or Upload Image"}
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

      {/* Image Preview Area */}
      <div className="relative rounded-lg overflow-hidden border-2 border-gray-700 mb-4 sm:mb-6 bg-black">
        <div className="relative w-full" style={{ paddingTop: "75%" }}>
          {" "}
          {/* 4:3 aspect ratio for images */}
          {status !== "preview" ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute top-0 left-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <img
                src={capturedImage}
                alt="Captured preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>

        {/* Image size info */}
        {status === "preview" && imageBlob && (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            Size: {(imageBlob.size / (1024 * 1024)).toFixed(2)} MB
          </div>
        )}
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Instructions */}
      <div className="mb-4 sm:mb-6 text-gray-300 text-xs sm:text-sm text-center px-2">
        {status === "idle" && <p>Open camera or upload an image (max 5MB)</p>}
        {status === "ready" && <p>Camera ready. Tap capture when prepared</p>}
        {status === "preview" && <p>Review your image</p>}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {/* Idle state */}
        {status === "idle" && (
          <>
            <button
              onClick={startCamera}
              className="flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition flex-1 justify-center min-w-[120px] text-sm sm:text-base"
              disabled={uploading}
            >
              <FaCamera className="text-sm sm:text-base" /> Open Camera
            </button>
            <label className="flex items-center gap-1 sm:gap-2 bg-gray-700 hover:bg-gray-800 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium cursor-pointer transition flex-1 justify-center min-w-[120px] text-sm sm:text-base">
              <FaUpload className="text-sm sm:text-base" /> Upload Image
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
              className="flex items-center gap-1 sm:gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition flex-1 justify-center text-sm sm:text-base"
              disabled={uploading}
            >
              📸 Capture Image
            </button>
            {isMobile && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-1 sm:gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition min-w-[80px] sm:min-w-[100px] justify-center text-sm sm:text-base"
                disabled={uploading}
              >
                <FaSyncAlt className="text-sm sm:text-base" /> Flip
              </button>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-1 sm:gap-2 bg-gray-700 hover:bg-gray-800 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition min-w-[80px] sm:min-w-[100px] justify-center text-sm sm:text-base"
              disabled={uploading}
            >
              Cancel
            </button>
          </>
        )}

        {/* Preview state */}
        {status === "preview" && (
          <div className="flex gap-2 sm:gap-3 w-full">
            <button
              onClick={reset}
              className="flex items-center gap-1 sm:gap-2 bg-yellow-600 hover:bg-yellow-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition flex-1 justify-center text-sm sm:text-base"
              disabled={uploading}
            >
              <FaRedo className="text-sm sm:text-base" /> Retake
            </button>
            <button
              onClick={handleUpload}
              className="flex items-center gap-1 sm:gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition flex-1 justify-center text-sm sm:text-base"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <ClipLoader size={14} color="white" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <FaCheck className="text-sm sm:text-base" /> Upload
                </>
              )}
            </button>
          </div>
        )}

        {/* Loading state */}
        {status === "loading" && (
          <div className="w-full text-center py-3">
            <ClipLoader size={20} color="white" />
            <p className="mt-2 text-sm">Loading camera...</p>
          </div>
        )}
      </div>

      {/* Camera facing mode indicator */}
      {status === "ready" && (
        <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-400">
          Using {cameraFacing === "environment" ? "back" : "front"} camera
        </div>
      )}

      {/* Size warning */}
      <div className="mt-3 text-center text-xs text-yellow-400">
        ⚠️ Maximum image size: 5MB
      </div>
    </div>
  );
};

export default ImageCaptureorBrows;
