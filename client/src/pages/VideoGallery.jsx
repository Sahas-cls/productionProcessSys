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
        `${import.meta.env.VITE_API_URL}/api/subOperationMedia/getVideos/${subOpId}`,
        { withCredentials: true },
      );
      setVideos(response.data?.data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // NOTE function to get video using video url
  const getVideoUrl = (item) => {
    if (item.media_url) {
      // Clean the URL path
      const cleanPath = item.media_url.replace(/^\//, "");
      const encodedPath = encodeURIComponent(cleanPath);
      console.log(
        `video path: ${import.meta.env.VITE_API_URL}/api/b2-files/${encodedPath}`,
      );
      // return `${import.meta.env.VITE_API_URL}/api/b2-files/${cleanPath}`;
      return `${import.meta.env.VITE_API_URL}/api/b2-files/${encodedPath}`;
    }
    return "";
  };

  const handlePlayVideo = useCallback(
    (id) => {
      // Pause the currently active video if different
      if (
        activeVideoId &&
        activeVideoId !== id &&
        videoRefs.current[activeVideoId]
      ) {
        videoRefs.current[activeVideoId].pause();
      }

      // Set new active video
      setActiveVideoId(id);
      setVideoErrors((prev) => ({ ...prev, [id]: null }));
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
  }, []);

  // CORRECT FULLSCREEN IMPLEMENTATION
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
    }
  }, []);

  const getFileName = useCallback((item) => {
    return (
      item.original_filename || item.media_url?.split("/").pop() || "video"
    );
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const handleDownloadVideo = useCallback(
    (item) => {
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
    },
    [getVideoUrl, getFileName],
  );

  return (
    <div className="px-4 md:px-6 min-h-screen bg-gray-50 py-6">
      {/* Header */}
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((item) => {
            const fileName = getFileName(item);
            const isActive = activeVideoId === item.so_media_id;
            const error = videoErrors[item.so_media_id];
            const videoUrl = getVideoUrl(item);
            // test comment
            return (
              <motion.div
                key={item.so_media_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-2 border-blue-100"
              >
                {/* Video Container */}
                <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 aspect-video">
                  {/* ALWAYS MOUNT THE VIDEO ELEMENT */}
                  <video
                    ref={(el) => {
                      videoRefs.current[item.so_media_id] = el;
                    }}
                    src={isActive ? videoUrl : ""} // Only set src when active
                    className={`w-full h-full object-contain ${isActive ? "block" : "hidden"}`}
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                    controls={false}
                    onError={(e) => {
                      console.error("Video error:", e);
                      setVideoErrors((prev) => ({
                        ...prev,
                        [item.so_media_id]: "Failed to load video",
                      }));
                    }}
                    onPlay={() => {
                      // Browser is playing, just update UI state if needed
                    }}
                    onPause={() => {
                      // Browser paused, just update UI state if needed
                    }}
                    onEnded={() => {
                      // Video ended naturally, no state changes needed
                    }}
                  />

                  {/* Overlay UI */}
                  {!isActive ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-blue-50/50 to-gray-100/50 hover:from-blue-100/50 hover:to-gray-200/50"
                      onClick={() => handlePlayVideo(item.so_media_id)}
                    >
                      <div className="bg-blue-600/20 hover:bg-blue-600/30 rounded-full p-4 transition-colors">
                        <FaPlay className="text-blue-600 text-3xl" />
                      </div>
                      <p className="text-blue-700 text-sm mt-3 font-medium">
                        Click to load & play
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
                        {formatFileSize(item.file_size)}
                      </p>
                    </div>
                  ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-red-50">
                      <FaExclamationTriangle className="text-red-500 text-3xl mb-2" />
                      <p className="text-red-700 text-sm font-medium text-center">
                        {error}
                      </p>
                      <button
                        onClick={() => handleDownloadVideo(item)}
                        className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-2"
                      >
                        <FaDownload size={12} />
                        Try Downloading
                      </button>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-transparent pointer-events-none">
                      {/* Control buttons - positioned but not covering video */}
                      <div className="absolute top-2 right-2 pointer-events-auto">
                        <button
                          onClick={() => toggleFullscreen(item.so_media_id)}
                          className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                          title="Fullscreen"
                        >
                          <FaExpand size={16} />
                        </button>
                      </div>

                      <div className="absolute top-2 left-2 pointer-events-auto">
                        <button
                          onClick={() => {
                            const video = videoRefs.current[item.so_media_id];
                            if (video) {
                              if (video.paused) {
                                video.play();
                              } else {
                                video.pause();
                              }
                            }
                          }}
                          className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                          title="Play/Pause"
                        >
                          <FaPause size={16} />
                        </button>
                      </div>
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
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          if (isActive) {
                            handleStopVideo(item.so_media_id);
                          } else {
                            handlePlayVideo(item.so_media_id);
                          }
                        }}
                        className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-2 ${
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
                        className="px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-2"
                      >
                        <FaDownload size={12} />
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
                              if (isActive) {
                                handleStopVideo(item.so_media_id);
                              }

                              const response = await axios.delete(
                                `${backendUrl}/api/subOperationMedia/deleteVideo/${item.so_media_id}`,
                                { withCredentials: true },
                              );

                              if (response.status === 200) {
                                Swal.fire({
                                  title: "Video Delete Successful...",
                                  icon: "success",
                                });
                                fetchVideos();
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
