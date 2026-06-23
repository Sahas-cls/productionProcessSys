// JigOperationsMediaPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  FaVideo,
  FaImage,
  FaFileAlt,
  FaDownload,
  FaInfoCircle,
  FaPlay,
  FaPause,
  FaExpand,
  FaTrash,
  FaExclamationTriangle,
} from "react-icons/fa";
import { MdOutlineArrowBack } from "react-icons/md";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

const JigOperationsMediaPage = () => {
  const { operationName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [mediaData, setMediaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    images: true,
    videos: true,
  });
  const [showOperationDetails, setShowOperationDetails] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [videoErrors, setVideoErrors] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  const videoRefs = useRef({});

  const displayName =
    location.state?.operationName || operationName || "Operation";
  const backendUrl = import.meta.env.VITE_API_URL;

  // Fetch media for this operation name
  const fetchOperationMedia = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${backendUrl}/api/jig-operations/jig-operation-media/name/${encodeURIComponent(operationName)}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      console.log("response media: ", response);

      if (response.data.success) {
        const data = response.data.data;
        setMediaData({
          images: data.images || [],
          videos: data.videos || [],
          total: data.total_media || 0,
          operation_count: data.operation_count || 1,
          operation_ids: data.operation_ids || [],
          operation_info: data.operation_info || [],
          all_media: data.all_media || [],
          media_types: data.media_types || { image: 0, video: 0 },
        });
      } else {
        setError(response.data.message || "Failed to load media");
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      setError(error.response?.data?.message || "Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (operationName) {
      fetchOperationMedia();
    }
  }, [operationName]);

  // Get the correct media URL using the B2 proxy
  const getMediaUrl = (media) => {
    if (media?.media_url) {
      const cleanPath = media.media_url.replace(/^\//, "");
      const timestamp = new Date().getTime();
      return `${backendUrl}/api/b2-files/${cleanPath}?t=${timestamp}`;
    }
    return null;
  };

  const handlePlayVideo = useCallback(
    (id) => {
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

  const handleVideoError = (id, error) => {
    if (!id) return;

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

  const handleDownload = async (media) => {
    try {
      const mediaUrl = getMediaUrl(media)?.split("?")[0];
      if (mediaUrl) {
        const link = document.createElement("a");
        link.href = mediaUrl;
        link.download = media.file_name;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Swal.fire({
          title: "Error",
          text: "Cannot download - URL not available",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error downloading media:", error);
      Swal.fire({
        title: "Download Failed",
        text: "Failed to download media",
        icon: "error",
      });
    }
  };

  const handleDeleteMedia = async (media) => {
    if (!media?.jig_media_id) return;

    const isActive = activeVideoId === media.jig_media_id;

    const result = await Swal.fire({
      title: "Delete media?",
      text: `Delete "${media.file_name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        if (isActive) {
          handleStopVideo(media.jig_media_id);
        }

        const response = await axios.delete(
          `${backendUrl}/api/jig-operations/jig-operation-media/${media.jig_media_id}`,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (response.status === 200) {
          Swal.fire({
            title: "Media Deleted Successfully",
            icon: "success",
          });
          fetchOperationMedia();
        }
      } catch (error) {
        console.error("Delete error:", error);
        Swal.fire({
          title: "Delete failed",
          text: error.response?.data?.message || "Please try again",
          icon: "error",
        });
      }
    }
  };

  const renderVideoElement = (media, isActive, videoUrl) => {
    if (!isActive || !videoUrl || !media?.jig_media_id) return null;

    return (
      <video
        ref={(el) => {
          if (el && media?.jig_media_id) {
            videoRefs.current[media.jig_media_id] = el;
          }
        }}
        key={`video-${media.jig_media_id}`}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        controls
        onError={(e) => handleVideoError(media?.jig_media_id, e)}
        onLoadedData={() => {
          if (media?.jig_media_id) {
            setLoadingStates((prev) => ({
              ...prev,
              [media.jig_media_id]: false,
            }));
          }
        }}
        onPlaying={() => {
          if (media?.jig_media_id) {
            setVideoErrors((prev) => ({
              ...prev,
              [media.jig_media_id]: null,
            }));
          }
        }}
      >
        <source src={videoUrl} type={media.mime_type || "video/mp4"} />
        Your browser does not support the video tag.
      </video>
    );
  };

  const renderMediaItem = (media) => {
    const isImage = media.media_type === "image";
    const mediaId = media.jig_media_id;
    const isActive = activeVideoId === mediaId;
    const isLoading = loadingStates[mediaId];
    const error = videoErrors[mediaId];
    const mediaUrl = getMediaUrl(media);
    const isVideo = media.media_type === "video";

    const handleImageClick = () => {
      if (mediaUrl) {
        window.open(mediaUrl, "_blank");
      }
    };

    return (
      <motion.div
        key={mediaId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
      >
        {/* Media Preview */}
        <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 aspect-video">
          {isImage ? (
            <img
              src={mediaUrl}
              alt={media.file_name}
              onClick={handleImageClick}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24"%3E%3Cpath fill="%23999" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4-6h2v13h-2z"/%3E%3C/svg%3E';
              }}
            />
          ) : (
            <>
              {/* Render video only when active */}
              {renderVideoElement(media, isActive, mediaUrl)}

              {/* Loading Indicator */}
              {isActive && isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                </div>
              )}

              {/* Overlay UI for inactive state */}
              {!isActive && !error && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-purple-50/50 to-gray-100/50 hover:from-purple-100/50 hover:to-gray-200/50"
                  onClick={() => handlePlayVideo(mediaId)}
                >
                  <div className="bg-purple-600/20 hover:bg-purple-600/30 rounded-full p-4 transition-colors">
                    <FaPlay className="text-purple-600 text-3xl" />
                  </div>
                  <p className="text-purple-700 text-sm mt-3 font-medium">
                    Click to play video
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    {formatFileSize(media.file_size)}
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-red-50">
                  <FaExclamationTriangle className="text-red-500 text-3xl mb-2" />
                  <p className="text-red-700 text-sm font-medium text-center">
                    {error}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handlePlayVideo(mediaId)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-2"
                    >
                      <FaPlay size={12} />
                      Retry
                    </button>
                    <button
                      onClick={() => handleDownload(media)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 flex items-center gap-2"
                    >
                      <FaDownload size={12} />
                      Download
                    </button>
                  </div>
                </div>
              )}

              {/* Controls for active video */}
              {isActive && !error && !isLoading && (
                <div className="absolute inset-0 bg-transparent pointer-events-none">
                  <div className="absolute top-2 right-2 pointer-events-auto flex gap-2">
                    <button
                      onClick={() => toggleFullscreen(mediaId)}
                      className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      title="Fullscreen"
                    >
                      <FaExpand size={16} />
                    </button>
                    <button
                      onClick={() => handleStopVideo(mediaId)}
                      className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      title="Stop"
                    >
                      <FaPause size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Media type badge */}
          <div className="absolute top-2 right-2 flex gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full text-white ${
                isImage ? "bg-blue-500" : "bg-purple-500"
              }`}
            >
              {isImage ? "Image" : "Video"}
            </span>
          </div>

          {/* Operation ID badge */}
          {media.operation_id && (
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              Op #{media.operation_id}
            </div>
          )}
        </div>

        {/* Media Info */}
        <div className="p-4">
          <h3
            className="font-medium text-sm truncate"
            title={media.file_name || "N/A"}
          >
            {media.file_name}
          </h3>
          <h3 className="grid grid-cols-2 text-sm text-gray-500">
            <span>Style No</span>
            <span className="text-end">{media.style.style_no}</span>
          </h3>
          {media.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {media.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{formatFileSize(media.file_size)}</span>
            <span>{formatDate(media.created_at)}</span>
          </div>
          {media.style && (
            <div className="mt-2 text-xs bg-gray-100 rounded px-2 py-1 inline-block">
              Style: {media.style.style_no} - {media.style.style_name}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex flex-wrap gap-2">
              {isVideo && (
                <button
                  onClick={() => {
                    if (isActive) {
                      handleStopVideo(mediaId);
                    } else {
                      handlePlayVideo(mediaId);
                    }
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-2 ${
                    isActive
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-purple-100 text-purple-700 hover:bg-purple-200"
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
              )}

              <button
                onClick={() => handleDownload(media)}
                className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-2"
              >
                <FaDownload size={12} />
                Download
              </button>
            </div>

            {/* Delete button */}
            <button
              onClick={() => handleDeleteMedia(media)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Delete media"
            >
              <FaTrash size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading media...</p>
        </div>
      </div>
    );
  }

  if (error || !mediaData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-500">
          <FaFileAlt size={48} className="mx-auto mb-4" />
          <p>{error || "No media found"}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const {
    images = [],
    videos = [],
    operation_count = 1,
    operation_info = [],
  } = mediaData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MdOutlineArrowBack size={24} className="text-blue-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {displayName}
                {operation_count > 1 && (
                  <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    {operation_count} operations
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-gray-500">
                  {images.length} images • {videos.length} videos
                </p>
                {operation_count > 1 && (
                  <button
                    onClick={() =>
                      setShowOperationDetails(!showOperationDetails)
                    }
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  >
                    <FaInfoCircle size={12} />
                    {showOperationDetails ? "Hide" : "Show"} operation details
                  </button>
                )}
              </div>
              {showOperationDetails && operation_count > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded"
                >
                  <p className="font-medium">Combined Operations:</p>
                  {operation_info.map((op, index) => (
                    <span key={index} className="inline-block mr-3">
                      ID: {op.id} {op.number && `(${op.number})`}
                    </span>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Total: {mediaData.total || 0} items
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Images Section */}
        {images.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => toggleSection("images")}
              className="flex items-center gap-3 w-full text-left mb-4 hover:bg-gray-50 p-2 rounded transition-colors"
            >
              <FaImage className="text-blue-500" size={24} />
              <h2 className="text-xl font-semibold text-gray-800">
                Images ({images.length})
              </h2>
              <span className="text-gray-400">
                {expandedSections.images ? "▼" : "▶"}
              </span>
            </button>
            <AnimatePresence>
              {expandedSections.images && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {images.map(renderMediaItem)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Videos Section */}
        {videos.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => toggleSection("videos")}
              className="flex items-center gap-3 w-full text-left mb-4 hover:bg-gray-50 p-2 rounded transition-colors"
            >
              <FaVideo className="text-purple-500" size={24} />
              <h2 className="text-xl font-semibold text-gray-800">
                Videos ({videos.length})
              </h2>
              <span className="text-gray-400">
                {expandedSections.videos ? "▼" : "▶"}
              </span>
            </button>
            <AnimatePresence>
              {expandedSections.videos && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {videos.map(renderMediaItem)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {images.length === 0 && videos.length === 0 && (
          <div className="text-center py-12">
            <FaFileAlt size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No media found for this operation</p>
            <p className="text-sm text-gray-400 mt-2">
              {operation_count > 1
                ? `${operation_count} operations with this name have no media`
                : "Upload some media to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JigOperationsMediaPage;
