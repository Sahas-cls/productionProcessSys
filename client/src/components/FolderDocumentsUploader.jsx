import axios from "axios";
import React, { useState, useRef } from "react";
import {
  FaUpload,
  FaFolder,
  FaFile,
  FaCheck,
  FaTimes,
  FaFileArchive,
} from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { ClipLoader } from "react-spinners";
import Swal from "sweetalert2";

const FolderDocumentsUploader = ({
  setIsUploading,
  uploadingData,
  setUploadingMaterial,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState("");
  const fileInputRef = useRef(null);

  // Allowed document types for garment production
  const allowedFileTypes = [
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/webp",

    // ZIP files
    "application/zip",
    "application/x-zip-compressed",

    // Fallbacks
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt",
    ".jpg",
    ".jpeg",
    ".png",
    ".zip",
  ];

  // File type categories for display
  const fileTypeCategories = {
    pdf: { label: "PDF", color: "text-red-500" },
    doc: { label: "Word", color: "text-blue-500" },
    docx: { label: "Word", color: "text-blue-500" },
    xls: { label: "Excel", color: "text-green-500" },
    xlsx: { label: "Excel", color: "text-green-500" },
    zip: { label: "ZIP", color: "text-yellow-500" },
    jpg: { label: "Image", color: "text-purple-500" },
    jpeg: { label: "Image", color: "text-purple-500" },
    png: { label: "Image", color: "text-purple-500" },
    txt: { label: "Text", color: "text-gray-500" },
    default: { label: "Document", color: "text-gray-400" },
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setValidationError("");

    if (files.length === 0) {
      return;
    }

    // Validate each file
    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      const fileExtension = file.name.split(".").pop().toLowerCase();
      const isValidType =
        allowedFileTypes.includes(file.type) ||
        allowedFileTypes.includes(`.${fileExtension}`);

      if (!isValidType) {
        errors.push(`"${file.name}" - Unsupported file type`);
        return;
      }

      // Validate file size (20MB max per file)
      const maxSize = 20 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`"${file.name}" - File too large (max 20MB)`);
        return;
      }

      if (file.size === 0) {
        errors.push(`"${file.name}" - File is empty`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setValidationError(
        errors.slice(0, 3).join(", ") +
          (errors.length > 3 ? `... and ${errors.length - 3} more` : ""),
      );
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle drag and drop
  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      const inputEvent = { target: { files } };
      handleFileSelect(inputEvent);
    }
  };

  // Handle drag over
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Remove single file
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setValidationError("");
  };

  // Remove all files
  const removeAllFiles = () => {
    setSelectedFiles([]);
    setValidationError("");
  };

  // Get file type info
  const getFileTypeInfo = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    return fileTypeCategories[extension] || fileTypeCategories.default;
  };

  // Upload files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setValidationError("Please select at least one file");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    console.log("uploading data: ", uploadingData);

    try {
      const formData = new FormData();

      // Append the metadata - ADD subOpId HERE!
      // formData.append("styleId", uploadingData.style_id || 1);
      formData.append("styleId", uploadingData.styleId);
      formData.append("styleNo", uploadingData.styleNo);
      // formData.append("moId", uploadingData.moId);
      // formData.append("sopId", uploadingData.sopId);
      // formData.append("sopName", uploadingData.sopName);
      // formData.append("subOpId", uploadingData.subOpId || uploadingData.sopId);
      formData.append("totalFiles", selectedFiles.length);
      formData.append("folderName", `Style_${uploadingData.styleNo}_Documents`);

      // Calculate total file size for validation
      const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
      const maxTotalSize = 100 * 1024 * 1024; // 100MB total
      const maxIndividualSize = 20 * 1024 * 1024; // 20MB per file

      // Validate individual file sizes
      const oversizedFiles = selectedFiles.filter(
        (file) => file.size > maxIndividualSize,
      );
      if (oversizedFiles.length > 0) {
        throw new Error(
          `Some files exceed 20MB limit: ${oversizedFiles
            .map((f) => f.name)
            .join(", ")}`,
        );
      }

      // Validate total size
      if (totalSize > maxTotalSize) {
        throw new Error(
          `Total upload size (${(totalSize / (1024 * 1024)).toFixed(
            2,
          )}MB) exceeds 100MB limit`,
        );
      }

      formData.append("totalSize", totalSize);

      // Append each file - field name should be "documents" or check what backend expects
      selectedFiles.forEach((file, index) => {
        formData.append("documents", file); // or "files" based on your backend
        console.log(
          `📤 Appending file ${index + 1}: ${file.name} (${(
            file.size / 1024
          ).toFixed(2)}KB)`,
        );
      });

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

      console.log(
        `📦 Starting upload of ${selectedFiles.length} files to Backblaze B2...`,
      );
      console.log("form data: ", formData);
      // return;
      const response = await axios.post(
        `${apiUrl}/api/subOperationMedia/uploadFolder`,
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
              console.log(`📊 Upload progress: ${percentCompleted}%`);
            }
          },
          timeout: 300000, // Increased to 5 minutes for multiple files
        },
      );

      console.log("🔍 Folder documents upload response:", response.data);

      // Enhanced success checking
      if (response.status === 201) {
        if (response.data.success === true) {
          let successTitle = "Success!";
          let successText = `Folder documents uploaded successfully! (${selectedFiles.length} files)`;
          let iconType = "success";
          let timerDuration = 5000;

          // Check for processing results
          if (response.data.uploadResults) {
            const results = response.data.uploadResults;
            if (results.filesProcessed) {
              successText = `${results.filesProcessed} out of ${selectedFiles.length} files uploaded to cloud storage`;

              if (results.failedFiles && results.failedFiles > 0) {
                successTitle = "Partial Upload";
                iconType = "warning";
                successText += `. ${results.failedFiles} files failed`;

                // Show details of failed files
                if (response.data.failedFiles) {
                  console.log(
                    "❌ Failed files details:",
                    response.data.failedFiles,
                  );
                }
              }

              // Add size info if available
              if (results.totalSize) {
                successText += ` (Total: ${(
                  results.totalSize /
                  (1024 * 1024)
                ).toFixed(2)}MB)`;
              }
            }
          }

          // Check if it's Backblaze B2 storage
          if (
            response.data.storage &&
            response.data.storage.type === "backblaze_b2"
          ) {
            successTitle = "Uploaded to Cloud!";
            successText = `Files uploaded to cloud storage successfully!`;
            iconType = "success";
            timerDuration = 5000;

            console.log("☁️ Stored in Backblaze B2:", {
              bucket: response.data.storage.bucket,
              region: response.data.storage.region,
              filesProcessed: response.data.uploadResults?.filesProcessed,
              totalSize: response.data.uploadResults?.totalSize,
            });
          }

          // Check for any warnings
          else if (response.data.warnings || response.data.warning) {
            successTitle = "Uploaded with Note";
            successText = response.data.warnings || response.data.warning;
            iconType = "warning";
            timerDuration = 6000;
          }

          Swal.fire({
            title: successTitle,
            text: successText,
            timer: timerDuration,
            showTimeProgress: true,
            showCancelButton: false,
            icon: iconType,
          });

          console.log("✅ Folder documents upload successful:", response.data);
          console.log(
            "📁 Storage provider:",
            response.data.storage?.type ||
              response.data.storageProvider ||
              "Backblaze B2",
          );

          // Log successful files details
          if (response.data.data && Array.isArray(response.data.data)) {
            console.log(
              "📦 Uploaded files details:",
              response.data.data.map((file) => ({
                id: file.id,
                originalName: file.originalName,
                savedName: file.savedName,
                size: (file.size / 1024).toFixed(2) + "KB",
                b2FileId: file.b2FileId,
                filePath: file.filePath,
              })),
            );
          }

          // Reset states after successful upload
          setSelectedFiles([]);
          setUploading(false);
          setUploadProgress(0);
          setValidationError("");

          // Optionally trigger a refresh of folder files list
          if (typeof onUploadSuccess === "function") {
            onUploadSuccess(response.data.data);
          }
        } else if (response.data.success === false) {
          console.error("❌ Server returned failure:", response.data);
          throw new Error(
            response.data.message || "Folder upload failed on server",
          );
        } else {
          console.error(
            "❌ Malformed response - no success flag:",
            response.data,
          );
          throw new Error("Server response format error");
        }
      } else {
        console.error("❌ Unexpected status code:", response.status);
        throw new Error(`Upload failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Folder documents upload error:", error);
      console.error("❌ Error response data:", error.response?.data);

      let errorMessage = "Folder documents upload failed";
      let errorTitle = "Upload Failed";
      let timerDuration = 5000;

      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          error.response.statusText ||
          "Server error occurred";

        if (error.response.status === 400) {
          errorTitle = "Invalid Request";
          if (errorMessage?.includes("Missing required fields")) {
            // More specific error for missing subOpId
            if (errorMessage?.includes("subOpId")) {
              errorMessage = "Please provide sub-operation ID";
            } else {
              errorMessage = "Please fill all required fields";
            }
          } else if (errorMessage?.includes("too large")) {
            errorMessage =
              "Some files are too large. Maximum size is 20MB per file";
          } else if (errorMessage?.includes("Invalid file format")) {
            errorMessage = "Some files have unsupported formats";
          } else if (errorMessage?.includes("No files uploaded")) {
            errorMessage = "No files selected";
          }
        } else if (error.response.status === 413) {
          errorTitle = "Files Too Large";
          errorMessage = "Total upload size too large. Maximum 100MB total";
        } else if (error.response.status === 415) {
          errorTitle = "Unsupported Formats";
          errorMessage = "Some file formats are not supported";
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
        errorMessage =
          "Upload took too long. Please try again with fewer/smaller files.";
      } else if (error.message.includes("exceeds")) {
        errorTitle = "File Size Error";
        errorMessage = error.message;
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

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Calculate total size
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

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

      <h2 className="text-2xl font-bold mb-2 text-center">
        Upload Production Folder
      </h2>
      <p className="text-gray-400 text-center mb-6">
        Upload all documents related to this production order
      </p>

      {/* Upload progress */}
      {uploading && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>
              Uploading Folder Documents... ({selectedFiles.length} files)
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* File Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center transition-all ${
          validationError
            ? "border-red-500 bg-red-900/20"
            : selectedFiles.length > 0
              ? "border-green-500 bg-green-900/20"
              : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {selectedFiles.length === 0 ? (
          <>
            <FaFolder className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-lg mb-2">
              Drag & Drop your production documents here
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Or click below to select multiple files
            </p>
            <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium cursor-pointer transition justify-center mx-auto w-fit">
              <FaUpload /> Choose Files
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,application/zip"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </>
        ) : (
          <div className="text-left">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-lg">
                  Selected Files ({selectedFiles.length})
                </h3>
                <p className="text-gray-400 text-sm">
                  Total size: {formatFileSize(totalSize)}
                </p>
              </div>
              <button
                onClick={removeAllFiles}
                className="text-gray-400 hover:text-red-400 transition px-3 py-1 rounded border border-gray-600 hover:border-red-400"
                disabled={uploading}
              >
                Clear All
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {selectedFiles.map((file, index) => {
                const fileTypeInfo = getFileTypeInfo(file.name);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-800 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FaFile className={`text-xl ${fileTypeInfo.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <div className="flex gap-4 text-sm text-gray-400">
                          <span>{fileTypeInfo.label}</span>
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-400 transition ml-2"
                      disabled={uploading}
                    >
                      <FaTimes />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-900 text-red-100 p-3 rounded-lg mb-4 text-center">
          {validationError}
        </div>
      )}

      {/* Instructions */}
      {/* <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-2 text-purple-300">
          📁 Production Folder Contents:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-purple-200">
          <div>
            <p className="font-medium mb-1">Recommended Documents:</p>
            <ul className="space-y-1">
              <li>• Cutting tickets & markers</li>
              <li>• Operation breakdown sheets</li>
              <li>• Quality control checklists</li>
              <li>• Thread/trims consumption</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">Supported Formats:</p>
            <ul className="space-y-1">
              <li>• PDF, Word, Excel files</li>
              <li>• Images (JPG, PNG)</li>
              <li>• ZIP archives</li>
              <li>• Text files</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-purple-300 mt-2">
          💡 <strong>Tip:</strong> You can upload individual files or a ZIP file
          containing all documents
        </p>
      </div> */}

      {/* Quick Actions */}
      {selectedFiles.length === 0 && (
        <div className="flex gap-2 mb-6 justify-center">
          <label className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded-lg text-sm cursor-pointer transition">
            <FaFileArchive /> Upload ZIP
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          {/* <label className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded-lg text-sm cursor-pointer transition">
            <FaFile /> Multiple Files
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label> */}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setIsUploading(false)}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 px-6 py-3 rounded-lg font-medium transition flex-1 justify-center"
          disabled={uploading}
        >
          <FaTimes /> Cancel
        </button>

        <button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition flex-1 justify-center"
        >
          {uploading ? <ClipLoader size={16} color="white" /> : <FaCheck />}
          {uploading
            ? `Uploading...`
            : `Upload (${selectedFiles.length} files)`}
        </button>
      </div>
    </div>
  );
};

export default FolderDocumentsUploader;
