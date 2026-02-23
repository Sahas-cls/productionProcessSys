import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import useSubOpVideos from "../hooks/useSubOpVideos";
import {
  FaArrowLeft,
  FaTrash,
  FaPlay,
  FaImage,
  FaFileExcel,
  FaFolder,
  FaDownload,
  FaExternalLinkAlt,
  FaCloud,
  FaRedoAlt,
} from "react-icons/fa";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Plyr from "plyr-react";
import "plyr-react/plyr.css";
import Swal from "sweetalert2";
import { MdOutlineArrowDropDownCircle } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";

const MediaGallery = () => {
  const { user, loading: authLoading } = useAuth();
  const userRole = user?.userRole;
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  // Add rotation tracking state
  const [videoRotations, setVideoRotations] = useState({});
  const [rotationDetectionLoading, setRotationDetectionLoading] = useState({});

  // Get media type from URL or params
  const getMediaTypeFromPath = () => {
    const path = location.pathname;
    if (path.includes("/videos")) return "videos";
    if (path.includes("/images")) return "images";
    if (path.includes("/tech_packs")) return "techPacks";
    if (path.includes("/documents") || path.includes("/folders"))
      return "folders";
    return "all"; // Default to all media types
  };

  const currentMediaType = getMediaTypeFromPath();

  // State management
  const [deletingId, setDeletingId] = useState(null);
  const [deletingType, setDeletingType] = useState(null);
  const [openSections, setOpenSections] = useState({
    videos: false, // Changed from condition to false
    images: false, // Changed from condition to false
    techPacks: false, // Changed from condition to false
    folders: false, // Changed from condition to false
  });
  const [mediaData, setMediaData] = useState({
    videos: [],
    images: [],
    techPacks: [],
    folders: [],
  });
  const [loadingStates, setLoadingStates] = useState({
    videos: false,
    images: false,
    techPacks: false,
    folders: false,
  });
  const [subOpId, setSubOpId] = useState(null);

  // Initialize from params or location state
  useEffect(() => {
    const id =
      params.subOpId ||
      location.state?.subOpId ||
      new URLSearchParams(location.search).get("subOpId");

    if (id) {
      setSubOpId(id);
      fetchAllMedia(id);
    } else {
      Swal.fire({
        title: "Missing Parameter",
        text: "Sub-operation ID is required to view media",
        icon: "error",
        confirmButtonText: "Go Back",
      }).then(() => navigate(-1));
    }
  }, [location, params]);

  // Fetch all media types
  const fetchAllMedia = async (id) => {
    try {
      setLoadingStates({
        videos: true,
        images: true,
        techPacks: true,
        folders: true,
      });

      // If only showing specific media type, only fetch that
      if (currentMediaType !== "all") {
        await fetchSpecificMedia(id, currentMediaType);
      } else {
        // Fetch all media types in parallel
        await Promise.all([
          fetchSpecificMedia(id, "videos"),
          fetchSpecificMedia(id, "images"),
          fetchSpecificMedia(id, "techPacks"),
          fetchSpecificMedia(id, "folders"),
        ]);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load media files from cloud storage",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Fetch specific media type
  const fetchSpecificMedia = async (id, type) => {
    try {
      let endpoint = "";
      switch (type) {
        case "videos":
          endpoint = `getVideos/${id}`;
          break;
        case "images":
          endpoint = `getImages/${id}`;
          break;
        case "techPacks":
          endpoint = `getTechPacks/${id}`;
          break;
        case "folders":
          endpoint = `getFolderFiles/${id}`; // Changed from getFolderDocuments
          break;
        default:
          return;
      }

      console.log(`📡 Fetching ${type} from endpoint: ${endpoint}`);

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/subOperationMedia/${endpoint}`,
        { withCredentials: true },
      );

      console.log(`📋 ${type} response structure:`, {
        hasData: !!response.data.data,
        dataLength: response.data.data?.length || 0,
        status: response.data.status,
        success: response.data.success,
        message: response.data.message,
      });

      // Check for videos response structure
      if (type === "videos") {
        if (response.data.status === "success") {
          setMediaData((prev) => ({
            ...prev,
            [type]: response.data.data || [],
          }));

          // Auto-detect rotation for videos older than your fix date
          // You can set this date to when you implemented the server-side fix
          const FIX_IMPLEMENTATION_DATE = new Date("2026-02-14"); // Adjust this date

          response.data.data?.forEach((video) => {
            const uploadDate = new Date(video.createdAt);
            if (uploadDate < FIX_IMPLEMENTATION_DATE) {
              detectVideoRotation(video, type);
            }
          });

          console.log(
            `✅ Loaded ${
              response.data.data?.length || 0
            } ${type} from Backblaze B2`,
          );
        } else {
          throw new Error(response.data.message || `Failed to load ${type}`);
        }
      }
      // Check for other media types response structure
      else {
        if (response.data.success || response.data.status === "success") {
          setMediaData((prev) => ({
            ...prev,
            [type]: response.data.data || [],
          }));
          console.log(
            `✅ Loaded ${
              response.data.data?.length || 0
            } ${type} from Backblaze B2`,
          );
        } else {
          throw new Error(response.data.message || `Failed to load ${type}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching ${type}:`, error.message);
      console.error(`❌ Error details:`, {
        endpoint: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });

      // Set empty array for this type on error
      setMediaData((prev) => ({
        ...prev,
        [type]: [],
      }));

      // Only show error for videos since they're the main focus
      if (type === "videos") {
        Swal.fire({
          title: "Error",
          text: `Failed to load ${type}: ${error.message}`,
          icon: "error",
          timer: 3000,
          showConfirmButton: false,
        });
      }
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        [type]: false,
      }));
    }
  };

  // NEW FUNCTION: Detect video rotation using video element
  const detectVideoRotation = (video, type) => {
    const videoId = video[`so_${type === "videos" ? "media" : ""}_id`];

    setRotationDetectionLoading((prev) => ({
      ...prev,
      [videoId]: true,
    }));

    // Create a hidden video element to detect orientation
    const videoElement = document.createElement("video");
    videoElement.src = getFileUrl(video, type);
    videoElement.preload = "metadata";

    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      videoElement.remove();
      setRotationDetectionLoading((prev) => ({
        ...prev,
        [videoId]: false,
      }));
    }, 5000);

    videoElement.onloadedmetadata = () => {
      clearTimeout(timeout);

      // Check video dimensions to determine orientation
      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;

      // Determine rotation needed
      let rotation = 0;
      if (width > height) {
        // Video is landscape, but might be a portrait video that needs rotation
        // We'll check if it's a known problematic video (uploaded before fix)
        // For now, default to 90 for portrait videos
        rotation = 90;
      }

      setVideoRotations((prev) => ({
        ...prev,
        [videoId]: rotation,
      }));

      setRotationDetectionLoading((prev) => ({
        ...prev,
        [videoId]: false,
      }));

      videoElement.remove();
    };

    videoElement.onerror = () => {
      clearTimeout(timeout);
      setRotationDetectionLoading((prev) => ({
        ...prev,
        [videoId]: false,
      }));
      videoElement.remove();
    };
  };

  // NEW FUNCTION: Get rotation class for video
  const getRotationClass = (item, type) => {
    if (type !== "videos") return "";

    const videoId = item.so_media_id;
    const rotation = videoRotations[videoId];

    // If rotation detected, return appropriate class
    if (rotation === 90) return "video-rotate-90";
    if (rotation === 270) return "video-rotate-270";
    if (rotation === 180) return "video-rotate-180";

    return "";
  };

  // NEW FUNCTION: Manually toggle rotation for a video
  const toggleRotation = (item, type) => {
    if (type !== "videos") return;

    const videoId = item.so_media_id;
    const currentRotation = videoRotations[videoId] || 0;

    // Cycle through rotations: 0 -> 90 -> 270 -> 180 -> 0
    let newRotation = 0;
    if (currentRotation === 0) newRotation = 90;
    else if (currentRotation === 90) newRotation = 270;
    else if (currentRotation === 270) newRotation = 180;
    else if (currentRotation === 180) newRotation = 0;

    setVideoRotations((prev) => ({
      ...prev,
      [videoId]: newRotation,
    }));
  };

  // Toggle section visibility (only for "all" view)
  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get file URL based on type (updated for B2)
  const getFileUrl = (item, type) => {
    // For videos, use video_url_proxy if available
    if (type === "videos") {
      if (item.video_url_proxy) {
        return `${import.meta.env.VITE_API_URL}${item.video_url_proxy}`;
      }
      if (item.media_url) {
        return `${import.meta.env.VITE_API_URL}/api/b2-files/${item.media_url}`;
      }
    }

    // For other types, use the existing logic
    // Priority: proxy_url -> preview_url -> public_url -> direct_url -> legacy
    if (item.proxy_url) {
      return `${import.meta.env.VITE_API_URL}${item.proxy_url}`;
    } else if (item.preview_url) {
      return `${import.meta.env.VITE_API_URL}${item.preview_url}`;
    } else if (item.public_url) {
      return item.public_url;
    } else if (item.direct_url) {
      return item.direct_url;
    } else {
      // Legacy fallback
      const baseUrl = import.meta.env.VITE_API_URL;
      const path =
        item.media_url ||
        item.image_url ||
        item.tech_pack_url ||
        item.folder_url;

      if (path && path.startsWith("http")) {
        return path;
      } else if (path) {
        // Use B2 proxy endpoint
        return `${baseUrl}/api/b2-files/${path}`;
      }
    }

    return "";
  };

  // Get download URL (direct B2 link)
  const getDownloadUrl = (item) => {
    if (item.public_url) {
      return item.public_url;
    }
    if (item.direct_url) {
      return item.direct_url;
    }
    return getFileUrl(item);
  };

  // Get file name based on type
  const getFileName = (item, type) => {
    if (item.file_name) return item.file_name;
    if (item.original_filename) return item.original_filename;

    const path =
      item.media_url || item.image_url || item.tech_pack_url || item.folder_url;
    return path?.split("/").pop() || "file";
  };

  // Handle file download/view
  const handleFileAction = (item, type) => {
    const fileUrl = getFileUrl(item, type);
    const fileName = getFileName(item, type);

    // For images and videos, open in new tab for viewing
    if (type === "images" || type === "videos") {
      window.open(fileUrl, "_blank");
    } else {
      // For documents and tech packs, trigger download
      const downloadUrl = getDownloadUrl(item);
      const link = document.createElement("a");
      link.href = downloadUrl || fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Generic delete function for all media types
  const handleDelete = async (id, type, fileName) => {
    const typeNames = {
      videos: "video",
      images: "image",
      techPacks: "tech pack",
      folders: "document",
    };

    const result = await Swal.fire({
      title: `Delete ${typeNames[type]}?`,
      text: `Are you sure you want to delete "${fileName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setDeletingId(id);
    setDeletingType(type);

    try {
      let endpoint = "";
      switch (type) {
        case "videos":
          endpoint = `deleteVideo/${id}`;
          break;
        case "images":
          endpoint = `deleteImage/${id}`;
          break;
        case "techPacks":
          endpoint = `deleteTechPack/${id}`;
          break;
        case "folders":
          endpoint = `deleteFolderFile/${id}`;
          break;
        default:
          return;
      }

      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/subOperationMedia/${endpoint}`,
        { withCredentials: true },
      );

      if (response.data.success) {
        // Refresh the specific media type
        await fetchSpecificMedia(subOpId, type);

        let successMessage = `${
          typeNames[type].charAt(0).toUpperCase() + typeNames[type].slice(1)
        } has been deleted from cloud storage.`;
        if (response.data.warning) {
          successMessage += ` (Note: ${response.data.warning})`;
        }

        Swal.fire({
          title: "Deleted!",
          text: successMessage,
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.data.message || "Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);

      let errorMessage = `Failed to delete ${typeNames[type]}. Please try again.`;
      if (error.response?.data?.warning) {
        errorMessage = error.response.data.warning;
      }

      Swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setDeletingId(null);
      setDeletingType(null);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get file icon based on type and extension
  const getFileIcon = (item, type) => {
    const fileName = getFileName(item, type).toLowerCase();

    if (type === "images")
      return <FaImage className="text-2xl text-blue-500" />;
    if (type === "techPacks") {
      if (fileName.includes(".pdf"))
        return <FaFileExcel className="text-2xl text-red-500" />;
      return <FaFileExcel className="text-2xl text-green-500" />;
    }
    if (type === "folders") {
      if (fileName.includes(".pdf"))
        return <FaFileExcel className="text-2xl text-red-500" />;
      if (fileName.includes(".doc"))
        return <FaFileExcel className="text-2xl text-blue-600" />;
      return <FaFolder className="text-2xl text-orange-500" />;
    }
    // For videos
    return <FaPlay className="text-2xl text-red-500" />;
  };

  // Get emoji icon for empty state
  const getEmojiIcon = (type) => {
    switch (type) {
      case "videos":
        return "🎥";
      case "images":
        return "🖼️";
      case "techPacks":
        return "📊";
      case "folders":
        return "📁";
      default:
        return "📄";
    }
  };

  // Get action icon based on file type
  const getActionIcon = (type) => {
    if (type === "images" || type === "videos") {
      return <FaExternalLinkAlt className="text-sm" />;
    }
    return <FaDownload className="text-sm" />;
  };

  // Get action text based on file type
  const getActionText = (type) => {
    if (type === "images" || type === "videos") {
      return "View";
    }
    return "Download";
  };

  // Render media grid component
  const renderMediaGrid = (items, type, loading) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <BeatLoader color="#3b82f6" size={15} />
            <p className="mt-4 text-gray-600">
              Loading {type} from cloud storage...
            </p>
          </div>
        </div>
      );
    }

    if (!items || items.length === 0) {
      const emptyStates = {
        videos: {
          icon: getEmojiIcon("videos"),
          title: "No videos available",
          description:
            "There are no videos uploaded for this sub-operation yet.",
        },
        images: {
          icon: getEmojiIcon("images"),
          title: "No images available",
          description:
            "There are no images uploaded for this sub-operation yet.",
        },
        techPacks: {
          icon: getEmojiIcon("techPacks"),
          title: "No tech packs available",
          description:
            "There are no tech packs uploaded for this sub-operation yet.",
        },
        folders: {
          icon: getEmojiIcon("folders"),
          title: "No documents available",
          description:
            "There are no documents uploaded for this sub-operation yet.",
        },
      };

      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl shadow-sm">
          <div className="text-gray-400 mb-4 text-6xl">
            {emptyStates[type].icon}
          </div>
          <h3 className="text-xl font-medium text-gray-600 mb-2">
            {emptyStates[type].title}
          </h3>
          <p className="text-gray-500 max-w-md">
            {emptyStates[type].description}
          </p>
          <button
            onClick={() => fetchSpecificMedia(subOpId, type)}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => {
          const fileName = getFileName(item, type);
          const itemId =
            item[
              `so_${
                type === "videos"
                  ? "media"
                  : type === "images"
                    ? "img"
                    : type === "techPacks"
                      ? "tech"
                      : "folder"
              }_id`
            ];

          const rotationClass = getRotationClass(item, type);
          const isRotating = rotationDetectionLoading[itemId];

          return (
            <motion.div
              key={itemId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              {/* Media Preview */}
              <div className="relative w-full aspect-video bg-gradient-to-br from-gray-50 to-gray-100 group">
                {type === "videos" ? (
                  <div className={`w-full h-full ${rotationClass}`}>
                    <Plyr
                      source={{
                        type: "video",
                        title: item.sub_operation_name || "Video",
                        sources: [
                          {
                            src: getFileUrl(item, type),
                            type: "video/mp4",
                          },
                        ],
                      }}
                      options={{
                        controls: [
                          "play-large",
                          "progress",
                          "current-time",
                          "duration",
                          "mute",
                          "pip",
                          "fullscreen",
                        ],
                        seekTime: 5,
                        keyboard: {
                          focused: true,
                          global: true,
                          seekStep: 5,
                        },
                        ratio: "16:9",
                        clickToPlay: true,
                        hideControls: false,
                        resetOnEnd: false,
                        tooltips: {
                          controls: true,
                          seek: true,
                        },
                        disableContextMenu: true,
                      }}
                    />
                  </div>
                ) : type === "images" ? (
                  // Clickable image preview
                  <button
                    onClick={() => handleFileAction(item, type)}
                    className="w-full h-full flex items-center justify-center hover:from-gray-100 hover:to-gray-200 transition-all"
                  >
                    <img
                      src={getFileUrl(item, type)}
                      alt={item.sub_operation_name || "Image"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = "none";
                        // Show fallback icon
                        const fallback =
                          e.target.parentElement.querySelector(
                            ".image-fallback",
                          );
                        if (fallback) fallback.classList.remove("hidden");
                      }}
                    />
                    <div className="image-fallback hidden flex-col items-center justify-center text-gray-400">
                      {getFileIcon(item, type)}
                      <span className="text-xs mt-2">Click to view</span>
                    </div>
                  </button>
                ) : (
                  // Document/File preview
                  <button
                    onClick={() => handleFileAction(item, type)}
                    className="w-full h-full flex flex-col items-center justify-center hover:from-gray-100 hover:to-gray-200 transition-all"
                  >
                    {getFileIcon(item, type)}
                    <span className="text-xs text-gray-500 mt-2 text-center px-2 line-clamp-2">
                      {fileName}
                    </span>

                    {/* Cloud storage indicator */}
                    <div className="mt-2 text-xs bg-black bg-opacity-70 text-white px-2 py-1 rounded-full flex items-center gap-1">
                      <FaCloud className="text-xs" />
                      <span>B2</span>
                    </div>
                  </button>
                )}

                {/* Rotation toggle button for videos */}
                {type === "videos" && (
                  <button
                    onClick={() => toggleRotation(item, type)}
                    disabled={isRotating}
                    className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-90 transition-all z-10 disabled:opacity-50"
                    title="Toggle rotation"
                  >
                    {isRotating ? (
                      <BeatLoader size={5} color="#ffffff" />
                    ) : (
                      <FaRedoAlt
                        className={`text-sm ${rotationClass ? "text-green-400" : ""}`}
                      />
                    )}
                  </button>
                )}

                {/* Loading indicator for deletion */}
                {deletingId === itemId && deletingType === type && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
                    <BeatLoader color="#ffffff" size={10} />
                    <span className="ml-2 text-white text-sm">Deleting...</span>
                  </div>
                )}
              </div>

              {/* Media details */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                  {item.sub_operation_name || `Untitled ${type.slice(0, -1)}`}
                </h3>

                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">File:</span>
                    <span
                      className="text-xs font-mono truncate max-w-[120px]"
                      title={fileName}
                    >
                      {fileName}
                    </span>
                  </div>
                  {item.file_size && (
                    <div className="flex justify-between">
                      <span className="font-medium">Size:</span>
                      <span>
                        {item.file_size_formatted ||
                          formatFileSize(item.file_size)}
                      </span>
                    </div>
                  )}
                  {item.file_type && (
                    <div className="flex justify-between">
                      <span className="font-medium">Type:</span>
                      <span className="text-xs uppercase">
                        {item.file_type.split("/")[1] || item.file_type}
                      </span>
                    </div>
                  )}

                  {/* Rotation indicator for videos */}
                  {type === "videos" && videoRotations[itemId] && (
                    <div className="flex justify-between">
                      <span className="font-medium">Rotation:</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {videoRotations[itemId]}° fixed
                      </span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                    Uploaded: {formatDate(item.createdAt)}
                  </div>

                  <div className="flex gap-2">
                    {/* View/Download button */}
                    <button
                      onClick={() => handleFileAction(item, type)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-sm px-2 py-1 rounded hover:bg-blue-50"
                      title={getActionText(type)}
                    >
                      {getActionIcon(type)}
                    </button>

                    {/* Download button for non-viewable files */}
                    {(type === "techPacks" || type === "folders") && (
                      <button
                        onClick={() => {
                          const downloadUrl = getDownloadUrl(item);
                          const link = document.createElement("a");
                          link.href = downloadUrl || getFileUrl(item, type);
                          link.download = fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors text-sm px-2 py-1 rounded hover:bg-green-50"
                        title="Download"
                      >
                        <FaDownload className="text-sm" />
                      </button>
                    )}

                    {/* Delete button (Admin only) */}
                    {userRole === "Admin" && (
                      <button
                        onClick={() => handleDelete(itemId, type, fileName)}
                        disabled={
                          deletingId === itemId && deletingType === type
                        }
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm px-2 py-1 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <FaTrash size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Section component for "all" view
  const MediaSection = ({ title, type, icon, count }) => (
    <div className="mb-8">
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <h1 className="text-xl font-semibold">{title}</h1>
          <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
            {count}
          </span>
        </div>
        <div className="h-1 flex-grow mx-4 bg-gradient-to-r from-white via-gray-300 to-white"></div>
        <button
          onClick={() => toggleSection(type)}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <MdOutlineArrowDropDownCircle
            className={`text-2xl text-gray-400 ${
              openSections[type] ? "rotate-180" : ""
            } duration-300`}
          />
        </button>
      </div>

      <AnimatePresence>
        {openSections[type] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderMediaGrid(mediaData[type], type, loadingStates[type])}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // If showing only one media type, render single section
  if (currentMediaType !== "all") {
    const typeConfig = {
      videos: {
        title: "Videos",
        icon: <FaPlay className="text-red-500" />,
        type: "videos",
      },
      images: {
        title: "Images",
        icon: <FaImage className="text-blue-500" />,
        type: "images",
      },
      techPacks: {
        title: "Tech Packs",
        icon: <FaFileExcel className="text-green-500" />,
        type: "techPacks",
      },
      folders: {
        title: "Documents",
        icon: <FaFolder className="text-orange-500" />,
        type: "folders",
      },
    };

    const config = typeConfig[currentMediaType];

    return (
      <div className="px-4 md:px-8 lg:px-16 xl:px-32 min-h-screen bg-gray-50 py-8">
        {/* Page header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            className="text-blue-600 font-medium flex items-center gap-2 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft />
            <span>Go back</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
              <FaCloud className="text-blue-500" />
              <span>
                Total {config.title}: {mediaData[config.type].length}
              </span>
              {mediaData[config.type].length > 0 && (
                <span className="text-xs text-gray-400">
                  (
                  {formatFileSize(
                    mediaData[config.type].reduce(
                      (sum, item) => sum + (item.file_size || 0),
                      0,
                    ),
                  )}
                  )
                </span>
              )}
            </div>

            <button
              onClick={() => fetchSpecificMedia(subOpId, config.type)}
              disabled={loadingStates[config.type]}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 px-3 py-1 rounded hover:bg-blue-50 flex items-center gap-2"
            >
              {loadingStates[config.type] ? (
                <BeatLoader size={5} color="#3b82f6" />
              ) : (
                "Refresh"
              )}
            </button>
          </div>
        </div>

        {/* Single media section */}
        <div className="mb-8">
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {config.icon}
              <h1 className="text-2xl font-bold">{config.title} Gallery</h1>
              <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                {mediaData[config.type].length}{" "}
                {mediaData[config.type].length === 1 ? "file" : "files"}
              </span>
              {subOpId && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  SubOp ID: {subOpId}
                </div>
              )}
            </div>
          </div>

          {renderMediaGrid(
            mediaData[config.type],
            config.type,
            loadingStates[config.type],
          )}
        </div>
      </div>
    );
  }

  // Show all media types
  return (
    <div className="px-4 md:px-8 lg:px-16 xl:px-32 min-h-screen bg-gray-50 py-8">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <button
          className="text-blue-600 font-medium flex items-center gap-2 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft />
          <span>Go back</span>
        </button>

        <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
          <FaCloud className="text-blue-500" />
          <span>Total: {Object.values(mediaData).flat().length} files</span>
        </div>
      </div>

      {/* All Media Sections */}
      <MediaSection
        title="Videos"
        type="videos"
        icon={<FaPlay className="text-red-500" />}
        count={mediaData.videos.length}
      />

      <MediaSection
        title="Images"
        type="images"
        icon={<FaImage className="text-blue-500" />}
        count={mediaData.images.length}
      />

      <MediaSection
        title="Tech Packs"
        type="techPacks"
        icon={<FaFileExcel className="text-green-500" />}
        count={mediaData.techPacks.length}
      />

      <MediaSection
        title="Documents"
        type="folders"
        icon={<FaFolder className="text-orange-500" />}
        count={mediaData.folders.length}
      />

      {/* Add CSS for rotation */}
      <style jsx>{`
        .video-rotate-90 {
          transform: rotate(90deg);
          transform-origin: center center;
          width: 100%;
          height: 100%;
        }

        .video-rotate-180 {
          transform: rotate(180deg);
          transform-origin: center center;
          width: 100%;
          height: 100%;
        }

        .video-rotate-270 {
          transform: rotate(270deg);
          transform-origin: center center;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default MediaGallery;
  