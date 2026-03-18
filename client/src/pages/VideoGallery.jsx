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

  const handleDeleteVideo = useCallback(
    async (item, isActive, fileName) => {
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
    },
    [backendUrl, handleStopVideo, fetchVideos],
  );

  return (
    <div className="px-4 md:px-6 min-h-screen bg-gray-50 py-6 gird">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
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
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 h-full flex flex-col"
              >
                {/* Video Container */}
                {item.status !== "Success" && item.status !== "success" ? (
                  <div className="flex-1 flex flex-col">
                    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 h-40 sm:h-44 md:h-48 lg:h-52 group flex flex-col">
                      {/* Main content area - takes remaining space */}
                      <div className="flex-1 flex items-center justify-center relative">
                        <div className="absolute flex justify-center items-center animate-pulse [animation-duration:4s]">
                          <FaClockRotateLeft className="text-3xl sm:text-4xl md:text-5xl text-yellow-700/30" />
                        </div>
                      </div>

                      {/* Bottom div - fixed height with responsive padding */}
                      <div className="h-16 sm:h-20 p-1 sm:p-2 bg-white border-t-2 border-black/10 flex items-start justify-between">
                        <h3 className="text-[10px] sm:text-xs text-left font-semibold line-clamp-2 text-black/60 max-w-[70%] sm:max-w-[80%]">
                          Video being processed as a background job, please
                          check in a while
                        </h3>

                        {(userRole === "Admin" ||
                          userRole === "SuperAdmin") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVideo(item, isActive, fileName);
                            }}
                            className="p-1 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Delete video"
                          >
                            <FaTrash size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 h-40 sm:h-44 md:h-48 lg:h-52 group">
                      {/* Video Element - using object-cover to fill the container */}
                      <video
                        ref={(el) => (videoRefs.current[item.so_media_id] = el)}
                        src={videoUrl}
                        className={`w-full h-full object-contain transition-opacity duration-300 ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ aspectRatio: item.width / item.height }}
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
                          <div className="bg-blue-600/20 hover:bg-blue-600/30 rounded-full p-2 sm:p-3 md:p-4 transition-colors transform group-hover:scale-110">
                            <FaPlay className="text-blue-600 text-xl sm:text-2xl md:text-3xl" />
                          </div>
                          <p className="text-blue-700 text-xs sm:text-sm mt-1 sm:mt-2 md:mt-3 font-medium">
                            Click to play
                          </p>
                          <p className="text-gray-600 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                            {formatFileSize(item.file_size)}
                          </p>
                        </div>
                      )}

                      {/* Error Overlay */}
                      {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-4 bg-red-50">
                          <FaExclamationTriangle className="text-red-500 text-2xl sm:text-3xl mb-1 sm:mb-2" />
                          <p className="text-red-700 text-xs sm:text-sm font-medium text-center">
                            {error}
                          </p>
                          <div className="flex gap-1 sm:gap-2 mt-2 sm:mt-3">
                            <button
                              onClick={() => retryLoadVideo(item.so_media_id)}
                              className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded text-[10px] sm:text-sm hover:bg-blue-200 flex items-center gap-1 sm:gap-2"
                            >
                              <FaPlay size={10} className="sm:w-3 sm:h-3" />
                              Retry
                            </button>
                            <button
                              onClick={() => handleDownloadVideo(item)}
                              className="px-2 sm:px-3 py-0.5 sm:py-1 bg-red-100 text-red-700 rounded text-[10px] sm:text-sm hover:bg-red-200 flex items-center gap-1 sm:gap-2"
                            >
                              <FaDownload size={10} className="sm:w-3 sm:h-3" />
                              Download
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Video Controls (shown when active and no error) */}
                      {isActive && !error && (
                        <div className="absolute inset-0 bg-transparent">
                          {/* Top controls */}
                          <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex gap-1 sm:gap-2">
                            <button
                              onClick={() => togglePlayPause(item.so_media_id)}
                              className="p-1 sm:p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                              title={
                                videoRefs.current[item.so_media_id]?.paused
                                  ? "Play"
                                  : "Pause"
                              }
                            >
                              {videoRefs.current[item.so_media_id]?.paused ? (
                                <FaPlay
                                  size={10}
                                  className="sm:w-3.5 sm:h-3.5"
                                />
                              ) : (
                                <FaPause
                                  size={10}
                                  className="sm:w-3.5 sm:h-3.5"
                                />
                              )}
                            </button>
                            <button
                              onClick={() => toggleFullscreen(item.so_media_id)}
                              className="p-1 sm:p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                              title={
                                isInFullscreen
                                  ? "Exit Fullscreen"
                                  : "Fullscreen"
                              }
                            >
                              {isInFullscreen ? (
                                <FaCompress
                                  size={10}
                                  className="sm:w-3.5 sm:h-3.5"
                                />
                              ) : (
                                <FaExpand
                                  size={10}
                                  className="sm:w-3.5 sm:h-3.5"
                                />
                              )}
                            </button>
                          </div>

                          {/* Bottom controls */}
                          <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 right-1 sm:right-2">
                            <button
                              onClick={() => handleStopVideo(item.so_media_id)}
                              className="px-2 sm:px-3 py-0.5 sm:py-1 bg-red-600/80 text-white rounded text-[10px] sm:text-sm hover:bg-red-700 transition-colors backdrop-blur-sm"
                            >
                              Stop
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Video Info - flex column with auto margins */}
                    <div className="p-2 sm:p-3 md:p-4 flex-1 flex flex-col">
                      <h3
                        className="font-semibold text-gray-800 text-sm sm:text-base truncate mb-1 sm:mb-2"
                        title={fileName}
                      >
                        {item.sub_operation_name || fileName}
                      </h3>

                      <div className="text-[10px] sm:text-xs text-gray-600 space-y-0.5 sm:space-y-1 mb-2 sm:mb-4">
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

                      {/* Action Buttons - pushed to bottom */}
                      <div className="mt-auto">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            <button
                              onClick={() => {
                                if (isActive) {
                                  handleStopVideo(item.so_media_id);
                                } else {
                                  handlePlayVideo(item.so_media_id);
                                }
                              }}
                              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-2 transition-colors ${
                                isActive
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <FaPause
                                    size={10}
                                    className="sm:w-3 sm:h-3"
                                  />
                                  <span className="hidden xs:inline">Stop</span>
                                </>
                              ) : (
                                <>
                                  <FaPlay size={10} className="sm:w-3 sm:h-3" />
                                  <span className="hidden xs:inline">Play</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleDownloadVideo(item)}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1 sm:gap-2 transition-colors"
                              disabled={!videoUrl}
                            >
                              <FaDownload size={10} className="sm:w-3 sm:h-3" />
                              <span className="hidden xs:inline">Download</span>
                            </button>
                          </div>

                          {(userRole === "Admin" ||
                            userRole === "SuperAdmin") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVideo(item, isActive, fileName);
                              }}
                              className="p-1 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              title="Delete video"
                            >
                              <FaTrash size={14} className="sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
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
