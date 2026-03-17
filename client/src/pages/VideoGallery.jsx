import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaPlay,
  FaTrash,
  FaArrowLeft,
  FaExclamationTriangle,
  FaDownload,
  FaPause,
  FaExpand,
  FaCompress,
} from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import { FaClockRotateLeft } from "react-icons/fa6";

const VideoGallery = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.userRole;
  const backendUrl = import.meta.env.VITE_API_URL;

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [videoErrors, setVideoErrors] = useState({});
  const [fullscreenElement, setFullscreenElement] = useState(null);
  console.log("videos: ", videos);
  const videoRefs = useRef({});

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenElement(document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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
        `${import.meta.env.VITE_API_URL}/api/subOperationMedia/getVideos/${subOpId}`,
        { withCredentials: true },
      );
      setVideos(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load videos",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVideoUrl = useCallback((item) => {
    if (!item?.media_url) return null;

    // Extract just the filename from the full path
    const filename = item.media_url.split(/[\/\\]/).pop();

    if (!filename) return null;

    // Encode the filename properly (spaces become %20, etc.)
    const encodedFilename = encodeURIComponent(filename);

    // Construct clean URL
    const finalUrl = `${import.meta.env.VITE_API_URL}/videos/${encodedFilename}`;
    console.log("Final URL:", finalUrl);
    return finalUrl;
  }, []);

  const handlePlayVideo = useCallback(
    async (id) => {
      try {
        // Stop current video if playing
        if (
          activeVideoId &&
          activeVideoId !== id &&
          videoRefs.current[activeVideoId]
        ) {
          const currentVideo = videoRefs.current[activeVideoId];
          currentVideo.pause();
          currentVideo.currentTime = 0;
        }

        // Set new active video
        setActiveVideoId(id);
        setVideoErrors((prev) => ({ ...prev, [id]: null }));

        // Get the video element
        const video = videoRefs.current[id];
        if (!video) return;

        // Reset any error state
        setVideoErrors((prev) => ({ ...prev, [id]: null }));

        // Load and play
        video.load();

        // Attempt to play
        await video.play();
      } catch (err) {
        console.error("Play failed:", err);

        // Handle specific error types
        if (err.name === "NotSupportedError") {
          setVideoErrors((prev) => ({
            ...prev,
            [id]: "Video format not supported or file is corrupted",
          }));
        } else if (err.name === "NotAllowedError") {
          setVideoErrors((prev) => ({
            ...prev,
            [id]: "Autoplay not allowed. Please try clicking play again.",
          }));
        } else {
          setVideoErrors((prev) => ({
            ...prev,
            [id]: "Failed to play video. Please try downloading.",
          }));
        }
      }
    },
    [activeVideoId],
  );

  const handleStopVideo = useCallback((id) => {
    const video = videoRefs.current[id];
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setActiveVideoId(null);
    setVideoErrors((prev) => ({ ...prev, [id]: null }));
  }, []);

  const toggleFullscreen = useCallback(async (id) => {
    const video = videoRefs.current[id];
    if (!video) return;

    try {
      if (!document.fullscreenElement) {
        await video.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
      Swal.fire({
        title: "Fullscreen Error",
        text: "Could not toggle fullscreen mode",
        icon: "error",
        timer: 2000,
      });
    }
  }, []);

  const togglePlayPause = useCallback((id) => {
    const video = videoRefs.current[id];
    if (!video) return;

    if (video.paused) {
      video.play().catch((err) => {
        console.error("Play failed:", err);
        setVideoErrors((prev) => ({
          ...prev,
          [id]: "Failed to play video",
        }));
      });
    } else {
      video.pause();
    }
  }, []);

  const getFileName = useCallback((item) => {
    return (
      item.original_filename || item.media_url?.split(/[\/\\]/).pop() || "video"
    );
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (!bytes || isNaN(bytes)) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  }, []);

  const handleDownloadVideo = useCallback(
    (item) => {
      const videoUrl = getVideoUrl(item);
      const fileName = getFileName(item);

      if (videoUrl) {
        // Create a temporary anchor element
        const link = document.createElement("a");
        link.href = videoUrl;
        link.download = fileName;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } else {
        Swal.fire({
          title: "Error",
          text: "Cannot download video - URL not available",
          icon: "error",
        });
      }
    },
    [getVideoUrl, getFileName],
  );

  const retryLoadVideo = useCallback(
    (id) => {
      setVideoErrors((prev) => ({ ...prev, [id]: null }));
      handlePlayVideo(id);
    },
    [handlePlayVideo],
  );

  return (
    <div className="px-4 md:px-6 min-h-screen bg-gray-50 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 transition-colors"
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
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading video list...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">🎥</div>
          <h3 className="text-xl text-gray-600 mb-2">No videos available</h3>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((item) => {
            const fileName = getFileName(item);
            const isActive = activeVideoId === item.so_media_id;
            const error = videoErrors[item.so_media_id];
            const videoUrl = getVideoUrl(item);
            const isInFullscreen =
              fullscreenElement === videoRefs.current[item.so_media_id];

            return (
              <motion.div
                key={item.so_media_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-200"
              >
                {/* Video Container */}
                {item.status === "Pending" ? (
                  <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 aspect-video group flex flex-col">
                    {/* Main content area - takes remaining space */}
                    <div className="flex-1 flex items-center justify-center relative">
                      <div className="absolute flex justify-center items-center">
                        <FaClockRotateLeft className="text-5xl text-yellow-700/30" />
                      </div>
                    </div>

                    {/* Bottom div - takes 1/4 of parent height */}
                    <div className="h-1/4 p-4 bg-blue-300/20 border-t-2 border-black/10 flex items-center justify-center">
                      <h3 className="text-center">
                        Video being processing as a background job, please check
                        in while
                      </h3>
                    </div>
                  </div>
                ) : (
                  <div className="">
                    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 aspect-video group">
                      {/* Video Element */}
                      <video
                        ref={(el) => (videoRefs.current[item.so_media_id] = el)}
                        src={videoUrl}
                        className={`w-full h-full object-contain transition-opacity duration-300 ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                        controls={false}
                        onError={(e) => {
                          console.error("Video error for", fileName, ":", e);
                          setVideoErrors((prev) => ({
                            ...prev,
                            [item.so_media_id]: "Failed to load video file",
                          }));
                          if (isActive) {
                            setActiveVideoId(null);
                          }
                        }}
                        onPlay={() => console.log("Playing:", fileName)}
                        onPause={() => console.log("Paused:", fileName)}
                        onEnded={() => {
                          console.log("Ended:", fileName);
                          setActiveVideoId(null);
                        }}
                        onLoadedMetadata={(e) => {
                          console.log(
                            "Metadata loaded for:",
                            fileName,
                            "Duration:",
                            e.target.duration,
                          );
                        }}
                      />

                      {/* Play Overlay (shown when video is not active) */}
                      {!isActive && !error && (
                        <div
                          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-blue-50/80 to-gray-100/80 hover:from-blue-100/80 hover:to-gray-200/80 transition-all duration-300"
                          onClick={() => handlePlayVideo(item.so_media_id)}
                        >
                          <div className="bg-blue-600/20 hover:bg-blue-600/30 rounded-full p-4 transition-colors transform group-hover:scale-110">
                            <FaPlay className="text-blue-600 text-3xl" />
                          </div>
                          <p className="text-blue-700 text-sm mt-3 font-medium">
                            Click to play
                          </p>
                          <p className="text-gray-600 text-xs mt-1">
                            {formatFileSize(item.file_size)}
                          </p>
                        </div>
                      )}

                      {/* Error Overlay */}
                      {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-red-50">
                          <FaExclamationTriangle className="text-red-500 text-3xl mb-2" />
                          <p className="text-red-700 text-sm font-medium text-center">
                            {error}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => retryLoadVideo(item.so_media_id)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 flex items-center gap-2"
                            >
                              <FaPlay size={12} />
                              Retry
                            </button>
                            <button
                              onClick={() => handleDownloadVideo(item)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-2"
                            >
                              <FaDownload size={12} />
                              Download
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Video Controls (shown when active and no error) */}
                      {isActive && !error && (
                        <div className="absolute inset-0 bg-transparent">
                          {/* Top controls */}
                          <div className="absolute top-2 right-2 flex gap-2">
                            <button
                              onClick={() => togglePlayPause(item.so_media_id)}
                              className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                              title={
                                videoRefs.current[item.so_media_id]?.paused
                                  ? "Play"
                                  : "Pause"
                              }
                            >
                              {videoRefs.current[item.so_media_id]?.paused ? (
                                <FaPlay size={14} />
                              ) : (
                                <FaPause size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => toggleFullscreen(item.so_media_id)}
                              className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                              title={
                                isInFullscreen
                                  ? "Exit Fullscreen"
                                  : "Fullscreen"
                              }
                            >
                              {isInFullscreen ? (
                                <FaCompress size={14} />
                              ) : (
                                <FaExpand size={14} />
                              )}
                            </button>
                          </div>

                          {/* Bottom controls */}
                          <div className="absolute bottom-2 left-2 right-2">
                            <button
                              onClick={() => handleStopVideo(item.so_media_id)}
                              className="px-3 py-1 bg-red-600/80 text-white rounded text-sm hover:bg-red-700 transition-colors backdrop-blur-sm"
                            >
                              Stop
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Video Info */}
                    <div className="p-4">
                      <h3
                        className="font-semibold text-gray-800 truncate mb-2"
                        title={fileName}
                      >
                        {item.sub_operation_name || fileName}
                      </h3>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span className="font-medium">
                            {formatFileSize(item.file_size)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Uploaded:</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex justify-between items-center">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              if (isActive) {
                                handleStopVideo(item.so_media_id);
                              } else {
                                handlePlayVideo(item.so_media_id);
                              }
                            }}
                            className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors ${
                              isActive
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            {isActive ? (
                              <>
                                <FaPause size={12} />
                                Stop
                              </>
                            ) : (
                              <>
                                <FaPlay size={12} />
                                Play
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDownloadVideo(item)}
                            className="px-3 py-1.5 rounded text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-2 transition-colors"
                            disabled={!videoUrl}
                          >
                            <FaDownload size={12} />
                            Download
                          </button>
                        </div>

                        {(userRole === "Admin" ||
                          userRole === "SuperAdmin") && (
                          <button
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: "Delete video?",
                                text: `Are you sure you want to delete "${fileName}"?`,
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonColor: "#d33",
                                cancelButtonColor: "#3085d6",
                                confirmButtonText: "Yes, delete it!",
                                cancelButtonText: "Cancel",
                              });

                              if (result.isConfirmed) {
                                try {
                                  if (isActive) {
                                    handleStopVideo(item.so_media_id);
                                  }

                                  const response = await axios.delete(
                                    `${backendUrl}/api/subOperationMedia/deleteVideo/${item.so_media_id}`,
                                    { withCredentials: true },
                                  );

                                  if (response.status === 200) {
                                    await Swal.fire({
                                      title: "Deleted!",
                                      text: "Video has been deleted successfully.",
                                      icon: "success",
                                      timer: 2000,
                                      showConfirmButton: false,
                                    });
                                    fetchVideos();
                                  }
                                } catch (error) {
                                  console.error("Delete error:", error);
                                  Swal.fire({
                                    title: "Delete failed",
                                    text:
                                      error.response?.data?.message ||
                                      "Failed to delete video. Please try again.",
                                    icon: "error",
                                  });
                                }
                              }
                            }}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Delete video"
                          >
                            <FaTrash size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VideoGallery;
