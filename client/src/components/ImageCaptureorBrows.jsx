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
  const [isCameraReady, setIsCameraReady] = useState(false);

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
    if (status === "ready" && !isCameraReady) {
      startCamera();
    }
  }, [cameraFacing]);

  // SIMPLIFIED start camera - NO exact constraints to avoid OverconstrainedError
  const startCamera = async () => {
    setStatus("loading");
    setImageError(false);
    setIsCameraReady(false);

    try {
      // Stop any existing camera
      stopCamera();

      // SIMPLE CONSTRAINTS - don't use exact to avoid OverconstrainedError
      // Just request video with preferred facing mode as ideal (not required)
      const constraints = {
        video: {
          facingMode: { ideal: cameraFacing }, // Use 'ideal' instead of 'exact'
          width: { ideal: isMobile ? 1280 : 1920 },
          height: { ideal: isMobile ? 720 : 1080 },
        },
      };

      console.log("Requesting camera with constraints:", constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready with a simple approach
        await new Promise((resolve) => {
          const onLoadedMetadata = () => {
            console.log("Video metadata loaded");
            cleanup();
            resolve();
          };

          const onCanPlay = () => {
            console.log("Video can play");
            cleanup();
            resolve();
          };

          const cleanup = () => {
            if (videoRef.current) {
              videoRef.current.removeEventListener(
                "loadedmetadata",
                onLoadedMetadata,
              );
              videoRef.current.removeEventListener("canplay", onCanPlay);
            }
          };

          if (videoRef.current) {
            videoRef.current.addEventListener(
              "loadedmetadata",
              onLoadedMetadata,
            );
            videoRef.current.addEventListener("canplay", onCanPlay);
            videoRef.current.play().catch(console.error);

            // Fallback timeout
            setTimeout(() => {
              cleanup();
              resolve();
            }, 3000);
          } else {
            resolve();
          }
        });

        // Simple dimension check
        let attempts = 0;
        while (
          attempts < 20 &&
          (!videoRef.current || videoRef.current.videoWidth === 0)
        ) {
          await new Promise((r) => setTimeout(r, 100));
          attempts++;
        }

        if (videoRef.current && videoRef.current.videoWidth > 0) {
          console.log(
            `Video dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`,
          );
        }
      }

      setIsCameraReady(true);
      setStatus("ready");
    } catch (error) {
      console.error("Camera error:", error);

      // Try without any facing mode constraint as fallback
      if (
        error.name === "OverconstrainedError" ||
        error.name === "NotFoundError"
      ) {
        console.log("Trying fallback - any camera without facing mode");
        try {
          stopCamera();

          const fallbackConstraints = {
            video: {
              width: { ideal: isMobile ? 1280 : 1920 },
              height: { ideal: isMobile ? 720 : 1080 },
            },
          };

          const fallbackStream =
            await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          setMediaStream(fallbackStream);

          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play();

            // Wait for dimensions
            let attempts = 0;
            while (
              attempts < 20 &&
              (!videoRef.current || videoRef.current.videoWidth === 0)
            ) {
              await new Promise((r) => setTimeout(r, 100));
              attempts++;
            }
          }

          setIsCameraReady(true);
          setStatus("ready");
          return;
        } catch (fallbackError) {
          console.error("Fallback camera also failed:", fallbackError);
        }
      }

      setStatus("error");
      Swal.fire({
        title: "Camera Error",
        text:
          error.message || "Unable to access camera. Please check permissions.",
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
    setIsCameraReady(false);
  };

  // Capture image
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      Swal.fire({
        title: "Capture Failed",
        text: "Camera or canvas not ready. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    if (!isCameraReady) {
      Swal.fire({
        title: "Camera Not Ready",
        text: "Please wait for camera to fully initialize.",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      Swal.fire({
        title: "Camera Not Ready",
        text: "Camera stream not ready. Please wait a moment.",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    try {
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Verify canvas has data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData || imageData.data.length === 0) {
        throw new Error("Canvas drawing failed");
      }

      Swal.fire({
        title: "Capturing...",
        text: "Processing image...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      canvas.toBlob(
        (blob) => {
          Swal.close();

          if (!blob) {
            Swal.fire({
              title: "Capture Failed",
              text: "Failed to capture image. Please try again.",
              icon: "error",
              confirmButtonText: "OK",
            });
            return;
          }

          if (blob.size === 0) {
            Swal.fire({
              title: "Capture Failed",
              text: "Captured image is empty. Please try again.",
              icon: "error",
              confirmButtonText: "OK",
            });
            return;
          }

          console.log("Image captured successfully:", {
            size: (blob.size / 1024).toFixed(2) + " KB",
            dimensions: `${canvas.width}x${canvas.height}`,
          });

          if (blob.size > 5 * 1024 * 1024) {
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
    } catch (error) {
      Swal.close();
      console.error("Capture error:", error);
      Swal.fire({
        title: "Capture Failed",
        text: error.message || "Failed to capture image. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Compress image (unchanged)
  const compressImage = (originalBlob) => {
    Swal.fire({
      title: "Processing Image",
      text: "Compressing large image...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const img = new Image();
    const blobUrl = URL.createObjectURL(originalBlob);
    img.src = blobUrl;

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

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
          Swal.close();

          if (!compressedBlob) {
            console.warn("Compression failed, using original image");
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

          const savedMB = (
            (originalBlob.size - compressedBlob.size) /
            (1024 * 1024)
          ).toFixed(1);
          const savedKB = (
            (originalBlob.size - compressedBlob.size) /
            1024
          ).toFixed(0);

          if (parseFloat(savedMB) > 0 || parseFloat(savedKB) > 0) {
            Swal.fire({
              title: "Image Compressed",
              text: `Saved ${parseFloat(savedMB) > 0 ? savedMB + "MB" : savedKB + "KB"}`,
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            });
          }
        },
        "image/jpeg",
        0.85,
      );
    };

    img.onerror = () => {
      Swal.close();
      console.error("Failed to load image for compression");
      const imageUrl = URL.createObjectURL(originalBlob);
      setCapturedImage(imageUrl);
      setImageBlob(originalBlob);
      setStatus("preview");
      stopCamera();

      Swal.fire({
        title: "Warning",
        text: "Could not compress image, using original",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
      });
    };
  };

  // Handle file upload (UNCHANGED - preserving backend compatibility)
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
    stopCamera();
  };

  // Validate upload data (UNCHANGED)
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

    const isHelperOp =
      operationType === "helperOp" ||
      operationType === "HelperOp" ||
      operationType === "HelperOperation";

    if (isHelperOp) {
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
    } else {
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

  // Handle image upload (COMPLETELY UNCHANGED - preserving backend compatibility)
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

    if (!validateUploadData()) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      const isHelperOp =
        operationType === "helperOp" ||
        operationType === "HelperOp" ||
        operationType === "HelperOperation";

      if (isHelperOp) {
        formData.append("hOpName", uploadingData.hOpName || "");
        formData.append("hoId", String(uploadingData.hoId || ""));
        formData.append("styleNo", uploadingData.styleNo || "");
        formData.append(
          "styleId",
          uploadingData.styleId || uploadingData.style_id || "1",
        );
        if (uploadingData.helperId) {
          formData.append("helperId", String(uploadingData.helperId));
        }
      } else {
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

      formData.append("originalSize", String(imageBlob.size || 0));
      formData.append("imageQuality", "high");
      formData.append("uploadType", "image");

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

      let imageFile;
      if (imageBlob instanceof File) {
        imageFile = imageBlob;
      } else {
        imageFile = new File([imageBlob], fileName, {
          type: mimeType,
          lastModified: Date.now(),
        });
      }

      formData.append("image", imageFile);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const endpoint = isHelperOp
        ? `${apiUrl}/api/helperOpMedia/uploadImages`
        : `${apiUrl}/api/subOperationMedia/uploadImages`;

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

      if (response.status === 201 || response.status === 200) {
        if (response.data?.success === true) {
          await Swal.fire({
            title: "Success!",
            text: "Image uploaded successfully",
            icon: "success",
            timer: 4000,
            showConfirmButton: false,
          });

          if (capturedImage) {
            URL.revokeObjectURL(capturedImage);
          }

          setImageBlob(null);
          setCapturedImage(null);
          setStatus("idle");
          setUploading(false);
          setUploadProgress(0);

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
    } finally {
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
    setIsCameraReady(false);
    stopCamera();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Switch camera
  const switchCamera = () => {
    if (status === "ready") {
      const newFacing = cameraFacing === "user" ? "environment" : "user";
      setCameraFacing(newFacing);
      setIsCameraReady(false);
      setStatus("loading");
    }
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
              onLoadedData={() => {
                console.log("Video loaded data");
                setIsCameraReady(true);
              }}
              onCanPlay={() => {
                console.log("Video can play");
                setIsCameraReady(true);
              }}
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
        {status === "ready" && isCameraReady && (
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
        {status === "ready" && isCameraReady && (
          <p>Camera ready. Position and tap capture</p>
        )}
        {status === "ready" && !isCameraReady && (
          <p>⏳ Initializing camera, please wait...</p>
        )}
        {status === "preview" && !imageError && (
          <p>✅ Review your image and upload</p>
        )}
        {status === "loading" && <p>⏳ Starting camera...</p>}
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
              disabled={!isCameraReady || uploading}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition flex-1 justify-center text-sm ${
                !isCameraReady || uploading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              📸 Capture Image
            </button>
            {isMobile && (
              <button
                onClick={switchCamera}
                disabled={uploading}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg font-medium transition min-w-[100px] justify-center text-sm"
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
      {status === "ready" && isCameraReady && (
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
