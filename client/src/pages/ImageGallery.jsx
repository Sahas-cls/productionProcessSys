import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaImage,
  FaTrash,
  FaExternalLinkAlt,
  FaArrowLeft,
  FaCloud,
  FaDownload,
} from "react-icons/fa";
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
  const params = useParams();

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [subOpId, setSubOpId] = useState(null);

  useEffect(() => {
    // Get subOpId from params, location state, or URL query
    const id =
      params.subOpId ||
      location.state?.subOpId ||
      new URLSearchParams(location.search).get("subOpId");

    if (id) {
      setSubOpId(id);
      fetchImages(id);
    } else {
      Swal.fire({
        title: "Missing Parameter",
        text: "Sub-operation ID is required to view images",
        icon: "error",
        confirmButtonText: "Go Back",
      }).then(() => navigate(-1));
    }
  }, [location, params]);

  const fetchImages = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/subOperationMedia/getImages/${id}`,
        { withCredentials: true },
      );

      if (response.data.success) {
        setImages(response.data.data || []);
        console.log(
          `✅ Loaded ${response.data.data?.length || 0} images from local storage`,
        );
      } else {
        throw new Error(response.data.message || "Failed to load images");
      }
    } catch (error) {
      console.error("❌ Error fetching images:", error);

      let errorMessage = "Failed to load images";
      if (error.response?.status === 404) {
        errorMessage = "No images found for this sub-operation";
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid sub-operation ID";
      }

      Swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get the best URL for the image - prefers proxy URL for security
  const getImageUrl = (item) => {
    const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, "");

    console.log(`🔍 Getting URL for image ${item.so_img_id}:`, {
      image_url: item.image_url,
      original_filename: item.original_filename,
    });

    // If the backend already returned a full URL, use it
    if (item.image_url && item.image_url.startsWith("http")) {
      console.log(`✅ Using existing full URL:`, item.image_url);
      return item.image_url;
    }

    // Extract filename from image_url
    let filename = item.image_url;
    if (filename && (filename.includes("/") || filename.includes("\\"))) {
      filename = filename.split(/[\/\\]/).pop();
    }

    if (!filename) {
      // Fallback to original_filename if image_url is empty
      filename = item.original_filename;
    }

    if (!filename) {
      console.warn(`⚠️ No filename found for image ${item.so_img_id}`);
      return "";
    }

    // Encode the filename for URL
    const encodedFilename = encodeURIComponent(filename);

    // Construct the new local image URL
    const imageUrl = `${baseUrl}/images/${encodedFilename}`;

    console.log(`✅ Generated local image URL:`, imageUrl);
    return imageUrl;
  };

  // Get URL for download (use same as view URL)
  const getDownloadUrl = (item) => {
    return getImageUrl(item);
  };

  // Get URL for download (direct B2 link)
  // const getDownloadUrl = (item) => {
  //   if (item.public_url) {
  //     return item.public_url;
  //   }
  //   if (item.direct_url) {
  //     return item.direct_url;
  //   }
  //   return getImageUrl(item);
  // };

  const getFileName = (item) => {
    return (
      item.original_filename || item.image_url?.split("/").pop() || "image.jpg"
    );
  };

  const handleViewImage = (item) => {
    const imageUrl = getImageUrl(item);
    if (imageUrl) {
      window.open(imageUrl, "_blank");
    } else {
      Swal.fire({
        title: "Error",
        text: "Cannot open image - URL not available",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handleDownload = (item) => {
    const downloadUrl = getDownloadUrl(item);
    const fileName = getFileName(item);

    if (downloadUrl) {
      // Create a temporary link for download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Swal.fire({
        title: "Error",
        text: "Cannot download image - URL not available",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
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
        `${
          import.meta.env.VITE_API_URL
        }/api/subOperationMedia/deleteImage/${id}`,
        { withCredentials: true },
      );

      if (response.data.success) {
        await fetchImages(subOpId);
        Swal.fire({
          title: "Deleted!",
          text: "Image has been deleted from cloud storage.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.data.message || "Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);

      let errorMessage = "Failed to delete image. Please try again.";
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

  const handleRefresh = () => {
    if (subOpId) {
      fetchImages(subOpId);
    }
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
          <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
            <FaCloud className="text-blue-500" />
            <span>Total Images: {images.length}</span>
            {images.length > 0 && (
              <span className="text-xs text-gray-400">
                (
                {formatFileSize(
                  images.reduce((sum, img) => sum + (img.file_size || 0), 0),
                )}
                )
              </span>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 px-3 py-1 rounded hover:bg-blue-50 flex items-center gap-2"
          >
            {loading ? <BeatLoader size={5} color="#3b82f6" /> : "Refresh"}
          </button>
        </div>
      </div>

      {/* Images Section */}
      <div className="mb-8">
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaImage className="text-blue-500 text-2xl" />
            <h1 className="text-2xl font-bold">Image Gallery</h1>
            <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
              {images.length} {images.length === 1 ? "image" : "images"}
            </span>
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              SubOp ID: {subOpId}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <BeatLoader color="#3b82f6" size={15} />
              <p className="mt-4 text-gray-600">
                Loading images from cloud storage...
              </p>
            </div>
          </div>
        ) : !images || images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl shadow-sm">
            <div className="text-gray-400 mb-4 text-6xl">
              <FaCloud />
            </div>
            <h3 className="text-xl font-medium text-gray-600 mb-2">
              No images found
            </h3>
            <p className="text-gray-500 max-w-md mb-4">
              There are no images uploaded for sub-operation {subOpId} yet.
            </p>
            <button
              onClick={handleRefresh}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Check again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((item) => {
              const imageUrl = getImageUrl(item);
              const fileName = getFileName(item);

              return (
                <motion.div
                  key={item.so_img_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative w-full aspect-video bg-gray-50 group">
                    <button
                      onClick={() => handleViewImage(item)}
                      className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all"
                    >
                      {imageUrl ? (
                        // In your ImageGallery component, update the img tag:
                        <img
                          src={imageUrl}
                          alt={item.sub_operation_name || fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          crossOrigin="anonymous" // Add this attribute
                          onError={(e) => {
                            console.error(
                              `❌ Failed to load image: ${imageUrl}`,
                            );
                            e.target.style.display = "none";
                            const fallback =
                              e.target.parentElement.querySelector(
                                ".image-fallback",
                              );
                            if (fallback) {
                              fallback.classList.remove("hidden");
                              fallback.innerHTML = `
      <div class="text-center p-2">
        <FaImage class="text-4xl text-blue-500 mb-2 mx-auto" />
        <div class="text-xs text-gray-600">Image failed to load</div>
        <button 
          onclick="window.open('${imageUrl}', '_blank')"
          class="mt-2 text-xs text-blue-500 hover:text-blue-700 underline"
        >
          Open in new tab
        </button>
      </div>
    `;
                            }
                          }}
                          onLoad={(e) => {
                            console.log(
                              `✅ Successfully loaded image: ${imageUrl}`,
                            );
                          }}
                        />
                      ) : null}

                      {/* Fallback when image fails to load */}
                      <div className="image-fallback hidden flex-col items-center justify-center text-gray-400 p-4">
                        <FaImage className="text-4xl text-blue-500 mb-2" />
                        <span className="text-sm">Image Preview</span>
                        <span className="text-xs mt-1">Click to view</span>
                      </div>

                      {/* Cloud storage indicator */}
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <FaImage className="text-xs" />
                        <span>Local</span>
                      </div>
                    </button>

                    {deletingId === item.so_img_id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
                        <BeatLoader color="#ffffff" size={10} />
                        <span className="ml-2 text-white text-sm">
                          Deleting...
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                      {item.sub_operation_name || "Untitled Image"}
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
                          <span>{formatFileSize(item.file_size)}</span>
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
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                        Uploaded: {formatDate(item.createdAt)}
                      </div>

                      <div className="flex gap-2">
                        {/* <button
                          onClick={() => handleDownload(item)}
                          className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors text-sm px-2 py-1 rounded hover:bg-green-50"
                          title="Download"
                        >
                          <FaDownload className="text-sm" />
                        </button> */}

                        <button
                          onClick={() => handleViewImage(item)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-sm px-2 py-1 rounded hover:bg-blue-50"
                          title="View Full Size"
                        >
                          <FaExternalLinkAlt className="text-sm" />
                        </button>

                        {userRole === "Admin" && (
                          <button
                            onClick={() =>
                              handleDelete(item.so_img_id, fileName)
                            }
                            disabled={deletingId === item.so_img_id}
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
        )}
      </div>
    </div>
  );
};

export default ImageGallery;
