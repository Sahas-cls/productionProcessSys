import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const { user, loading } = useAuth();
  const userRole = user?.userRole;
  const location = useLocation();
  const navigate = useNavigate();

  // State management
  const [deletingId, setDeletingId] = useState(null);
  const [deletingType, setDeletingType] = useState(null);
  const [openSections, setOpenSections] = useState({
    videos: false,
    images: false,
    techPacks: false,
    folders: false,
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

  const {
    isLoading: videosLoading,
    videosList,
    refreshVideos,
  } = useSubOpVideos(location.state.subOpId);

  // Fetch all media types
  useEffect(() => {
    if (location.state?.subOpId) {
      fetchAllMedia();
    }
  }, [location.state?.subOpId]);

  const fetchAllMedia = async () => {
    const subOpId = location.state.subOpId;

    try {
      setLoadingStates((prev) => ({
        ...prev,
        images: true,
        techPacks: true,
        folders: true,
      }));

      // Fetch videos
      const videoResponse = await axios.get(
        `${
          import.meta.env.VITE_API_URL
        }/api/subOperationMedia/getVideos/${subOpId}`,
        { withCredentials: true }
      );

      // Fetch images
      const imagesResponse = await axios.get(
        `${
          import.meta.env.VITE_API_URL
        }/api/subOperationMedia/getImages/${subOpId}`,
        { withCredentials: true }
      );

      // Fetch tech packs
      const techPacksResponse = await axios.get(
        `${
          import.meta.env.VITE_API_URL
        }/api/subOperationMedia/getTechPacks/${subOpId}`,
        { withCredentials: true }
      );

      // Fetch folders
      const foldersResponse = await axios.get(
        `${
          import.meta.env.VITE_API_URL
        }/api/subOperationMedia/getFolderDocuments/${subOpId}`,
        { withCredentials: true }
      );

      setMediaData({
        videos: videoResponse.data?.data || [],
        images: imagesResponse.data?.data || [],
        techPacks: techPacksResponse.data?.data || [],
        folders: foldersResponse.data?.data || [],
      });
    } catch (error) {
      console.error("Error fetching media:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load media files",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        images: false,
        techPacks: false,
        folders: false,
      }));
    }
  };

  // Update videos when videosList changes
  useEffect(() => {
    setMediaData((prev) => ({ ...prev, videos: videosList || [] }));
  }, [videosList]);

  // Toggle section visibility
  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get file URL based on type
  const getFileUrl = (item, type) => {
    const baseUrl = import.meta.env.VITE_API_URL;

    switch (type) {
      case "videos":
        return `${baseUrl}/videos/${item.media_url}`;
      case "images":
        return `${baseUrl}/subop-images/${item.image_url}`;
      case "techPacks":
        return `${baseUrl}/techpacks/${item.tech_pack_url}`;
      case "folders":
        return `${baseUrl}/documents/${item.folder_url}`;
      default:
        return "";
    }
  };

  // Get file name based on type
  const getFileName = (item, type) => {
    switch (type) {
      case "videos":
        return item.media_url;
      case "images":
        return item.image_url;
      case "techPacks":
        return item.tech_pack_url;
      case "folders":
        return item.folder_url;
      default:
        return "Unknown file";
    }
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
      const link = document.createElement("a");
      link.href = fileUrl;
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
          endpoint = `deleteFolderDocument/${id}`;
          break;
        default:
          return;
      }

      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/subOperationMedia/${endpoint}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        // Refresh the specific media type
        await fetchAllMedia();
        Swal.fire({
          title: "Deleted!",
          text: `${
            typeNames[type].charAt(0).toUpperCase() + typeNames[type].slice(1)
          } has been deleted.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      Swal.fire({
        title: "Error",
        text: `Failed to delete ${typeNames[type]}. Please try again.`,
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
    if (type === "images")
      return <FaImage className="text-2xl text-blue-500" />;
    if (type === "techPacks")
      return <FaFileExcel className="text-2xl text-green-500" />;
    if (type === "folders")
      return <FaFolder className="text-2xl text-orange-500" />;

    // For videos, use play icon
    return <FaPlay className="text-2xl text-red-500" />;
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
            <p className="mt-4 text-gray-600">Loading {type}...</p>
          </div>
        </div>
      );
    }

    if (!items || items.length === 0) {
      const emptyStates = {
        videos: {
          icon: "🎥",
          title: "No videos available",
          description:
            "There are no videos uploaded for this sub-operation yet.",
        },
        images: {
          icon: "🖼️",
          title: "No images available",
          description:
            "There are no images uploaded for this sub-operation yet.",
        },
        techPacks: {
          icon: "📊",
          title: "No tech packs available",
          description:
            "There are no tech packs uploaded for this sub-operation yet.",
        },
        folders: {
          icon: "📁",
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
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => {
          const fileUrl = getFileUrl(item, type);
          const fileName = getFileName(item, type);

          return (
            <div
              key={
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
                ]
              }
              className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              {/* Media Preview */}
              <div className="relative w-full aspect-video bg-gray-100 group">
                {type === "videos" ? (
                  <Plyr
                    source={{
                      type: "video",
                      title: item.sub_operation_name || "Video",
                      sources: [
                        {
                          src: fileUrl,
                          type: "video/webm",
                        },
                      ],
                    }}
                    options={{
                      controls: [
                        "play-large",
                        "play",
                        "progress",
                        "current-time",
                        "duration",
                        "mute",
                        "volume",
                        "settings",
                        "pip",
                        "fullscreen",
                        "rewind",
                        "fast-forward",
                      ],
                      ratio: "16:9",
                      clickToPlay: true,
                      tooltips: { controls: true, seek: true },
                      keyboard: { global: true },
                      seekTime: 10,
                      disableContextMenu: true,
                    }}
                  />
                ) : type === "images" ? (
                  // Clickable image preview
                  <button
                    onClick={() => handleFileAction(item, type)}
                    className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all"
                  >
                    <img
                      src={fileUrl}
                      alt={item.sub_operation_name || "Image"}
                      className="w-full h-full object-scale-down group-hover:scale-110 duration-150"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                    <div className="hidden flex-col items-center justify-center text-gray-400">
                      {getFileIcon(item, type)}
                      <span className="text-xs mt-2">Click to view</span>
                    </div>
                  </button>
                ) : (
                  // Document/File preview
                  <button
                    onClick={() => handleFileAction(item, type)}
                    className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all"
                  >
                    {getFileIcon(item, type)}
                    <span className="text-xs text-gray-500 mt-2 text-center px-2">
                      {getActionText(type)} {fileName}
                    </span>
                  </button>
                )}

                {/* Loading indicator for deletion */}
                {deletingId ===
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
                  ] &&
                  deletingType === type && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
                      <BeatLoader color="#ffffff" size={10} />
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
                    <span className="text-xs font-mono truncate max-w-[120px]">
                      {fileName}
                    </span>
                  </div>
                  {(item.file_size || type === "folders") && (
                    <div className="flex justify-between">
                      <span className="font-medium">Size:</span>
                      <span>{formatFileSize(item.file_size)}</span>
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
                    >
                      {getActionIcon(type)}
                      {getActionText(type)}
                    </button>

                    {/* Delete button (Admin only) */}
                    {userRole === "Admin" && (
                      <button
                        onClick={() =>
                          handleDelete(
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
                            ],
                            type,
                            fileName
                          )
                        }
                        disabled={
                          deletingId ===
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
                            ] && deletingType === type
                        }
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        <FaTrash size={12} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Section component
  const MediaSection = ({ title, type, icon, count }) => (
    <div className="mb-8">
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <h1 className="text-xl font-semibold">{title}</h1>
          <span className="bg-blue-100 text-blue-800 after: text-sm px-2 py-1 rounded-full ">
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

        <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
          Total: {Object.values(mediaData).flat().length} files
        </div>
      </div>

      {/* Media Sections */}
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
    </div>
  );
};

export default MediaGallery;
