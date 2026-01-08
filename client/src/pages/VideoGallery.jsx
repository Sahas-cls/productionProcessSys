import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaPlay,
  FaTrash,
  FaArrowLeft,
  FaExclamationTriangle,
  FaPause,
} from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

const VideoGallery = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.userRole;
  const backendUrl = import.meta.env.VITE_API_URL;

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [videoErrors, setVideoErrors] = useState({});
  const videoRefs = useRef({});

  useEffect(() => {
    if (location.state?.subOpId) {
      fetchVideos();
    }
  }, [location.state?.subOpId]);

  const fetchVideos = async () => {
    const subOpId = location.state.subOpId;
    setLoading(true);
    try {
      const response = await axios.get(
        `${
          import.meta.env.VITE_API_URL
        }/api/subOperationMedia/getVideos/${subOpId}`,
        { withCredentials: true }
      );
      setVideos(response.data?.data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get URL with proper CORS handling
  const getVideoUrl = (item) => {
    if (item.media_url) {
      return `${import.meta.env.VITE_API_URL}/api/b2-files/${item.media_url}`;
    }
    return "";
  };

  // Handle play - load video only when clicked
  const handlePlayVideo = async (id) => {
    const videoElement = videoRefs.current[id];
    const item = videos.find((v) => v.so_media_id === id);

    if (!item) return;

    // If already playing, pause it
    if (activeVideo === id && videoElement) {
      videoElement.pause();
      setActiveVideo(null);
      return;
    }

    // Stop any currently playing video
    if (activeVideo && videoRefs.current[activeVideo]) {
      videoRefs.current[activeVideo].pause();
      setActiveVideo(null);
    }

    // Set active video first for UI feedback
    setActiveVideo(id);
    setVideoErrors((prev) => ({ ...prev, [id]: null }));

    if (videoElement && item) {
      try {
        const videoUrl = getVideoUrl(item);

        // Clear any existing source
        videoElement.src = "";
        videoElement.load();

        // Set new source with proper CORS
        videoElement.crossOrigin = "anonymous";
        videoElement.preload = "metadata"; // Only load metadata first

        // For large videos, you might want to add quality monitoring
        videoElement.addEventListener("loadedmetadata", () => {
          console.log(
            `Video ready: ${videoElement.videoWidth}x${videoElement.videoHeight}`
          );
        });

        videoElement.addEventListener("canplay", () => {
          console.log(`Video can play: ${item.so_media_id}`);
        });

        // Handle video errors
        videoElement.onerror = (e) => {
          console.error("Video element error:", e);
          setVideoErrors((prev) => ({
            ...prev,
            [id]: "Failed to load video. Try downloading instead.",
          }));
          setActiveVideo(null);
        };

        // Set source and play
        videoElement.src = videoUrl;

        const playPromise = videoElement.play();

        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("Video play failed:", error);
            // Auto-play might fail due to browser policies
            // Just set to active and let user click play button
            if (error.name === "NotAllowedError") {
              // Browser blocked auto-play, just show controls
              videoElement.controls = true;
            } else {
              setVideoErrors((prev) => ({
                ...prev,
                [id]: "Failed to play video. Try downloading instead.",
              }));
              setActiveVideo(null);
            }
          });
        }
      } catch (error) {
        console.error("Video setup failed:", error);
        setVideoErrors((prev) => ({
          ...prev,
          [id]: "Failed to load video.",
        }));
        setActiveVideo(null);
      }
    }
  };

  const testVideoPlayback = async (item) => {
    const videoUrl = getVideoUrl(item);
    console.log("Testing video playback for:", item.so_media_id);
    console.log("Video URL:", videoUrl);
    console.log("File extension:", item.media_url?.split(".").pop());

    try {
      // Test if video is accessible
      const testResponse = await fetch(videoUrl, {
        method: "HEAD",
        mode: "cors",
        credentials: "include",
      });

      console.log("HEAD response:", {
        status: testResponse.status,
        statusText: testResponse.statusText,
        headers: Object.fromEntries(testResponse.headers.entries()),
        ok: testResponse.ok,
      });

      // Test a small range request
      const rangeResponse = await fetch(videoUrl, {
        headers: { Range: "bytes=0-1000" },
        credentials: "include",
      });

      console.log("Range response:", {
        status: rangeResponse.status,
        statusText: rangeResponse.statusText,
        headers: Object.fromEntries(rangeResponse.headers.entries()),
      });
    } catch (error) {
      console.error("Test failed:", error);
    }
  };

  // Handle video errors
  const handleVideoError = (id, error) => {
    console.error(`Video ${id} error:`, error);
    setVideoErrors((prev) => ({
      ...prev,
      [id]: "Video playback failed. The file may be corrupted or unsupported.",
    }));
    setActiveVideo(null);
  };

  const getFileName = (item) => {
    return (
      item.original_filename || item.media_url?.split("/").pop() || "video"
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Handle download video
  const handleDownloadVideo = (item) => {
    const videoUrl = getVideoUrl(item);
    const fileName = getFileName(item);

    if (videoUrl) {
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Swal.fire({
        title: "Error",
        text: "Cannot download video - URL not available",
        icon: "error",
      });
    }
  };

  return (
    <div className="px-4 md:px-6 min-h-screen bg-gray-50 py-6">
      {/* Header with warning */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <FaArrowLeft />
          <span>Go Back</span>
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Video Gallery</h1>
            <p className="text-gray-600">
              {videos.length} video{videos.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-3 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
            {/* <FaExclamationTriangle />
            <span className="text-sm font-medium">
              Bandwidth Critical: Videos load on click only
            </span> */}
          </div>
        </div>
      </div>

      {/* Videos Grid - LAZY LOAD */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading video list...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">🎥</div>
          <h3 className="text-xl text-gray-600 mb-2">No videos available</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((item) => {
            const fileName = getFileName(item);
            const isActive = activeVideo === item.so_media_id;
            const error = videoErrors[item.so_media_id];

            return (
              <motion.div
                key={item.so_media_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-2 border-blue-100"
              >
                {/* Video Container */}
                <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 aspect-video">
                  {isActive ? (
                    <div className="relative w-full h-full">
                      {/* // Update the video element in your JSX: */}
                      <video
                        ref={(el) => {
                          if (el) {
                            videoRefs.current[item.so_media_id] = el;
                          } else {
                            delete videoRefs.current[item.so_media_id];
                          }
                        }}
                        className="w-full h-full object-contain"
                        controls
                        controlsList="nodownload"
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                        onLoadStart={() => {
                          console.log(`Video ${item.so_media_id} load started`);
                          // Show loading indicator
                        }}
                        onLoadedData={() => {
                          console.log(`Video ${item.so_media_id} loaded data`);
                          // Hide loading indicator
                        }}
                        onCanPlay={() => {
                          console.log(`Video ${item.so_media_id} can play`);
                          // Auto-play if possible
                          if (activeVideo === item.so_media_id) {
                            videoRefs.current[item.so_media_id]
                              ?.play()
                              .catch((e) => {
                                console.log(
                                  "Auto-play blocked, showing controls"
                                );
                                videoRefs.current[
                                  item.so_media_id
                                ].controls = true;
                              });
                          }
                        }}
                        onEnded={() => setActiveVideo(null)}
                        onError={(e) => {
                          console.error("Video error event:", e);
                          console.error("Video error details:", {
                            errorCode:
                              videoRefs.current[item.so_media_id]?.error?.code,
                            errorMessage:
                              videoRefs.current[item.so_media_id]?.error
                                ?.message,
                            networkState:
                              videoRefs.current[item.so_media_id]?.networkState,
                            readyState:
                              videoRefs.current[item.so_media_id]?.readyState,
                          });
                          handleVideoError(item.so_media_id, e);
                        }}
                      >
                        <source
                          src={
                            activeVideo === item.so_media_id
                              ? getVideoUrl(item)
                              : ""
                          }
                          type={
                            item.media_url?.endsWith(".webm")
                              ? "video/webm"
                              : "video/mp4"
                          }
                        />
                        Your browser does not support the video tag.
                      </video>
                      {/* Loading overlay */}
                      {/* <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                          <p className="text-sm">Loading video...</p>
                        </div>
                      </div> */}
                    </div>
                  ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-red-50">
                      <FaExclamationTriangle className="text-red-500 text-3xl mb-2" />
                      <p className="text-red-700 text-sm font-medium text-center">
                        {error}
                      </p>
                      <button
                        onClick={() => handleDownloadVideo(item)}
                        className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      >
                        Try Downloading
                      </button>
                    </div>
                  ) : (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-blue-50/50 to-gray-100/50 hover:from-blue-100/50 hover:to-gray-200/50"
                      onClick={() => handlePlayVideo(item.so_media_id)}
                    >
                      <div className="bg-blue-600/20 hover:bg-blue-600/30 rounded-full p-4 transition-colors">
                        {isActive ? (
                          <FaPause className="text-blue-600 text-3xl" />
                        ) : (
                          <FaPlay className="text-blue-600 text-3xl" />
                        )}
                      </div>
                      <p className="text-blue-700 text-sm mt-3 font-medium">
                        Click to load & play
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
                        {formatFileSize(item.file_size)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 truncate mb-2">
                    {item.sub_operation_name || fileName}
                  </h3>

                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span>File:</span>
                      <span
                        className="font-mono text-xs truncate max-w-[120px]"
                        title={fileName}
                      >
                        {fileName}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{formatFileSize(item.file_size)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Uploaded:</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePlayVideo(item.so_media_id)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          isActive
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        }`}
                      >
                        {isActive ? "Stop" : "Play"}
                      </button>

                      <button
                        onClick={() => handleDownloadVideo(item)}
                        className="px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        Download
                      </button>
                    </div>

                    {(userRole === "Admin" || userRole === "SuperAdmin") && (
                      <button
                        onClick={async () => {
                          const result = await Swal.fire({
                            title: "Delete video?",
                            text: `Delete "${fileName}"?`,
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonText: "Delete",
                            cancelButtonText: "Cancel",
                          });

                          if (result.isConfirmed) {
                            try {
                              const response = await axios.delete(
                                `${backendUrl}/api/subOperationMedia/deleteVideo/${item.so_media_id}`,
                                { withCredentials: true }
                              );

                              if (response.status === 200) {
                                Swal.fire({
                                  title: "Video Delete Successful...",
                                  icon: "success",
                                });
                                fetchVideos(); // Only fetch if successful
                              }
                            } catch (error) {
                              console.error("Delete error:", error);
                              Swal.fire({
                                title: "Video delete failed",
                                text:
                                  error.response?.data?.message ||
                                  "Please try again",
                                icon: "error",
                              });
                            }
                          }
                        }}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Delete video"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VideoGallery;
