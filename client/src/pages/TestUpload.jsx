import React, { useState } from "react";
import axios from "axios";

const TestUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadResponse, setUploadResponse] = useState(null);
  const [error, setError] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001"; // Adjust as needed

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if it's a video file
      if (file.type.startsWith("video/")) {
        setSelectedFile(file);
        setError(null);
        setUploadStatus("");
      } else {
        setError("Please select a valid video file");
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      setUploadStatus("uploading");
      setUploadProgress(0);
      setError(null);
      setUploadResponse(null);

      const response = await axios.post(
        `${apiUrl}/api/test/test-video-upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(percentCompleted);
          },
        },
      );

      setUploadStatus("success");
      setUploadResponse(response.data);
      console.log("Upload successful:", response.data);
    } catch (err) {
      setUploadStatus("error");
      setError(err.response?.data?.message || err.message || "Upload failed");
      console.error("Upload error:", err);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus("");
    setUploadResponse(null);
    setError(null);
    // Reset file input
    document.getElementById("file-input").value = "";
  };

  return (
    <div style={styles.container}>
      <h2>Video Upload Test</h2>

      <div style={styles.uploadArea}>
        <input
          id="file-input"
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={styles.fileInput}
        />

        {selectedFile && (
          <div style={styles.fileInfo}>
            <p>
              <strong>Selected file:</strong> {selectedFile.name}
            </p>
            <p>
              <strong>Size:</strong>{" "}
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <p>
              <strong>Type:</strong> {selectedFile.type}
            </p>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        {uploadStatus === "uploading" && (
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
            <p style={styles.progressText}>{uploadProgress}% uploaded</p>
          </div>
        )}

        {uploadStatus === "success" && (
          <div style={styles.success}>
            <p>✅ Upload successful!</p>
            {uploadResponse && (
              <pre style={styles.responsePre}>
                {JSON.stringify(uploadResponse, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploadStatus === "uploading"}
            style={{
              ...styles.button,
              ...styles.uploadButton,
              opacity: !selectedFile || uploadStatus === "uploading" ? 0.5 : 1,
            }}
          >
            {uploadStatus === "uploading" ? "Uploading..." : "Upload Video"}
          </button>

          {selectedFile && (
            <button
              onClick={handleCancel}
              style={{
                ...styles.button,
                ...styles.cancelButton,
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Basic styles (you can replace with CSS modules or styled-components)
const styles = {
  container: {
    maxWidth: "600px",
    margin: "2rem auto",
    padding: "2rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontFamily: "Arial, sans-serif",
  },
  uploadArea: {
    marginTop: "1rem",
  },
  fileInput: {
    marginBottom: "1rem",
    padding: "0.5rem",
  },
  fileInfo: {
    backgroundColor: "#f5f5f5",
    padding: "1rem",
    borderRadius: "4px",
    marginBottom: "1rem",
  },
  buttonGroup: {
    display: "flex",
    gap: "1rem",
    marginTop: "1rem",
  },
  button: {
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "bold",
  },
  uploadButton: {
    backgroundColor: "#007bff",
    color: "white",
    flex: 2,
  },
  cancelButton: {
    backgroundColor: "#6c757d",
    color: "white",
    flex: 1,
  },
  progressContainer: {
    marginTop: "1rem",
  },
  progressBar: {
    width: "100%",
    height: "20px",
    backgroundColor: "#f0f0f0",
    borderRadius: "10px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#28a745",
    transition: "width 0.3s ease",
  },
  progressText: {
    textAlign: "center",
    marginTop: "0.5rem",
    color: "#666",
  },
  error: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "0.75rem",
    borderRadius: "4px",
    marginBottom: "1rem",
  },
  success: {
    backgroundColor: "#d4edda",
    color: "#155724",
    padding: "0.75rem",
    borderRadius: "4px",
    marginBottom: "1rem",
  },
  responsePre: {
    backgroundColor: "#fff",
    padding: "0.5rem",
    borderRadius: "4px",
    overflow: "auto",
    fontSize: "0.875rem",
  },
};

export default TestUpload;
