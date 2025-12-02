import React, { useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { FaCheck, FaExclamation, FaInfoCircle } from "react-icons/fa";

const UploadMachine = () => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState({
    type: "", // "success", "error", "info"
    text: "",
    details: "", // Additional details for errors
    duration: 0, // Auto-dismiss duration (0 = manual dismiss)
  });

  const apiUrl = import.meta.env.VITE_API_URL;

  // Clear messages
  const clearMessage = () => {
    setMessage({ type: "", text: "", details: "", duration: 0 });
  };

  // Show message with auto-dismiss for success messages
  const showMessage = (type, text, details = "", duration = 0) => {
    setMessage({ type, text, details, duration });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const validExtensions = [".xlsx", ".xls"];

    const fileExtension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (
      !validTypes.includes(selectedFile.type) &&
      !validExtensions.includes(fileExtension)
    ) {
      showMessage(
        "error",
        "Invalid file type",
        "Please select a valid Excel file (.xlsx or .xls)"
      );
      setFile(null);
      return;
    }

    // File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (selectedFile.size > maxSize) {
      showMessage(
        "error",
        "File too large",
        "Please select a file smaller than 10MB"
      );
      setFile(null);
      return;
    }

    setFile(selectedFile);
    clearMessage();
    setSelectedOperations({
      mainOperations: {},
      subOperations: {},
    });
  };

  const removeFile = () => {
    setFile(null);
    clearMessage();
    setSelectedOperations({
      mainOperations: {},
      subOperations: {},
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showMessage("error", "No file selected", "Please select a file first");
      return;
    }

    setLoading(true);
    clearMessage();

    // Show loading message
    showMessage(
      "info",
      "Uploading file...",
      "Please wait while we process your file"
    );

    const formData = new FormData();
    formData.append("excelFile", file);

    try {
      const response = await axios.post(
        `${apiUrl}/api/machine/uploadExcel`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload Progress: ${percentCompleted}%`);
          },
        }
      );

      if (response.data.success) {
        const summary = response.data.data.summary;
        const successCount = summary?.successful || 0;
        const failedCount = summary?.failed || 0;
        const skippedCount = summary?.skipped || 0;

        let messageText = `Successfully processed ${successCount} machine${
          successCount !== 1 ? "s" : ""
        }`;
        let details = "";

        if (failedCount > 0 || skippedCount > 0) {
          details = `• Created: ${successCount}\n• Failed: ${failedCount}\n• Skipped: ${skippedCount}`;
        }

        showMessage("success", messageText, details, 5000);
        console.log("Upload successful:", response);
      } else {
        showMessage(
          "error",
          "Upload failed",
          response.data.error || "Failed to process file"
        );
      }
    } catch (err) {
      console.error("Upload error details:", err);
      console.error("Error response:", err.response);

      let errorMessage = "Upload failed";
      let errorDetails = "Please check your connection and try again";

      if (err.code === "ECONNABORTED") {
        errorMessage = "Request timeout";
        errorDetails =
          "File might be too large or server is taking too long to respond";
      } else if (err.response?.data?.error) {
        errorMessage = "Upload failed";
        errorDetails = err.response.data.error;
      } else if (err.response?.status === 413) {
        errorMessage = "File too large";
        errorDetails = "Please select a file smaller than 10MB";
      } else if (err.response?.status === 400) {
        errorMessage = "Invalid file";
        errorDetails =
          err.response.data.error || "Please check the file format and content";
      } else if (err.response?.status === 500) {
        errorMessage = "Server error";
        errorDetails = "Please try again later or contact support";
      } else if (!err.response) {
        errorMessage = "Network error";
        errorDetails = "Please check your internet connection";
      }

      showMessage("error", errorMessage, errorDetails);
    } finally {
      setLoading(false);
    }
  };

  // Get message styling based on type
  const getMessageStyles = (type) => {
    const baseStyles =
      "mx-8 mt-4 py-4 rounded-md shadow-md border flex items-center justify-between px-4";

    switch (type) {
      case "success":
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case "error":
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      case "info":
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
      default:
        return baseStyles;
    }
  };

  // Get icon based on message type
  const getMessageIcon = (type) => {
    const iconClass = "text-lg";

    switch (type) {
      case "success":
        return <FaCheck className={`${iconClass} text-green-600`} />;
      case "error":
        return <FaExclamation className={`${iconClass} text-red-600`} />;
      case "info":
        return <FaInfoCircle className={`${iconClass} text-blue-600`} />;
      default:
        return null;
    }
  };

  // Get close button styling based on type
  const getCloseButtonStyles = (type) => {
    const baseStyles = "rounded-full border group p-1 transition-colors";

    switch (type) {
      case "success":
        return `${baseStyles} border-green-600 text-green-600 hover:bg-green-600 hover:text-white`;
      case "error":
        return `${baseStyles} border-red-600 text-red-600 hover:bg-red-600 hover:text-white`;
      case "info":
        return `${baseStyles} border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white`;
      default:
        return baseStyles;
    }
  };

  return (
    <div className="bg-white rounded-lg p-2">
      {/* Excel upload part */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive ? "bg-blue-50" : "border-gray-300 hover:bg-blue-50"
        } ${loading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* File Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-blue hover:bg-blue-50"
          } ${loading ? "opacity-50 pointer-events-none" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={loading}
          />

          <div className="pointer-events-none">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="flex flex-col items-center justify-center gap-1">
              <p className="text-lg font-medium text-gray-900">
                {file ? file.name : "Upload Excel File"}
              </p>
              <p className="text-sm text-gray-500">
                {file
                  ? "Click to change file"
                  : "Drag & drop or click to browse"}
              </p>
              <p className="text-xs text-gray-400">
                Supports .xlsx, .xls files (max 10MB)
              </p>
            </div>
          </div>
        </div>

        {/* Selected File Info */}
        {file && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg
                className="h-8 w-8 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-red-500 hover:text-red-700 transition-colors"
              disabled={loading}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Message Display */}
        <AnimatePresence>
          {message.type && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={getMessageStyles(message.type)}
            >
              <div className="flex items-start space-x-3 flex-1">
                {getMessageIcon(message.type)}
                <div className="flex-1 text-left">
                  <p className="font-semibold">{message.text}</p>
                  {message.details && (
                    <p className="text-sm mt-1 whitespace-pre-line">
                      {message.details}
                    </p>
                  )}
                </div>
              </div>
              <button
                title="Close message"
                className={getCloseButtonStyles(message.type)}
                onClick={clearMessage}
              >
                <IoClose className="text-lg group-hover:text-xl duration-200" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              !file || loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Uploading machines...</span>
              </div>
            ) : (
              "Upload machines"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadMachine;
