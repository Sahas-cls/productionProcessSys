import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaPlay,
  FaTrash,
  FaArrowLeft,
  FaExclamationTriangle,
  FaDownload,
  FaPause,
  FaExpand,
} from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import { FaClockRotateLeft } from "react-icons/fa6";

const HelperVideoGallery = () => {
  const { hOpId } = useParams();
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

  useEffect(() => {
    if (hOpId) {
      fetchVideos();
    }
  }, [hOpId]);

  const fetchVideos = async () => {
    setLoading(true);

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/helperOpMedia/getVideos/${hOpId}`,
        { withCredentials: true },
      );

      // Transform the data to include media_id field
      const transformedData = (response.data?.data || []).map((item) => ({
        ...item,
        // Map helper_video_id to media_id for consistent usage
        media_id: item.helper_video_id,
        // Also keep original field for reference
        helper_video_id: item.helper_video_id,
      }));

      setVideos(transformedData);
      console.log(
        `✅ Loaded ${transformedData.length} videos from local storage`,
      );
    } catch (error) {
      console.error("Error fetching helper operation videos:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load videos",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVideoUrl = (item) => {
    if (!item?.video_url) return null;

    // The backend now returns the full URL, just use it directly
    console.log("🎥 Helper video URL:", item.video_url);
    return item.video_url;
  };

  const handlePlayVideo = useCallback(
    async (id) => {
      if (!id) return;

      // Pause the currently active video if different
      if (
        activeVideoId &&
        activeVideoId !== id &&
        videoRefs.current[activeVideoId]
      ) {
        videoRefs.current[activeVideoId].pause();
      }

      setLoadingStates((prev) => ({ ...prev, [id]: true }));
      setActiveVideoId(id);
      setVideoErrors((prev) => ({ ...prev, [id]: null }));

      // Small delay to ensure video element is ready
      setTimeout(() => {
        const video = videoRefs.current[id];
        if (video) {
          video.load();
          video.play().catch((error) => {
            console.error("Play error:", error);
            setVideoErrors((prev) => ({
              ...prev,
              [id]: "Failed to play video. Please try downloading.",
            }));
            setLoadingStates((prev) => ({ ...prev, [id]: false }));
          });
        }
      }, 100);
    },
    [activeVideoId],
  );

  const handleStopVideo = useCallback((id) => {
    if (!id) return;

    const video = videoRefs.current[id];
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.removeAttribute("src");
      video.load();
    }
    setActiveVideoId(null);
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

  const getFileName = useCallback((item) => {
    if (!item) return "video";
    return (
      item.original_file_name || item.video_url?.split("/").pop() || "video"
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
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const handleDownloadVideo = useCallback(
    (item) => {
      if (!item) return;

      const videoUrl = getVideoUrl(item); // Remove the ?t= part, use clean URL
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

  const handleDeleteVideo = async (item) => {
    if (!item?.helper_video_id) return;

    const fileName = getFileName(item);
    const isActive = activeVideoId === item.helper_video_id;

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
          handleStopVideo(item.helper_video_id);
        }

        const response = await axios.delete(
          `${backendUrl}/api/helperOpMedia/deleteVideo/${item.helper_video_id}/${item.b2_file_id}`,
          { withCredentials: true },
        );

        if (response.status === 200) {
          Swal.fire({
            title: "Video Delete Successful",
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
  };

  const handleVideoError = (id, error) => {
    if (!id) {
      console.error("Video error with undefined ID:", error);
      return;
    }

    console.error("Video error for ID:", id, error);

    const video = videoRefs.current[id];
    let errorMessage = "Failed to load video";

    if (video?.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = "Video loading aborted";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = "Network error - video download failed";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = "Video decoding error - format may not be supported";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Video format not supported by browser";
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
  };

  // Don't render video element if not active - this fixes empty src warning
  const renderVideoElement = (item, isActive, videoUrl) => {
    if (!isActive || !videoUrl || !item?.helper_video_id) return null;

    return (
      <video
        ref={(el) => {
          if (el && item?.helper_video_id) {
            videoRefs.current[item.helper_video_id] = el;
          }
        }}
        key={`video-${item.helper_video_id}`}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        controls
        onError={(e) => handleVideoError(item?.helper_video_id, e)}
        onLoadedData={() => {
          if (item?.helper_video_id) {
            setLoadingStates((prev) => ({
              ...prev,
              [item.helper_video_id]: false,
            }));
          }
        }}
        onPlaying={() => {
          if (item?.helper_video_id) {
            setVideoErrors((prev) => ({
              ...prev,
              [item.helper_video_id]: null,
            }));
          }
        }}
      >
        <source src={videoUrl} type={item.file_type || "video/mp4"} />
        Your browser does not support the video tag.
      </video>
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
            <h1 className="text-2xl font-bold text-gray-800">
              Helper Operation Videos
            </h1>
            <p className="text-gray-600">
              {videos.length} video{videos.length !== 1 ? "s" : ""}
            </p>
          </div>
          {videos.length > 0 && (
            <div className="text-sm text-gray-500">
              Helper Operation ID: {hOpId}
            </div>
          )}
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
            No videos have been uploaded for this helper operation yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          {videos.map((item) => {
            // Use helper_video_id as the unique identifier
            const mediaId = item?.helper_video_id;

            if (!mediaId) {
              console.warn("Video item missing helper_video_id:", item);
              return null;
            }

            const fileName = getFileName(item);
            const isActive = activeVideoId === mediaId;
            const isLoading = loadingStates[mediaId];
            const error = videoErrors[mediaId];
            const videoUrl = getVideoUrl(item);
            const helperName = item.helper_operation?.helper_name || "N/A";
            const operationName =
              item.helper_operation?.operation_name || "N/A";
            const styleName = item.style?.style_name || "N/A";

            // Check if status is not "Success" (show pending card)
            const isPending = item.status.toLowerCase() !== "success";

            return (
              <motion.div
                key={mediaId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-2 border-green-100 h-full flex flex-col"
              >
                {isPending ? (
                  // Pending State - Clock Icon Card
                  <div className="flex-1 flex flex-col">
                    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 h-40 sm:h-44 md:h-48 lg:h-52 group flex flex-col">
                      {/* Top div - 3/4 */}
                      <div className="flex-[3] flex items-center justify-center relative">
                        <div className="absolute flex justify-center items-center animate-pulse [animation-duration:4s]">
                          <FaClockRotateLeft className="text-3xl sm:text-4xl md:text-5xl text-yellow-700/30" />
                        </div>
                      </div>

                      {/* Bottom div - 1/4 */}
                      <div className="flex-[0] p-1 sm:p-2 bg-white border-t-2 border-black/10 flex items-start justify-between">
                        <h3 className="text-[10px] text-xs text-left font-semibold line-clamp-2 text-black/60 max-w-[70%] sm:max-w-[80%]">
                          Video being processed as a background job, please
                          check in a while
                        </h3>

                        {(userRole === "Admin" ||
                          userRole === "SuperAdmin") && (
                          <button
                            onClick={() => handleDeleteVideo(item)}
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
                  // Success State - Actual Video Card
                  <div className="flex-1 flex flex-col">
                    {/* Video Container */}
                    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 h-40 sm:h-44 md:h-48 lg:h-52 group">
                      {/* Render video element */}
                      {renderVideoElement(item, isActive, videoUrl)}

                      {/* Loading Indicator */}
                      {isActive && isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-4 border-white border-t-transparent"></div>
                        </div>
                      )}

                      {/* Overlay UI for inactive state */}
                      {!isActive && !error && (
                        <div
                          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-green-50/50 to-gray-100/50 hover:from-green-100/50 hover:to-gray-200/50"
                          onClick={() => handlePlayVideo(mediaId)}
                        >
                          <div className="bg-green-600/20 hover:bg-green-600/30 rounded-full p-2 sm:p-3 md:p-4 transition-colors">
                            <FaPlay className="text-green-600 text-xl sm:text-2xl md:text-3xl" />
                          </div>
                          <p className="text-green-700 text-xs sm:text-sm mt-1 sm:mt-2 md:mt-3 font-medium">
                            Click to play video
                          </p>
                          <p className="text-gray-600 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                            {formatFileSize(item.file_size)}
                          </p>
                        </div>
                      )}

                      {/* Error State */}
                      {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-4 bg-red-50">
                          <FaExclamationTriangle className="text-red-500 text-2xl sm:text-3xl mb-1 sm:mb-2" />
                          <p className="text-red-700 text-xs sm:text-sm font-medium text-center">
                            {error}
                          </p>
                          <div className="flex gap-1 sm:gap-2 mt-2 sm:mt-3">
                            <button
                              onClick={() => handlePlayVideo(mediaId)}
                              className="px-2 sm:px-3 py-0.5 sm:py-1 bg-red-100 text-red-700 rounded text-[10px] sm:text-sm hover:bg-red-200 flex items-center gap-1 sm:gap-2"
                            >
                              <FaPlay size={10} className="sm:w-3 sm:h-3" />
                              Retry
                            </button>
                            <button
                              onClick={() => handleDownloadVideo(item)}
                              className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded text-[10px] sm:text-sm hover:bg-blue-200 flex items-center gap-1 sm:gap-2"
                            >
                              <FaDownload size={10} className="sm:w-3 sm:h-3" />
                              Download
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Controls for active video */}
                      {isActive && !error && !isLoading && (
                        <div className="absolute inset-0 bg-transparent pointer-events-none">
                          <div className="absolute top-1 sm:top-2 right-1 sm:right-2 pointer-events-auto flex gap-1 sm:gap-2">
                            <button
                              onClick={() => toggleFullscreen(mediaId)}
                              className="p-1 sm:p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                              title="Fullscreen"
                            >
                              <FaExpand size={12} className="sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleStopVideo(mediaId)}
                              className="p-1 sm:p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                              title="Stop"
                            >
                              <FaPause size={12} className="sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="p-2 sm:p-3 md:p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate mb-1 sm:mb-2">
                        {item.helper_operation?.operation_name || fileName}
                      </h3>

                      <div className="text-[10px] sm:text-xs text-gray-600 space-y-1 sm:space-y-2 mb-2 sm:mb-4">
                        <div className="flex justify-between">
                          <span>Operation:</span>
                          <span className="font-medium text-gray-800">
                            {operationName}
                          </span>
                        </div>

                        {/* <div className="flex justify-between">
                          <span>Helper:</span>
                          <span className="font-medium text-gray-800">
                            {helperName}
                          </span>
                        </div> */}

                        {/* {styleName !== "N/A" && (
                          <div className="flex justify-between">
                            <span>Style:</span>
                            <span className="font-medium text-gray-800">
                              {styleName}
                            </span>
                          </div>
                        )} */}

                        <div className="flex justify-between">
                          <span>File:</span>
                          <span
                            className="font-mono text-[8px] sm:text-xs truncate max-w-[80px] sm:max-w-[120px]"
                            title={fileName}
                          >
                            {fileName}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span className="font-medium">
                            {formatFileSize(item.file_size)}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>Uploaded:</span>
                          <span className="font-medium">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions - pushed to bottom */}
                      <div className="mt-auto">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            <button
                              onClick={() => {
                                if (isActive) {
                                  handleStopVideo(mediaId);
                                } else {
                                  handlePlayVideo(mediaId);
                                }
                              }}
                              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-medium flex items-center gap-1 sm:gap-2 ${
                                isActive
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
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
                              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1 sm:gap-2"
                            >
                              <FaDownload size={10} className="sm:w-3 sm:h-3" />
                              <span className="hidden xs:inline">Download</span>
                            </button>
                          </div>

                          {(userRole === "Admin" ||
                            userRole === "SuperAdmin") && (
                            <button
                              onClick={() => handleDeleteVideo(item)}
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

export default HelperVideoGallery;
