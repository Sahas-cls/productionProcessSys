// Frontend: VideoGallery.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaPlay,
  FaTrash,
  FaArrowLeft,
  FaExclamationTriangle,
  FaDownload,
} from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

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
  const plyrInstances = useRef({});

  useEffect(() => {
    if (location.state?.subOpId) {
      fetchVideos();
    }

    // Cleanup Plyr instances on unmount
    return () => {
      Object.values(plyrInstances.current).forEach(instance => {
        if (instance && typeof instance.destroy === 'function') {
          instance.destroy();
        }
      });
    };
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

  const getVideoUrl = useCallback((item) => {
    if (item.media_url) {
      const cleanPath = item.media_url.replace(/^\//, "");
      return `${import.meta.env.VITE_API_URL}/api/b2-files/${cleanPath}`;
    }
    return "";
  }, []);

  const handlePlayVideo = useCallback((id) => {
    // Stop any currently playing video
    if (activeVideo && plyrInstances.current[activeVideo]) {
      plyrInstances.current[activeVideo].pause();
    }

    // Set new active video
    setActiveVideo(id);
    setVideoErrors((prev) => ({ ...prev, [id]: null }));
  }, [activeVideo]);

  // Initialize Plyr for active video
  useEffect(() => {
    const initializePlyrForActiveVideo = async () => {
      if (!activeVideo) return;

      const videoElement = videoRefs.current[activeVideo];
      if (!videoElement) return;

      // Clean up existing Plyr instance for this video
      if (plyrInstances.current[activeVideo]) {
        plyrInstances.current[activeVideo].destroy();
        delete plyrInstances.current[activeVideo];
      }

      try {
        const player = new Plyr(videoElement, {
          controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'mute',
            'volume',
            'settings',
            'pip',
            'fullscreen'
          ],
          settings: ['quality', 'speed'],
          invertTime: false,
          toggleInvert: false,
          fullscreen: {
            enabled: true,
            fallback: true,
            iosNative: true
          },
          storage: {
            enabled: false
          },
          keyboard: {
            focused: true,
            global: false
          },
          tooltips: {
            controls: true
          },
          ratio: '16:9'
        });

        // Store instance
        plyrInstances.current[activeVideo] = player;

        // Auto-play
        player.play().catch(e => {
          console.log("Auto-play prevented:", e);
        });

        // Handle errors
        player.on('error', (event) => {
          console.error('Plyr error:', event.detail);
          setVideoErrors((prev) => ({
            ...prev,
            [activeVideo]: "Failed to play video"
          }));
          setActiveVideo(null);
        });

      } catch (error) {
        console.error('Error initializing Plyr:', error);
        setVideoErrors((prev) => ({
          ...prev,
          [activeVideo]: "Failed to initialize player"
        }));
        setActiveVideo(null);
      }
    };

    initializePlyrForActiveVideo();

    // Cleanup function
    return () => {
      if (activeVideo && plyrInstances.current[activeVideo]) {
        plyrInstances.current[activeVideo].destroy();
        delete plyrInstances.current[activeVideo];
      }
    };
  }, [activeVideo]);

  const getFileName = useCallback((item) => {
    return item.original_filename || item.media_url?.split("/").pop() || "video";
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

  const handleDownloadVideo = useCallback((item) => {
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
  }, [getVideoUrl, getFileName]);

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
            const isActive = activeVideo === item.so_media_id;
            const error = videoErrors[item.so_media_id];
            const videoUrl = getVideoUrl(item);

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
                    <div className="relative w-full h-full bg-black">
                      <video
                        ref={(el) => {
                          // Simple ref assignment - NO state updates here
                          if (el) {
                            videoRefs.current[item.so_media_id] = el;
                            // Minimal styling
                            el.style.objectFit = 'contain';
                          } else {
                            delete videoRefs.current[item.so_media_id];
                          }
                        }}
                        src={videoUrl}
                        className="w-full h-full"
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                        controls={false} // Plyr will handle controls
                      />
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
                            setActiveVideo(null);
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
                            <FaPlay size={12} />
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
                              // Clean up Plyr instance if active
                              if (isActive) {
                                if (plyrInstances.current[item.so_media_id]) {
                                  plyrInstances.current[item.so_media_id].destroy();
                                  delete plyrInstances.current[item.so_media_id];
                                }
                                setActiveVideo(null);
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
                                text: error.response?.data?.message || "Please try again",
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