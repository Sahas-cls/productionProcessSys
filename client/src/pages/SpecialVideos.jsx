import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlay,
  FaTrash,
  FaArrowLeft,
  FaExclamationTriangle,
  FaDownload,
  FaPause,
  FaExpand,
  FaFile,
  FaCalendarAlt,
  FaDatabase,
} from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import { IoSearch } from "react-icons/io5";

const SpecialVideos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.userRole;
  const backendUrl = import.meta.env.VITE_API_URL;

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [videoErrors, setVideoErrors] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  const videoRefs = useRef({});
  const abortControllers = useRef({});

  useEffect(() => {
    fetchVideos();

    // Cleanup function to revoke object URLs
    return () => {
      Object.keys(videoRefs.current).forEach((id) => {
        const video = videoRefs.current[id];
        if (video && video.src) {
          video.pause();
          if (video.src.startsWith("blob:")) {
            URL.revokeObjectURL(video.src);
          }
        }
      });
    };
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${backendUrl}/api/specialOp/get-special-videos`,
        { withCredentials: true },
      );

      setVideos(response.data?.data?.videos || []);
    } catch (error) {
      console.error("Error fetching special videos:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load videos",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  /*!SECTION
    const getVideoUrl = (item) => {
    if (item?.video_url) {
      const cleanPath = item.video_url.replace(/^\//, "");
      const timestamp = new Date().getTime();
      return `${import.meta.env.VITE_API_URL}/api/b2-files/${cleanPath}?t=${timestamp}`;
    }
    return null;
  };

  */

  const getVideoUrl = (video) => {
    if (video?.media_url) {
      // const b2BaseUrl = import.meta.env.VITE_B2_BASE_URL;
      // if (!b2BaseUrl) {
      //   console.error("VITE_B2_BASE_URL is not configured");
      //   return null;
      // }
      const cleanPath = video.media_url.replace(/^\//, "");
      const timestamp = new Date().getTime();
      return `${import.meta.env.VITE_API_URL}/api/b2-files/${cleanPath}?t=${timestamp}`;
    }
    return null;
  };

  const handlePlayVideo = useCallback(
    async (id) => {
      if (!id) return;

      // Cancel any pending play request for this video
      if (abortControllers.current[id]) {
        abortControllers.current[id].abort();
      }

      // Pause the currently active video if different
      if (
        activeVideoId &&
        activeVideoId !== id &&
        videoRefs.current[activeVideoId]
      ) {
        const currentVideo = videoRefs.current[activeVideoId];
        if (currentVideo) {
          currentVideo.pause();
          // Clear src to free memory
          if (currentVideo.src) {
            currentVideo.removeAttribute("src");
            currentVideo.load();
          }
        }
      }

      setLoadingStates((prev) => ({ ...prev, [id]: true }));
      setActiveVideoId(id);
      setVideoErrors((prev) => ({ ...prev, [id]: null }));

      // Wait for DOM update
      setTimeout(async () => {
        const video = videoRefs.current[id];
        if (!video) {
          setLoadingStates((prev) => ({ ...prev, [id]: false }));
          setVideoErrors((prev) => ({
            ...prev,
            [id]: "Video element not found",
          }));
          return;
        }

        try {
          // Set up abort controller for this play request
          const controller = new AbortController();
          abortControllers.current[id] = controller;

          // Load and play the video
          video.load();

          // Wait for canplay through event
          const canPlayPromise = new Promise((resolve) => {
            const onCanPlay = () => {
              video.removeEventListener("canplay", onCanPlay);
              resolve();
            };
            video.addEventListener("canplay", onCanPlay);

            // Timeout after 5 seconds
            setTimeout(() => {
              video.removeEventListener("canplay", onCanPlay);
              resolve();
            }, 5000);
          });

          await canPlayPromise;

          // Check if the play request was aborted
          if (controller.signal.aborted) {
            return;
          }

          await video.play();

          setLoadingStates((prev) => ({ ...prev, [id]: false }));
        } catch (error) {
          console.error("Play error for video", id, error);

          // Don't show error for aborted requests
          if (error.name === "AbortError") {
            return;
          }

          let errorMessage = "Failed to play video. ";
          if (error.name === "NotAllowedError") {
            errorMessage += "Autoplay was blocked. Please click play again.";
          } else if (error.name === "NotSupportedError") {
            errorMessage += "Video format not supported.";
          } else {
            errorMessage += "Please try downloading the video instead.";
          }

          setVideoErrors((prev) => ({
            ...prev,
            [id]: errorMessage,
          }));
          setLoadingStates((prev) => ({ ...prev, [id]: false }));
          setActiveVideoId(null);
        }
      }, 100);
    },
    [activeVideoId],
  );

  const handleStopVideo = useCallback((id) => {
    if (!id) return;

    // Abort any pending play request
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
    }

    const video = videoRefs.current[id];
    if (video) {
      video.pause();
      video.currentTime = 0;
      // Clear src to stop network activity
      video.removeAttribute("src");
      video.load();
    }
    setActiveVideoId(null);
    setLoadingStates((prev) => ({ ...prev, [id]: false }));
  }, []);

  const toggleFullscreen = useCallback(async (id) => {
    if (!id) return;

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

  const getFileName = useCallback((video) => {
    if (!video) return "video";
    return video.original_filename || video.video_name || "video";
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatDuration = useCallback((seconds) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleDownloadVideo = useCallback(
    async (video) => {
      if (!video) return;

      const videoUrl = getVideoUrl(video);
      const fileName = getFileName(video);

      if (!videoUrl) {
        Swal.fire({
          title: "Error",
          text: "Video URL not available",
          icon: "error",
        });
        return;
      }

      try {
        // Show loading indicator
        Swal.fire({
          title: "Downloading...",
          text: "Preparing your video for download",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        // Fetch the video as blob
        const response = await fetch(videoUrl);
        const blob = await response.blob();

        // Create download link
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        URL.revokeObjectURL(blobUrl);

        Swal.close();
        Swal.fire({
          title: "Download Started",
          text: "Your video is being downloaded",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Download error:", error);
        Swal.fire({
          title: "Download Failed",
          text: "Please try again later",
          icon: "error",
        });
      }
    },
    [getVideoUrl, getFileName],
  );

  const handleDeleteVideo = async (video) => {
    if (!video?.video_id) return;

    const fileName = getFileName(video);
    const isActive = activeVideoId === video.video_id;

    const result = await Swal.fire({
      title: "Delete video?",
      text: `Delete "${fileName}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
    });

    if (result.isConfirmed) {
      try {
        if (isActive) {
          handleStopVideo(video.video_id);
        }

        const response = await axios.delete(
          `${backendUrl}/api/specialOp/delete-video/${video.video_id}`,
          { withCredentials: true },
        );

        if (response.status === 200) {
          Swal.fire({
            title: "Deleted!",
            text: "Video has been deleted.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          fetchVideos();
        }
      } catch (error) {
        console.error("Delete error:", error);
        Swal.fire({
          title: "Delete Failed",
          text: error.response?.data?.message || "Please try again",
          icon: "error",
        });
      }
    }
  };

  const handleVideoError = useCallback((id, error) => {
    if (!id) return;

    console.error("Video error for ID:", id, error);

    const video = videoRefs.current[id];
    let errorMessage = "Failed to load video";

    if (video?.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = "Video loading was aborted";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = "Network error - Please check your connection";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = "Video format not supported by your browser";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Video format not supported";
          break;
        default:
          errorMessage = video.error.message || "Failed to load video";
      }
    }

    setVideoErrors((prev) => ({
      ...prev,
      [id]: errorMessage,
    }));
    setLoadingStates((prev) => ({ ...prev, [id]: false }));
    setActiveVideoId(null);
  }, []);

  const renderVideoElement = (video, isActive, videoUrl) => {
    if (!isActive || !videoUrl || !video?.video_id) return null;

    return (
      <video
        ref={(el) => {
          if (el && video?.video_id) {
            videoRefs.current[video.video_id] = el;
          }
        }}
        key={`video-${video.video_id}`}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        controls
        onError={(e) => handleVideoError(video?.video_id, e)}
        onLoadedData={() => {
          if (video?.video_id) {
            setLoadingStates((prev) => ({
              ...prev,
              [video.video_id]: false,
            }));
          }
        }}
        onPlaying={() => {
          if (video?.video_id) {
            setVideoErrors((prev) => ({
              ...prev,
              [video.video_id]: null,
            }));
          }
        }}
      >
        <source src={videoUrl} type={video.mime_type || "video/mp4"} />
        Your browser does not support the video tag.
      </video>
    );
  };

  const getQualityBadgeColor = (quality) => {
    switch (quality) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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

        <div className="flex justify-between">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Special Videos Library
              </h1>
              <p className="text-gray-600">
                {videos.length} video{videos.length !== 1 ? "s" : ""} in your
                library
              </p>
            </div>
            {videos.length > 0 && (
              <button
                onClick={fetchVideos}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            )}
          </div>

          {/* SEARCH BAR SECTION */}
          <div className="w-[500px]">
            <div className="flex">
              <div className="col-span-9 flex-grow">
                <input
                  type="text"
                  className="px-2 py-2 rounded-md border w-full"
                  placeholder="Search..."
                />
              </div>

              <button className="bg-gradient-to-l from-blue-500 to-blue-600 text-white">
                <IoSearch className="" />
              </button>
            </div>
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
          <p className="text-gray-500">
            You haven't uploaded any special videos yet.
          </p>
          <button
            onClick={() => navigate("/special-video-upload")}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload Your First Video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => {
            const videoId = video?.video_id;

            if (!videoId) {
              console.warn("Video item missing video_id:", video);
              return null;
            }

            const fileName = getFileName(video);
            const isActive = activeVideoId === videoId;
            const isLoading = loadingStates[videoId];
            const error = videoErrors[videoId];
            const videoUrl = getVideoUrl(video);

            return (
              <motion.div
                key={videoId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200"
              >
                {/* Video Container */}
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 aspect-video">
                  {renderVideoElement(video, isActive, videoUrl)}

                  {isActive && isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                    </div>
                  )}

                  {!isActive && !error && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-blue-900/80 to-purple-900/80 hover:from-blue-900/90 hover:to-purple-900/90 transition-all"
                      onClick={() => handlePlayVideo(videoId)}
                    >
                      <div className="bg-white/20 hover:bg-white/30 rounded-full p-4 transition-all transform hover:scale-110">
                        <FaPlay className="text-white text-3xl" />
                      </div>
                      <p className="text-white text-sm mt-3 font-medium">
                        Click to play video
                      </p>
                      <div className="flex gap-3 mt-2 text-white/80 text-xs">
                        <span>{formatDuration(video.video_duration)}</span>
                        <span>•</span>
                        <span>{formatFileSize(video.file_size)}</span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-red-50">
                      <FaExclamationTriangle className="text-red-500 text-3xl mb-2" />
                      <p className="text-red-700 text-sm font-medium text-center">
                        {error}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handlePlayVideo(videoId)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-2"
                        >
                          <FaPlay size={12} />
                          Retry
                        </button>
                        <button
                          onClick={() => handleDownloadVideo(video)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 flex items-center gap-2"
                        >
                          <FaDownload size={12} />
                          Download
                        </button>
                      </div>
                    </div>
                  )}

                  {isActive && !error && !isLoading && (
                    <div className="absolute inset-0 bg-transparent pointer-events-none">
                      <div className="absolute top-2 right-2 pointer-events-auto flex gap-2">
                        <button
                          onClick={() => toggleFullscreen(videoId)}
                          className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                          title="Fullscreen"
                        >
                          <FaExpand size={16} />
                        </button>
                        <button
                          onClick={() => handleStopVideo(videoId)}
                          className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                          title="Stop"
                        >
                          <FaPause size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {video.video_quality && (
                    <div className="absolute top-2 left-2 pointer-events-auto">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getQualityBadgeColor(video.video_quality)}`}
                      >
                        {video.video_quality.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-2">
                  <h3
                    className="font-semibold text-gray-800 mb-1 line-clamp-1"
                    title={video.video_name}
                  >
                    {video.video_name}
                  </h3>

                  {video.video_description && (
                    <p className="text-xs text-gray-400 mb-1 line-clamp-2 p-1">
                      {video.video_description}
                    </p>
                  )}

                  <div className="text-sm text-gray-600 space-y-2">
                    {/* <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <FaFile size={12} />
                        <span>File:</span>
                      </span>
                      <span
                        className="font-mono text-xs truncate max-w-[150px]"
                        title={fileName}
                      >
                        {fileName}
                      </span>
                    </div> */}

                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <FaDatabase size={12} />
                        <span>Size:</span>
                      </span>
                      <span>{formatFileSize(video.file_size)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt size={12} />
                        <span>Uploaded:</span>
                      </span>
                      <span>{formatDate(video.created_at)}</span>
                    </div>

                    {video.video_duration && (
                      <div className="flex justify-between items-center">
                        <span>Duration:</span>
                        <span className="font-mono">
                          {formatDuration(video.video_duration)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          if (isActive) {
                            handleStopVideo(videoId);
                          } else {
                            handlePlayVideo(videoId);
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
                        onClick={() => handleDownloadVideo(video)}
                        className="px-3 py-1.5 rounded text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-2 transition-colors"
                      >
                        <FaDownload size={12} />
                        Download
                      </button>
                    </div>

                    {(userRole === "Admin" || userRole === "SuperAdmin") && (
                      <button
                        onClick={() => handleDeleteVideo(video)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
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

export default SpecialVideos;
