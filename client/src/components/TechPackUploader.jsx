import axios from "axios";
import React, { useState, useRef } from "react";
import { FaUpload, FaFileExcel, FaCheck, FaTimes } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { ClipLoader } from "react-spinners";
import Swal from "sweetalert2";

const TechPackUploader = ({
  setIsUploading,
  uploadingData,
  setUploadingMaterial,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState("");
  const fileInputRef = useRef(null);

  // Allowed Excel file types
  const allowedFileTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.oasis.opendocument.spreadsheet",
    "text/csv",
    ".xls",
    ".xlsx",
    ".csv",
    ".ods",
  ];

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setValidationError("");

    if (!file) {
      return;
    }

    // Validate file type
    const fileExtension = file.name.split(".").pop().toLowerCase();
    const isValidType =
      allowedFileTypes.includes(file.type) ||
      [".xls", ".xlsx", ".csv", ".ods"].includes(`.${fileExtension}`);

    if (!isValidType) {
      setValidationError(
        "Please select a valid Excel file (.xls, .xlsx, .csv, .ods)"
      );
      setSelectedFile(null);
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setValidationError("File size too large. Maximum size is 10MB");
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setValidationError("File appears to be empty");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Handle drag and drop
  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const inputEvent = { target: { files: [file] } };
      handleFileSelect(inputEvent);
    }
  };

  // Handle drag over
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    setValidationError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload file - UPDATED FOR NEW BACKEND
  const handleUpload = async () => {
    if (!selectedFile) {
      setValidationError("Please select a file first");
      return;
    }

    // Validate required data
    if (!uploadingData.styleId) {
      setValidationError("Style information is missing");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // UPDATED: Only send styleId and styleNo (no moId, sopId, sopName, subOpId)
      formData.append("styleId", uploadingData.styleId);
      formData.append("styleNo", uploadingData.styleNo || "");
      formData.append("originalFileName", selectedFile.name);
      formData.append("fileSize", selectedFile.size);
      formData.append("fileType", selectedFile.type);
      formData.append("techPack", selectedFile);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

      const response = await axios.post(
        `${apiUrl}/api/subOperationMedia/uploadTechPack`,
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
          timeout: 120000,
        }
      );

      console.log("🔍 Tech Pack upload response:", response.data);

      if (response.status === 201) {
        if (response.data.success === true) {
          Swal.fire({
            title: "Success!",
            text: "Style Tech Pack uploaded successfully!",
            icon: "success",
            timer: 4000,
            showTimeProgress: true,
          });

          // Reset states
          setSelectedFile(null);
          setUploading(false);
          setUploadProgress(0);
          setValidationError("");

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          // Close modal after success
          setTimeout(() => {
            setUploadingMaterial(null);
          }, 1500);
        } else {
          throw new Error(response.data.message || "Upload failed");
        }
      }
    } catch (error) {
      console.error("❌ Tech Pack upload error:", error);

      let errorMessage = "Tech Pack upload failed";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        title: "Upload Failed",
        text: errorMessage,
        icon: "error",
        timer: 5000,
      });

      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file icon color based on extension
  const getFileIconColor = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    switch (extension) {
      case "xlsx":
        return "text-green-500";
      case "xls":
        return "text-green-600";
      case "csv":
        return "text-blue-500";
      case "ods":
        return "text-orange-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen lg:min-h-[50vh] p-4 lg:p-6 w-full mx-auto text-white lg:rounded-lg shadow-xl shadow-black/20">
      <div className="text-right relative">
        <button
          className="hover:bg-red-600 px-4 py-2 rounded-full absolute -top-2 -right-2 z-10"
          onClick={() => {
            setUploadingMaterial(null);
          }}
          disabled={uploading}
        >
          <RxCross2 className="text-2xl" />
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-2 text-center">Upload Style Tech Pack</h2>
      <p className="text-gray-400 text-center mb-6">
        Upload Excel files for the entire style (all operations)
      </p>

      {/* Style Info */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-2 text-blue-300">Style Information</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-blue-200">Style ID:</span>
            <span className="ml-2 font-medium">{uploadingData.styleId}</span>
          </div>
          <div>
            <span className="text-blue-200">Style No:</span>
            <span className="ml-2 font-medium">{uploadingData.styleNo}</span>
          </div>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>Uploading Tech Pack...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* File Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-all ${
          validationError
            ? "border-red-500 bg-red-900/20"
            : selectedFile
            ? "border-green-500 bg-green-900/20"
            : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {!selectedFile ? (
          <>
            <FaFileExcel className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-lg mb-2">Drag & Drop your Tech Pack here</p>
            <p className="text-gray-400 text-sm mb-4">
              Supported formats: XLS, XLSX, CSV, ODS (Max 10MB)
            </p>
            <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium cursor-pointer transition justify-center mx-auto w-fit">
              <FaUpload /> Choose File
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,.csv,.ods,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </>
        ) : (
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FaFileExcel
                className={`text-3xl ${getFileIconColor(selectedFile.name)}`}
              />
              <div className="text-left">
                <p className="font-medium truncate max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-gray-400 text-sm">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-400 hover:text-red-400 transition"
              disabled={uploading}
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-900 text-red-100 p-3 rounded-lg mb-6 text-center">
          {validationError}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-2 text-green-300">
          ℹ️ Style Tech Pack Information:
        </h3>
        <ul className="text-sm text-green-200 space-y-1">
          <li>• This tech pack will be available for ALL operations in this style</li>
          <li>• File must be in Excel format (.xls, .xlsx, .csv, .ods)</li>
          <li>• Maximum file size: 10MB</li>
          <li>• File will be stored as a style-level document</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setUploadingMaterial(null)}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 px-6 py-3 rounded-lg font-medium transition flex-1 justify-center"
          disabled={uploading}
        >
          <FaTimes /> Cancel
        </button>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition flex-1 justify-center"
        >
          {uploading ? <ClipLoader size={16} color="white" /> : <FaCheck />}
          {uploading ? "Uploading..." : "Upload Style Tech Pack"}
        </button>
      </div>
    </div>
  );
};

export default TechPackUploader;