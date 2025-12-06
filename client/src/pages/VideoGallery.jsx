import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaPlay, FaTrash, FaExternalLinkAlt, FaArrowLeft } from "react-icons/fa";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Plyr from "plyr-react";
import "plyr-react/plyr.css";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

const VideoGallery = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.userRole;
  
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch videos when component mounts
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
        { withCredentials: true }
      );
      setVideos(response.data?.data || []);
      console.log("📹 Videos loaded:", response.data);
    } catch (error) {
      console.error("Error fetching videos:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load videos from cloud storage",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to get video MIME type from extension
  const getVideoMimeType = (url) => {
    if (!url) return 'video/mp4';
    const ext = url.split('.').pop().toLowerCase();
    const mimeTypes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'mkv': 'video/x-matroska',
      'm4v': 'video/x-m4v',
    };
    return mimeTypes[ext] || 'video/mp4';
  };

  const getFileUrl = (item) => {
    // Use proxy URL from backend if available
    if (item.video_url_proxy) {
      const baseUrl = import.meta.env.VITE_API_URL || "";
      return `${baseUrl}${item.video_url_proxy}`;
    }
    
    // Fallback: construct proxy URL from B2 path
    if (item.media_url) {
      const baseUrl = import.meta.env.VITE_API_URL || "";
      return `${baseUrl}/api/b2-files/${item.media_url}`;
    }
    
    console.warn("No media_url found for video:", item);
    return "";
  };

  const getFileName = (item) => {
    // Use original filename if available
    if (item.original_filename) {
      return item.original_filename;
    }
    
    // Extract from B2 path like "SubOpVideos/123/filename.mp4"
    if (item.media_url) {
      const parts = item.media_url.split('/');
      return parts[parts.length - 1] || item.media_url;
    }
    
    return "Unknown video file";
  };

  const handleFileAction = (item) => {
    const fileUrl = getFileUrl(item);
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    } else {
      Swal.fire({
        title: "Error",
        text: "Video URL not available",
        icon: "error",
        timer: 3000,
      });
    }
  };

  const handleDelete = async (id, fileName) => {
    const result = await Swal.fire({
      title: "Delete video?",
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

    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/subOperationMedia/deleteVideo/${id}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        await fetchVideos();
        Swal.fire({
          title: "Deleted!",
          text: "Video has been deleted from cloud storage.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Failed to delete video from cloud storage.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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
          <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
            Total Videos: {videos.length}
          </div>
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            ☁️ Cloud Storage
          </div>
        </div>
      </div>

      {/* Videos Section */}
      <div className="mb-8">
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaPlay className="text-red-500 text-2xl" />
            <h1 className="text-2xl font-bold">Videos</h1>
            <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
              {videos.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <BeatLoader color="#3b82f6" size={15} />
              <p className="mt-4 text-gray-600">Loading videos from cloud...</p>
            </div>
          </div>
        ) : !videos || videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl shadow-sm">
            <div className="text-gray-400 mb-4 text-6xl">🎥</div>
            <h3 className="text-xl font-medium text-gray-600 mb-2">
              No videos available
            </h3>
            <p className="text-gray-500 max-w-md">
              There are no videos uploaded for this sub-operation yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((item) => {
              const fileUrl = getFileUrl(item);
              const fileName = getFileName(item);
              const mimeType = getVideoMimeType(fileUrl);

              return (
                <motion.div
                  key={item.so_media_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                >
                  {/* Video Preview */}
                  <div className="relative w-full aspect-video bg-gray-100">
                    {fileUrl ? (
                      <Plyr
                        source={{
                          type: "video",
                          title: item.sub_operation_name || "Video",
                          sources: [
                            {
                              src: fileUrl,
                              type: mimeType,
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
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-200">
                        <div className="text-center text-gray-500">
                          <FaPlay className="text-4xl mx-auto mb-2 opacity-50" />
                          <p>Video not available</p>
                        </div>
                      </div>
                    )}

                    {deletingId === item.so_media_id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
                        <BeatLoader color="#ffffff" size={10} />
                        <span className="ml-3 text-white text-sm">
                          Deleting from cloud...
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                      {item.sub_operation_name || "Untitled video"}
                    </h3>

                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">File:</span>
                        <span className="text-xs font-mono truncate max-w-[120px]" title={fileName}>
                          {fileName}
                        </span>
                      </div>
                      {item.file_size && (
                        <div className="flex justify-between">
                          <span className="font-medium">Size:</span>
                          <span>{formatFileSize(item.file_size)}</span>
                        </div>
                      )}
                      {item.file_type && (
                        <div className="flex justify-between">
                          <span className="font-medium">Type:</span>
                          <span className="text-xs">{item.file_type}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                        Uploaded: {formatDate(item.createdAt)}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFileAction(item)}
                          disabled={!fileUrl}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-sm px-2 py-1 rounded hover:bg-blue-50"
                          title={fileUrl ? "Open video" : "Video not available"}
                        >
                          <FaExternalLinkAlt className="text-sm" />
                          View
                        </button>

                        {userRole === "Admin" && (
                          <button
                            onClick={() => handleDelete(item.so_media_id, fileName)}
                            disabled={deletingId === item.so_media_id}
                            className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm px-2 py-1 rounded hover:bg-red-50"
                          >
                            <FaTrash size={12} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGallery;