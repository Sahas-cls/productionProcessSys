import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaImage, FaTrash, FaExternalLinkAlt, FaArrowLeft } from "react-icons/fa";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

const ImageGallery = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.userRole;
  
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (location.state?.subOpId) {
      fetchImages();
    }
  }, [location.state?.subOpId]);

  const fetchImages = async () => {
    const subOpId = location.state.subOpId;
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/subOperationMedia/getImages/${subOpId}`,
        { withCredentials: true }
      );
      setImages(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching images:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load images",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = (item) => {
    const baseUrl = import.meta.env.VITE_API_URL;
    return `${baseUrl}/subop-images/${item.image_url}`;
  };

  const getFileName = (item) => {
    return item.image_url;
  };

  const handleFileAction = (item) => {
    const fileUrl = getFileUrl(item);
    window.open(fileUrl, "_blank");
  };

  const handleDelete = async (id, fileName) => {
    const result = await Swal.fire({
      title: "Delete image?",
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
        `${import.meta.env.VITE_API_URL}/api/subOperationMedia/deleteImage/${id}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        await fetchImages();
        Swal.fire({
          title: "Deleted!",
          text: "Image has been deleted.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to delete image. Please try again.",
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

        <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
          Total Images: {images.length}
        </div>
      </div>

      {/* Images Section */}
      <div className="mb-8">
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaImage className="text-blue-500 text-2xl" />
            <h1 className="text-2xl font-bold">Images</h1>
            <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
              {images.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <BeatLoader color="#3b82f6" size={15} />
              <p className="mt-4 text-gray-600">Loading images...</p>
            </div>
          </div>
        ) : !images || images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl shadow-sm">
            <div className="text-gray-400 mb-4 text-6xl">🖼️</div>
            <h3 className="text-xl font-medium text-gray-600 mb-2">
              No images available
            </h3>
            <p className="text-gray-500 max-w-md">
              There are no images uploaded for this sub-operation yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((item) => {
              const fileUrl = getFileUrl(item);
              const fileName = getFileName(item);

              return (
                <motion.div
                  key={item.so_img_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative w-full aspect-video bg-gray-100 group">
                    <button
                      onClick={() => handleFileAction(item)}
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
                        <FaImage className="text-2xl text-blue-500" />
                        <span className="text-xs mt-2">Click to view</span>
                      </div>
                    </button>

                    {deletingId === item.so_img_id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
                        <BeatLoader color="#ffffff" size={10} />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                      {item.sub_operation_name || "Untitled image"}
                    </h3>

                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">File:</span>
                        <span className="text-xs font-mono truncate max-w-[120px]">
                          {fileName}
                        </span>
                      </div>
                      {item.file_size && (
                        <div className="flex justify-between">
                          <span className="font-medium">Size:</span>
                          <span>{formatFileSize(item.file_size)}</span>
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
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-sm px-2 py-1 rounded hover:bg-blue-50"
                        >
                          <FaExternalLinkAlt className="text-sm" />
                          View
                        </button>

                        {userRole === "Admin" && (
                          <button
                            onClick={() => handleDelete(item.so_img_id, fileName)}
                            disabled={deletingId === item.so_img_id}
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

export default ImageGallery;