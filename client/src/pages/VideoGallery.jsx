// Frontend: SimpleVideoPlayer.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaPlay,
  FaTrash,
  FaArrowLeft,
  FaExclamationTriangle,
  FaPause,
  FaExpand,
  FaCompress,
  FaVolumeUp,
  FaVolumeMute,
  FaRedo,
  FaDownload,
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
  const [playerStates, setPlayerStates] = useState({});
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

  // Get URL - Fixed CORS URL
  const getVideoUrl = (item) => {
    if (item.media_url) {
      // Clean the URL path
      const cleanPath = item.media_url.replace(/^\//, "");
      return `${import.meta.env.VITE_API_URL}/api/b2-files/${cleanPath}`;
    }
    return "";
  };

  // Simple video player with controls
  const handlePlayVideo = (id) => {
    const item = videos.find((v) => v.so_media_id === id);
    if (!item) return;

    // If already active, toggle play/pause
    if (activeVideo === id && videoRefs.current[id]) {
      const video = videoRefs.current[id];
      if (video.paused) {
        video.play();
        setPlayerStates((prev) => ({
          ...prev,
          [id]: { ...prev[id], playing: true },
        }));
      } else {
        video.pause();
        setPlayerStates((prev) => ({
          ...prev,
          [id]: { ...prev[id], playing: false },
        }));
      }
      return;
    }

    // Stop any currently playing video
    if (activeVideo && videoRefs.current[activeVideo]) {
      videoRefs.current[activeVideo].pause();
      setPlayerStates((prev) => ({
        ...prev,
        [activeVideo]: { ...prev[activeVideo], playing: false },
      }));
    }

    // Set new active video
    setActiveVideo(id);
    setVideoErrors((prev) => ({ ...prev, [id]: null }));

    // Initialize state
    setPlayerStates((prev) => ({
      ...prev,
      [id]: {
        playing: true,
        volume: 0.8,
        muted: false,
        fullscreen: false,
        duration: 0,
        currentTime: 0,
        rotation: 0,
      },
    }));
  };

  // Simple video controls
  const togglePlayPause = (id) => {
    const video = videoRefs.current[id];
    if (!video) return;

    if (video.paused) {
      video.play();
      setPlayerStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], playing: true },
      }));
    } else {
      video.pause();
      setPlayerStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], playing: false },
      }));
    }
  };

  const toggleMute = (id) => {
    const video = videoRefs.current[id];
    if (video) {
      video.muted = !video.muted;
      setPlayerStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], muted: video.muted },
      }));
    }
  };

  const toggleFullscreen = (id) => {
    const container = document.getElementById(`video-container-${id}`);
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.log("Fullscreen error:", err);
      });
      setPlayerStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], fullscreen: true },
      }));
    } else {
      document.exitFullscreen();
      setPlayerStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], fullscreen: false },
      }));
    }
  };

  const handleRotate = (id) => {
    const currentRotation = playerStates[id]?.rotation || 0;
    const newRotation = (currentRotation + 90) % 360;

    setPlayerStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], rotation: newRotation },
    }));

    const video = videoRefs.current[id];
    if (video) {
      video.style.transform = `rotate(${newRotation}deg)`;
      video.style.transformOrigin = "center center";
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

  // Custom Controls Component
  const CustomControls = ({ item }) => {
    const id = item.so_media_id;
    const state = playerStates[id] || {};
    const video = videoRefs.current[id];

    if (!state.playing || !video) return null;

    return (
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-3 transition-all duration-300">
        {/* Progress bar */}
        <div className="mb-2">
          <input
            type="range"
            min={0}
            max={video.duration || 0}
            step="any"
            value={video.currentTime || 0}
            onChange={(e) => {
              video.currentTime = parseFloat(e.target.value);
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:scale-110"
          />
          <div className="flex justify-between text-xs text-white/90 mt-1 px-1">
            <span>{formatTime(video.currentTime)}</span>
            <span>{formatTime(video.duration)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => togglePlayPause(id)}
              className="text-white hover:text-blue-300 transition-colors p-1"
              title={state.playing ? "Pause" : "Play"}
            >
              {state.playing ? <FaPause size={20} /> : <FaPlay size={20} />}
            </button>

            <button
              onClick={() => toggleMute(id)}
              className="text-white hover:text-blue-300 transition-colors p-1"
              title={state.muted ? "Unmute" : "Mute"}
            >
              {state.muted ? (
                <FaVolumeMute size={20} />
              ) : (
                <FaVolumeUp size={20} />
              )}
            </button>

            <button
              onClick={() => handleRotate(id)}
              className="text-white hover:text-purple-300 transition-colors p-1 flex items-center gap-2"
              title={`Rotate (${state.rotation || 0}°)`}
            >
              <FaRedo size={18} />
              <span className="text-xs">Rotate</span>
            </button>
          </div>

          <button
            onClick={() => toggleFullscreen(id)}
            className="text-white hover:text-blue-300 transition-colors p-1"
            title="Fullscreen"
          >
            {state.fullscreen ? (
              <FaCompress size={20} />
            ) : (
              <FaExpand size={20} />
            )}
          </button>
        </div>
      </div>
    );
  };

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
            const playerState = playerStates[item.so_media_id] || {};
            const rotation = playerState.rotation || 0;
            const videoUrl = getVideoUrl(item);

            return (
              <motion.div
                key={item.so_media_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-2 border-blue-100"
              >
                {/* Video Container */}
                <div
                  id={`video-container-${item.so_media_id}`}
                  className="relative bg-gradient-to-br from-gray-100 to-gray-200 aspect-video"
                >
                  {isActive ? (
                    <div className="relative w-full h-full bg-black">
                      <video
                        ref={(el) => {
                          if (el) {
                            videoRefs.current[item.so_media_id] = el;
                            // Set up event listeners
                            el.onloadedmetadata = () => {
                              setPlayerStates((prev) => ({
                                ...prev,
                                [item.so_media_id]: {
                                  ...prev[item.so_media_id],
                                  duration: el.duration,
                                },
                              }));
                            };
                            el.ontimeupdate = () => {
                              setPlayerStates((prev) => ({
                                ...prev,
                                [item.so_media_id]: {
                                  ...prev[item.so_media_id],
                                  currentTime: el.currentTime,
                                },
                              }));
                            };
                            el.onplay = () => {
                              setPlayerStates((prev) => ({
                                ...prev,
                                [item.so_media_id]: {
                                  ...prev[item.so_media_id],
                                  playing: true,
                                },
                              }));
                            };
                            el.onpause = () => {
                              setPlayerStates((prev) => ({
                                ...prev,
                                [item.so_media_id]: {
                                  ...prev[item.so_media_id],
                                  playing: false,
                                },
                              }));
                            };
                            el.onerror = (e) => {
                              console.error("Video error:", e);
                              setVideoErrors((prev) => ({
                                ...prev,
                                [item.so_media_id]: "Failed to play video",
                              }));
                              setActiveVideo(null);
                            };
                          } else {
                            delete videoRefs.current[item.so_media_id];
                          }
                        }}
                        src={videoUrl}
                        className="w-full h-full object-contain"
                        style={{
                          transform: `rotate(${rotation}deg)`,
                          transformOrigin: "center center",
                          transition: "transform 0.3s ease",
                        }}
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                        controls={false}
                        autoPlay
                        onCanPlay={() => {
                          const video = videoRefs.current[item.so_media_id];
                          if (video) {
                            video.volume = 0.8;
                          }
                        }}
                      />

                      {/* Custom Controls */}
                      <CustomControls item={item} />
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
                            const video = videoRefs.current[item.so_media_id];
                            if (video) {
                              video.pause();
                              video.currentTime = 0;
                            }
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

                      {isActive && (
                        <button
                          onClick={() => handleRotate(item.so_media_id)}
                          className="px-3 py-1 rounded text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center gap-2"
                          title="Rotate Video 90°"
                        >
                          <FaRedo size={12} />
                          Rotate
                        </button>
                      )}
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
