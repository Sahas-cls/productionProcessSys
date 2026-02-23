import axios from "axios";
import React, { useState, useRef, useEffect } from "react";
import { FaCamera, FaUpload, FaSyncAlt, FaCheck, FaRedo } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { ClipLoader } from "react-spinners";
import Swal from "sweetalert2";

const ImageCaptureorBrows = ({
  setIsUploading,
  uploadingData,
  setUploadingMaterial,
  operationType,
}) => {
  const [mediaStream, setMediaStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [status, setStatus] = useState("idle");
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageError, setImageError] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imagePreviewRef = useRef(null);

  console.log("uploading data from image component: ", uploadingData);
  console.log("operation type: ", operationType);

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
    setImageError(false);

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
        await videoRef.current.play();
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
        if (!blob) {
          Swal.fire({
            title: "Capture Failed",
            text: "Failed to capture image. Please try again.",
            icon: "error",
            confirmButtonText: "OK",
          });
          return;
        }

        // Check file size (5MB limit for images)
        if (blob.size > 5 * 1024 * 1024) {
          // Compress if too large
          compressImage(blob);
        } else {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          setImageBlob(blob);
          setStatus("preview");
          stopCamera();
        }
      },
      "image/jpeg",
      0.92,
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
            stopCamera();
            return;
          }

          const imageUrl = URL.createObjectURL(compressedBlob);
          setCapturedImage(imageUrl);
          setImageBlob(compressedBlob);
          setStatus("preview");
          stopCamera();

          // Show compression success
          const savedMB = (
            (originalBlob.size - compressedBlob.size) /
            (1024 * 1024)
          ).toFixed(1);
          if (savedMB > 0.5) {
            Swal.fire({
              title: "Image Compressed",
              text: `Saved ${savedMB}MB`,
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            });
          }
        },
        "image/jpeg",
        0.85,
      );

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      // Fallback to original
      const imageUrl = URL.createObjectURL(originalBlob);
      setCapturedImage(imageUrl);
      setImageBlob(originalBlob);
      setStatus("preview");
      stopCamera();
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
    setImageError(false);
  };

  // Validate upload data based on operation type
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

    // Helper Operation validation - matches the operationType from props
    const isHelperOp =
      operationType === "helperOp" ||
      operationType === "HelperOp" ||
      operationType === "HelperOperation";

    if (isHelperOp) {
      // ONLY check for Helper Operation fields
      if (!uploadingData.hoId) {
        console.error("Missing hoId:", uploadingData);
        Swal.fire({
          title: "Missing Data",
          text: "Helper Operation ID is missing",
          icon: "error",
          confirmButtonText: "OK",
        });
        return false;
      }
      if (!uploadingData.hOpName) {
        console.error("Missing hOpName:", uploadingData);
        Swal.fire({
          title: "Missing Data",
          text: "Helper Operation name is missing",
          icon: "error",
          confirmButtonText: "OK",
        });
        return false;
      }
      return true;
    }

    // Sub Operation validation - only runs for non-helper operations
    else {
      // Check for sopId or subOpId (both possible field names)
      const hasSubOpId = uploadingData.sopId || uploadingData.subOpId;
      if (!hasSubOpId) {
        console.error("Missing sub operation ID:", uploadingData);
        Swal.fire({
          title: "Missing Data",
          text: "Sub Operation ID is missing",
          icon: "error",
          confirmButtonText: "OK",
        });
        return false;
      }

      if (!uploadingData.moId) {
        console.error("Missing moId:", uploadingData);
        Swal.fire({
          title: "Missing Data",
          text: "Main Operation ID is missing",
          icon: "error",
          confirmButtonText: "OK",
        });
        return false;
      }
      return true;
    }
  };

  // Handle image upload
  const handleUpload = async () => {
    if (!imageBlob) {
      Swal.fire({
        title: "No Image",
        text: "Please capture or select an image first",
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

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Check if it's Helper Operation
      const isHelperOp =
        operationType === "helperOp" ||
        operationType === "HelperOp" ||
        operationType === "HelperOperation";

      // Append operation-specific data
      if (isHelperOp) {
        // ONLY Helper Operation fields
        formData.append("hOpName", uploadingData.hOpName || "");
        formData.append("hoId", String(uploadingData.hoId || ""));
        formData.append("styleNo", uploadingData.styleNo || "");
        formData.append(
          "styleId",
          uploadingData.styleId || uploadingData.style_id || "1",
        );
        // Optional fields
        if (uploadingData.helperId) {
          formData.append("helperId", String(uploadingData.helperId));
        }
      } else {
        // Sub Operation fields
        formData.append(
          "styleId",
          uploadingData.style_id || uploadingData.styleId || "1",
        );
        formData.append("styleNo", uploadingData.styleNo || "");
        formData.append("moId", String(uploadingData.moId || ""));
        formData.append(
          "sopId",
          String(uploadingData.sopId || uploadingData.subOpId || ""),
        );
        formData.append(
          "sopName",
          uploadingData.sopName || uploadingData.subOpName || "",
        );
        formData.append(
          "subOpId",
          String(uploadingData.sopId || uploadingData.subOpId || ""),
        );
      }

      // Add image metadata
      formData.append("originalSize", String(imageBlob.size || 0));
      formData.append("imageQuality", "high");
      formData.append("uploadType", "image");

      // Determine file extension and MIME type
      const timestamp = new Date().getTime();
      let fileName, mimeType, fileExtension;

      if (imageBlob instanceof File) {
        fileName = imageBlob.name;
        mimeType = imageBlob.type;
      } else {
        mimeType = imageBlob.type || "image/jpeg";

        if (mimeType.includes("png")) {
          fileExtension = "png";
        } else if (mimeType.includes("gif")) {
          fileExtension = "gif";
        } else if (mimeType.includes("webp")) {
          fileExtension = "webp";
        } else {
          fileExtension = "jpg";
          mimeType = "image/jpeg";
        }

        fileName = `operation-image-${timestamp}.${fileExtension}`;
      }

      // Create File object if needed
      let imageFile;
      if (imageBlob instanceof File) {
        imageFile = imageBlob;
      } else {
        imageFile = new File([imageBlob], fileName, {
          type: mimeType,
          lastModified: Date.now(),
        });
      }

      console.log("Image upload details:", {
        mimeType: mimeType,
        fileName: fileName,
        size: imageBlob.size,
        operationType: operationType,
        isHelperOp: isHelperOp,
        formDataEntries: [...formData.entries()],
      });

      formData.append("image", imageFile);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

      // Determine endpoint based on operation type
      const endpoint = isHelperOp
        ? `${apiUrl}/api/helperOpMedia/uploadImages`
        : `${apiUrl}/api/subOperationMedia/uploadImages`;

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
        timeout: 60000,
      });

      console.log("Upload response:", response.data);

      if (response.status === 201 || response.status === 200) {
        if (response.data?.success === true) {
          await Swal.fire({
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

          // Reset state
          setImageBlob(null);
          setCapturedImage(null);
          setStatus("idle");
          setUploading(false);
          setUploadProgress(0);

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
        errorTitle = "Timeout";
        errorMessage = "Upload took too long. Please try again.";
      } else if (error.response) {
        switch (error.response.status) {
          case 413:
            errorTitle = "File Too Large";
            errorMessage = "Image exceeds server size limit.";
            break;
          case 415:
            errorTitle = "Unsupported Format";
            errorMessage = "Image format not supported.";
            break;
          case 400:
            errorMessage = error.response.data?.message || "Invalid request.";
            break;
          case 401:
            errorTitle = "Authentication Error";
            errorMessage = "Please login again.";
            break;
          case 403:
            errorTitle = "Permission Denied";
            errorMessage = "You don't have permission to upload.";
            break;
          case 404:
            errorTitle = "Endpoint Not Found";
            errorMessage = "Upload endpoint not configured.";
            break;
          default:
            errorMessage = `Server error (${error.response.status}). Please try again.`;
        }
      } else if (error.request) {
        errorTitle = "Network Error";
        errorMessage =
          "Cannot connect to server. Please check your connection.";
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
    setImageError(false);
    stopCamera();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Switch camera
  const switchCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-gray-900 min-h-screen w-full max-w-2xl mx-auto p-4 md:p-6 text-white rounded-lg shadow-xl shadow-black/20">
      {/* Close button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {status === "preview"
            ? "Image Preview"
            : operationType === "helperOp" ||
                operationType === "HelperOp" ||
                operationType === "HelperOperation"
              ? "Upload Helper Operation Image"
              : "Upload Sub Operation Image"}
        </h2>
        <button
          className="p-2 hover:bg-red-600 rounded-full transition-colors"
          onClick={() => {
            reset();
            setUploadingMaterial?.(null);
          }}
          disabled={uploading}
        >
          <RxCross2 className="text-xl" />
        </button>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-blue-400">Uploading image...</span>
            <span className="text-blue-400">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Operation Info */}
      {uploadingData && status !== "idle" && (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <span className="font-semibold">
              {operationType === "helperOp" ||
              operationType === "HelperOp" ||
              operationType === "HelperOperation"
                ? "Helper Op:"
                : "Sub Op:"}
            </span>
            <span className="truncate">
              {operationType === "helperOp" ||
              operationType === "HelperOp" ||
              operationType === "HelperOperation"
                ? uploadingData.hOpName
                : uploadingData.sopName || uploadingData.subOpName}
            </span>
          </div>
          {(operationType === "helperOp" ||
            operationType === "HelperOp" ||
            operationType === "HelperOperation") &&
            uploadingData.styleNo && (
              <div className="text-xs text-gray-400 mt-1">
                Style: {uploadingData.styleNo}
              </div>
            )}
        </div>
      )}

      {/* Image Preview Area */}
      <div className="relative rounded-lg overflow-hidden border-2 border-gray-700 mb-4 bg-black">
        <div className="relative w-full" style={{ paddingTop: "75%" }}>
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <ClipLoader size={40} color="#3B82F6" />
              <p className="mt-2 text-sm text-gray-300">Loading camera...</p>
            </div>
          )}

          {status === "ready" && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute top-0 left-0 w-full h-full object-cover"
            />
          )}

          {status === "preview" && capturedImage && !imageError && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black">
              <img
                ref={imagePreviewRef}
                src={capturedImage}
                alt="Captured preview"
                className="max-w-full max-h-full object-contain"
                onError={handleImageError}
              />
            </div>
          )}

          {status === "preview" && imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <p className="text-red-400 mb-2">⚠️ Image failed to load</p>
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                >
                  Retake Image
                </button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center p-4">
                <p className="text-red-400 mb-2">⚠️ Camera Error</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Image size info */}
        {status === "preview" && imageBlob && !imageError && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            {(imageBlob.size / (1024 * 1024)).toFixed(2)} MB
          </div>
        )}

        {/* Camera indicator */}
        {status === "ready" && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Camera Ready
          </div>
        )}
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Status message */}
      <div className="mb-4 text-gray-300 text-sm text-center px-2">
        {status === "idle" && (
          <p>📸 Open camera or upload an image (max 5MB)</p>
        )}
        {status === "ready" && <p>Camera ready. Position and tap capture</p>}
        {status === "preview" && !imageError && (
          <p>✅ Review your image and upload</p>
        )}
        {status === "loading" && <p>⏳ Initializing camera...</p>}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        {/* Idle state */}
        {status === "idle" && (
          <>
            <button
              onClick={startCamera}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-medium transition flex-1 justify-center text-sm"
              disabled={uploading}
            >
              <FaCamera /> Open Camera
            </button>
            <label className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 px-4 py-3 rounded-lg font-medium cursor-pointer transition flex-1 justify-center text-sm">
              <FaUpload /> Upload Image
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
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
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition flex-1 justify-center text-sm"
              disabled={uploading}
            >
              📸 Capture Image
            </button>
            {isMobile && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg font-medium transition min-w-[100px] justify-center text-sm"
                disabled={uploading}
              >
                <FaSyncAlt /> Flip
              </button>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 px-4 py-3 rounded-lg font-medium transition min-w-[100px] justify-center text-sm"
              disabled={uploading}
            >
              Cancel
            </button>
          </>
        )}

        {/* Preview state */}
        {status === "preview" && !imageError && (
          <>
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg font-medium transition flex-1 justify-center text-sm"
              disabled={uploading}
            >
              <FaRedo /> Retake
            </button>
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-medium transition flex-1 justify-center text-sm"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <ClipLoader size={14} color="white" />
                  Uploading... {uploadProgress}%
                </>
              ) : (
                <>
                  <FaCheck /> Upload
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Camera facing mode indicator */}
      {status === "ready" && (
        <div className="mt-4 text-center text-xs text-gray-400">
          Using {cameraFacing === "environment" ? "back" : "front"} camera
        </div>
      )}

      {/* Footer info */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex flex-wrap justify-between items-center text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Ready
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              Preview
            </span>
          </div>
          <span className="text-yellow-400">⚠️ Max 5MB</span>
          <span>{isMobile ? "📱 Mobile" : "💻 Desktop"}</span>
        </div>
      </div>
    </div>
  );
};

export default ImageCaptureorBrows;
