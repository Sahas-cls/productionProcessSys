// pages/AttachmentMediaPage.jsx
import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect, useRef } from "react";
import {
  FaUpload,
  FaVideo,
  FaImage,
  FaFileAlt,
  FaDownload,
  FaTrash,
  FaSpinner,
  FaPlay,
  FaPause,
  FaExclamationTriangle,
  FaArrowLeft,
  FaFolder,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { MdOutlineArrowBack } from "react-icons/md";
import axios from "axios";
import Swal from "sweetalert2";
import AttachmentPopup from "../components/AttachmentPopup";
import { BiSolidDownArrow } from "react-icons/bi";

const AttachmentMediaPage = () => {
  // State
  const [isUploadExp, setIsUploadExp] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isVideo, setIsVideo] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [videoErrors, setVideoErrors] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    images: true,
    videos: true,
  });
  const [folderName, setFolderName] = useState("");

  const videoRefs = useRef({});
  const uploadRef = useRef();
  const navigate = useNavigate();
  const { folderId } = useParams();
  const backendUrl = import.meta.env.VITE_API_URL;

  // FETCH FOLDER DETAILS
  const [folderData, setFolderData] = useState({});
  const fetchFolder = async () => {
    // alert("sending request");
    try {
      const response = await axios.get(
        `${backendUrl}/api/attachment-folder/get-folder/${folderId}`,
        { withCredentials: true },
      );
      console.log("response: ", response);
      if (response.status === 200) {
        setFolderData(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchFolder();
  }, [backendUrl]);

  // Fetch attachments by folder ID
  const fetchAttachments = async () => {
    if (!folderId) {
      setError("Folder ID is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let url = `${backendUrl}/api/attachment/attachment-media/${folderId}`;

      if (searchTerm) {
        url += `?search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await axios.get(url, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Handle the backend response structure
      if (response.data.status === "Ok") {
        // Combine images and videos into a single media array
        const allMedia = [
          ...(response.data.images || []).map((img) => ({
            ...img,
            media_type: "image",
          })),
          ...(response.data.videos || []).map((vid) => ({
            ...vid,
            media_type: "video",
          })),
        ];

        setAttachments(allMedia);

        // You might want to get folder name from somewhere else
        // or set a default
        setFolderName(folderId || "Folder");
      } else {
        setError("Failed to load attachments");
      }
    } catch (error) {
      console.error("Error fetching attachments:", error);
      setError(error.response?.data?.message || "Failed to load attachments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [folderId, searchTerm]);

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

  const getMediaUrl = (media) => {
    if (media?.media_url) {
      const cleanPath = media.media_url.replace(/^\//, "");
      const timestamp = new Date().getTime();
      return `${backendUrl}/api/b2-files/${cleanPath}?t=${timestamp}`;
    }
    return null;
  };

  const handlePlayVideo = (id) => {
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
            [id]: "Failed to play video",
          }));
          setLoadingStates((prev) => ({ ...prev, [id]: false }));
        });
      }
    }, 100);
  };

  const handleStopVideo = (id) => {
    if (!id) return;

    const video = videoRefs.current[id];
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.removeAttribute("src");
      video.load();
    }
    setActiveVideoId(null);
  };

  const handleVideoError = (id, error) => {
    if (!id) return;

    let errorMessage = "Failed to load video";
    const video = videoRefs.current[id];

    if (video?.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = "Video loading aborted";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = "Network error";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = "Video decoding error";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Video format not supported";
          break;
        default:
          errorMessage = video.error.message || "Failed to load video";
      }
    }

    setVideoErrors((prev) => ({ ...prev, [id]: errorMessage }));
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
      }
    } catch (error) {
      console.error("Download error:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to download file",
        icon: "error",
      });
    }
  };

  const handleDelete = async (media) => {
    const result = await Swal.fire({
      title: "Delete attachment?",
      text: `Delete "${media.file_name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        if (activeVideoId === media.attachment_media_id) {
          handleStopVideo(media.attachment_media_id);
        }

        const response = await axios.delete(
          `${backendUrl}/api/attachment/attachment-media/${media.attachment_media_id}`,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (response.status === 200) {
          Swal.fire({
            title: "Deleted!",
            text: "Attachment deleted successfully",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          fetchAttachments();
        }
      } catch (error) {
        console.error("Delete error:", error);
        Swal.fire({
          title: "Error",
          text: error.response?.data?.message || "Failed to delete",
          icon: "error",
        });
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
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

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderMediaItem = (media) => {
    const isImage = media.media_type === "image";
    const mediaId = media.attachment_media_id;
    const isActive = activeVideoId === mediaId;
    const isLoading = loadingStates[mediaId];
    const error = videoErrors[mediaId];
    const mediaUrl = getMediaUrl(media);

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
              className="w-full h-full object-cover cursor-pointer"
              onClick={handleImageClick}
              onError={(e) => {
                e.target.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24"%3E%3Cpath fill="%23999" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4-6h2v13h-2z"/%3E%3C/svg%3E';
              }}
            />
          ) : (
            <>
              {isActive ? (
                <video
                  ref={(el) => {
                    if (el && mediaId) {
                      videoRefs.current[mediaId] = el;
                    }
                  }}
                  className="w-full h-full object-contain"
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  controls
                  onError={(e) => handleVideoError(mediaId, e)}
                  onLoadedData={() => {
                    setLoadingStates((prev) => ({ ...prev, [mediaId]: false }));
                  }}
                  onPlaying={() => {
                    setVideoErrors((prev) => ({ ...prev, [mediaId]: null }));
                  }}
                >
                  <source
                    src={mediaUrl}
                    type={media.mime_type || "video/mp4"}
                  />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-purple-50/50 to-gray-100/50 hover:from-purple-100/50 hover:to-gray-200/50"
                  onClick={() => handlePlayVideo(mediaId)}
                >
                  <div className="bg-purple-600/20 hover:bg-purple-600/30 rounded-full p-4 transition-colors">
                    <FaPlay className="text-purple-600 text-3xl" />
                  </div>
                  <p className="text-purple-700 text-sm mt-3 font-medium">
                    Click to play
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    {formatFileSize(media.file_size)}
                  </p>
                </div>
              )}

              {isActive && !isLoading && !error && (
                <div className="absolute top-2 right-2 pointer-events-auto flex gap-2">
                  <button
                    onClick={() => handleStopVideo(mediaId)}
                    className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    title="Stop"
                  >
                    <FaPause size={16} />
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <FaSpinner className="animate-spin text-white text-3xl" />
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-red-50">
                  <FaExclamationTriangle className="text-red-500 text-2xl mb-2" />
                  <p className="text-red-700 text-sm text-center">{error}</p>
                  <button
                    onClick={() => handlePlayVideo(mediaId)}
                    className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Retry
                  </button>
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

          {media.style_no && (
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              Style: {media.style_no}
            </div>
          )}
        </div>

        {/* Media Info */}
        <div className="p-4">
          <h3 className="font-medium text-sm truncate" title={media.file_name}>
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
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(media)}
                className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-2"
              >
                <FaDownload size={12} />
                Download
              </button>
            </div>
            <button
              onClick={() => handleDelete(media)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              <FaTrash size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Separate images and videos
  const images = attachments.filter((item) => item.media_type === "image");
  const videos = attachments.filter((item) => item.media_type === "video");

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attachments...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-500">
          <FaFileAlt size={48} className="mx-auto mb-4" />
          <p>{error}</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button title="Go Back" onClick={() => navigate(-1)}>
              <div className="group">
                <MdOutlineArrowBack className="text-4xl text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
            </button>
            <div>
              <h2 className="text-3xl font-bold text-blue-500 flex items-center gap-2">
                <FaFolder className="text-yellow-500" />
                {folderData?.folder_name || "Folder"}
              </h2>
              <p className="text-sm text-gray-500">
                {attachments.length} total items • {images.length} images •{" "}
                {videos.length} videos
              </p>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search in folder..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
              />
            </div>

            {/* Upload button */}
            <div className="relative" ref={uploadRef}>
              <button
                onClick={() => setIsUploadExp(!isUploadExp)}
                className="w-[140px] h-[48px] bg-blue-600 text-white flex items-center justify-center gap-3 font-medium shadow-md hover:bg-blue-700 hover:shadow-lg active:scale-95 transition-all duration-200"
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
                      className="w-[140px] h-[48px] bg-green-600 text-white flex items-center justify-center gap-3 font-medium shadow-md hover:bg-green-700 hover:shadow-lg active:scale-95 transition-all duration-200"
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
                      className="w-[140px] h-[48px] bg-green-600 text-white flex items-center justify-center gap-3 font-medium shadow-md hover:bg-green-700 hover:shadow-lg active:scale-95 transition-all duration-200"
                    >
                      <FaImage size={18} />
                      <span>Image</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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
                {expandedSections.videos ? (
                  <BiSolidDownArrow size={20} />
                ) : (
                  <BiSolidDownArrow size={20} className="rotate-90" />
                )}
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
            <p className="text-gray-500">No attachments found in this folder</p>
            <p className="text-sm text-gray-400 mt-2">
              {searchTerm
                ? `No results found for "${searchTerm}"`
                : "Upload your first attachment to get started"}
            </p>
          </div>
        )}
      </div>

      {/* Upload Popup - Pass folderId */}
      <AttachmentPopup
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          fetchAttachments();
        }}
        isAttachment={true}
        isVideo={isVideo}
        onUploadSuccess={fetchAttachments}
        folderId={folderId}
      />
    </div>
  );
};

export default AttachmentMediaPage;
