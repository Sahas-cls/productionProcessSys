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
  FaChevronDown,
  FaChevronRight,
  FaUpload,
} from "react-icons/fa";
import { MdOutlineArrowBack } from "react-icons/md";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import AttachmentPopup from "../components/AttachmentPopup";

const JigOperationsMediaPage = () => {
  const { folderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // State
  const [mediaData, setMediaData] = useState({
    images: [],
    videos: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    images: true,
    videos: true,
  });
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [videoErrors, setVideoErrors] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  // Upload states
  const [isUploadExp, setIsUploadExp] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isVideo, setIsVideo] = useState(true);

  const videoRefs = useRef({});
  const uploadRef = useRef(null);

  const displayName = location.state?.folderName || folderId || "Folder";
  const backendUrl = import.meta.env.VITE_API_URL;

  // Fetch media for this folder
  const fetchOperationMedia = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${backendUrl}/api/jig-operations/jig-operation-media/folder/${folderId}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      console.log("response media: ", response);

      if (response.data.status === "Ok") {
        const data = response.data;
        setMediaData({
          images: data.images || [],
          videos: data.videos || [],
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
    if (folderId) {
      fetchOperationMedia();
    }
  }, [folderId]);

  // Handle click outside when upload drop down expanded
  useEffect(() => {
    const handleOutSideClick = (event) => {
      if (uploadRef.current && !uploadRef.current.contains(event.target)) {
        setIsUploadExp(false);
      }
    };

    document.addEventListener("mousedown", handleOutSideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutSideClick);
    };
  }, []);

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

  // Upload handlers
  const handleVideoUpload = () => {
    setIsUploadOpen(true);
    setIsVideo(true);
    setIsUploadExp(false);
  };

  const handleImageUpload = () => {
    setIsUploadOpen(true);
    setIsVideo(false);
    setIsUploadExp(false);
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
        className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow group"
      >
        {/* Media Preview */}
        <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 aspect-video">
          {isImage ? (
            <img
              src={mediaUrl}
              alt={media.file_name}
              onClick={handleImageClick}
              className="w-full h-full object-cover cursor-pointer"
              onError={(e) => {
                e.target.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24"%3E%3Cpath fill="%23999" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4-6h2v13h-2z"/%3E%3C/svg%3E';
              }}
            />
          ) : (
            <>
              {renderVideoElement(media, isActive, mediaUrl)}

              {isActive && isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                </div>
              )}

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

          {/* Badges */}
          <div className="absolute top-2 right-2 flex gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full text-white ${
                isImage ? "bg-blue-500" : "bg-purple-500"
              }`}
            >
              {isImage ? "Image" : "Video"}
            </span>
          </div>

          {/* Download button on hover */}
          <button
            onClick={() => handleDownload(media)}
            className="absolute bottom-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            title="Download"
          >
            <FaDownload className="text-gray-700" size={16} />
          </button>
        </div>

        {/* Media Info */}
        <div className="p-4">
          <h3
            className="font-medium text-sm truncate"
            title={media.file_name || "N/A"}
          >
            {media.file_name}
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

  const { images = [], videos = [] } = mediaData;
  const totalMedia = images.length + videos.length;

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
              </h1>
              <p className="text-sm text-gray-500">
                {images.length} images • {videos.length} videos • Total:{" "}
                {totalMedia} items
              </p>
            </div>
          </div>

          {/* Upload button with dropdown - Same as AttachmentMediaPage */}
          <div className="relative" ref={uploadRef}>
            <button
              onClick={() => setIsUploadExp(!isUploadExp)}
              className="w-[140px] h-[48px] bg-blue-600 text-white flex items-center justify-center gap-3 font-medium shadow-md hover:bg-blue-700 hover:shadow-lg active:scale-95 transition-all duration-200 rounded-md"
            >
              <FaUpload size={18} />
              <span>Upload</span>
            </button>
            <AnimatePresence>
              {isUploadExp && (
                <motion.div
                  className="absolute z-10 overflow-hidden right-0"
                  initial={{ height: 0, opacity: 1 }}
                  animate={{ height: 100, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                >
                  <motion.button
                    onClick={handleVideoUpload}
                    initial={{ y: -20, scale: 0.8, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: -20, scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "backOut" }}
                    className="w-[140px] h-[48px] bg-green-600 text-white flex items-center justify-center gap-3 font-medium shadow-md hover:bg-green-700 hover:shadow-lg active:scale-95 transition-all duration-200 rounded-b-none"
                  >
                    <FaVideo size={18} />
                    <span>Video</span>
                  </motion.button>

                  <motion.button
                    onClick={handleImageUpload}
                    initial={{ y: -20, scale: 0.8, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: -20, scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "backOut" }}
                    className="w-[140px] h-[48px] bg-green-600 text-white flex items-center justify-center gap-3 font-medium shadow-md hover:bg-green-700 hover:shadow-lg active:scale-95 transition-all duration-200 rounded-t-none"
                  >
                    <FaImage size={18} />
                    <span>Image</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Images Section */}
        <div className="mb-8">
          <button
            onClick={() => toggleSection("images")}
            className="flex items-center justify-between w-full p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <FaImage className="text-blue-500" size={24} />
              <h2 className="text-xl font-semibold text-gray-800">
                Images ({images.length})
              </h2>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-sm">
                {expandedSections.images ? "Collapse" : "Expand"}
              </span>
              {expandedSections.images ? (
                <FaChevronDown size={18} />
              ) : (
                <FaChevronRight size={18} />
              )}
            </div>
          </button>
          <AnimatePresence>
            {expandedSections.images && images.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {images.map(renderMediaItem)}
              </motion.div>
            )}
            {expandedSections.images && images.length === 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200"
              >
                <FaImage size={48} className="mx-auto text-gray-300 mb-2" />
                <p>No images in this folder</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Videos Section */}
        <div className="mb-8">
          <button
            onClick={() => toggleSection("videos")}
            className="flex items-center justify-between w-full p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <FaVideo className="text-purple-500" size={24} />
              <h2 className="text-xl font-semibold text-gray-800">
                Videos ({videos.length})
              </h2>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-sm">
                {expandedSections.videos ? "Collapse" : "Expand"}
              </span>
              {expandedSections.videos ? (
                <FaChevronDown size={18} />
              ) : (
                <FaChevronRight size={18} />
              )}
            </div>
          </button>
          <AnimatePresence>
            {expandedSections.videos && videos.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {videos.map(renderMediaItem)}
              </motion.div>
            )}
            {expandedSections.videos && videos.length === 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200"
              >
                <FaVideo size={48} className="mx-auto text-gray-300 mb-2" />
                <p>No videos in this folder</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Empty State - when both sections are empty */}
        {images.length === 0 && videos.length === 0 && (
          <div className="text-center py-12">
            <FaFileAlt size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              No media found in this folder
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Upload some media to get started
            </p>
          </div>
        )}
      </div>

      {/* Upload Popup */}
      <AttachmentPopup
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          fetchOperationMedia();
        }}
        isAttachment={false}
        isVideo={isVideo}
        onUploadSuccess={fetchOperationMedia}
        folderId={folderId}
      />
    </div>
  );
};

export default JigOperationsMediaPage;
