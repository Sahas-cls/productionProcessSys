import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaFileExcel,
  FaTrash,
  FaDownload,
  FaArrowLeft,
  FaCloud,
  FaExternalLinkAlt,
  FaFilePdf,
  FaFileWord,
  FaFileCsv,
  FaTag, // Added for style tag
} from "react-icons/fa";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
const TechPackGallery = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.userRole;
  const params = useParams();

  const [techPacks, setTechPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [styleId, setStyleId] = useState(null);
  const [styleNo, setStyleNo] = useState("");

  useEffect(() => {
    // Get style info from location state
    const styleId = location.state?.styleId;
    const styleNo = location.state?.styleNo;

    if (styleId) {
      setStyleId(styleId);
      setStyleNo(styleNo || "");
      fetchStyleTechPacks(styleId);
    } else {
      Swal.fire({
        title: "Missing Information",
        text: "Style information is required to view tech packs",
        icon: "error",
        confirmButtonText: "Go Back",
      }).then(() => navigate(-1));
    }
  }, [location]);

  const fetchStyleTechPacks = async (id) => {
    // Renamed function
    setLoading(true);
    try {
      const response = await axios.get(
        `${
          import.meta.env.VITE_API_URL
        }/api/subOperationMedia/getStyleTechPacks/${id}`, // Changed endpoint
        { withCredentials: true },
      );

      console.log("response: ", response);

      if (response.data.success) {
        setTechPacks(response.data.data || []);
        console.log(
          `✅ Loaded ${
            response.data.data?.length || 0
          } style tech packs from Backblaze B2`,
        );
      } else {
        throw new Error(response.data.message || "Failed to load tech packs");
      }
    } catch (error) {
      console.error("❌ Error fetching style tech packs:", error);

      let errorMessage = "Failed to load tech packs";
      if (error.response?.status === 404) {
        errorMessage = "No tech packs found for this style";
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid style ID";
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

  // Get the best URL for the tech pack
  const getTechPackUrl = (item) => {
    const baseUrl = import.meta.env.VITE_API_URL;

    if (item.proxy_url) {
      return `${baseUrl}${item.proxy_url}`;
    } else if (item.preview_url) {
      return `${baseUrl}${item.preview_url}`;
    } else if (item.public_url) {
      return item.public_url;
    } else if (item.direct_url) {
      return item.direct_url;
    } else if (item.tech_pack_url) {
      if (item.tech_pack_url.startsWith("http")) {
        return item.tech_pack_url;
      }
      return `${baseUrl}/api/b2-files/${item.tech_pack_url}`;
    }

    return "";
  };

  // Get URL for download
  const getDownloadUrl = (item) => {
    if (item.public_url) {
      return item.public_url;
    }
    if (item.direct_url) {
      return item.direct_url;
    }
    return getTechPackUrl(item);
  };

  const getFileName = (item) => {
    return (
      item.file_name ||
      item.original_filename ||
      item.tech_pack_url?.split("/").pop() ||
      "techpack.xlsx"
    );
  };

  const getFileIcon = (item) => {
    if (item.file_icon) return item.file_icon;

    const fileName = getFileName(item).toLowerCase();
    if (fileName.includes(".xlsx") || fileName.includes(".xls")) {
      return "📊";
    } else if (fileName.includes(".pdf")) {
      return "📕";
    } else if (fileName.includes(".doc")) {
      return "📘";
    } else if (fileName.includes(".csv")) {
      return "📑";
    } else if (
      fileName.includes(".zip") ||
      fileName.includes(".rar") ||
      fileName.includes(".7z")
    ) {
      return "🗜️";
    }
    return "📄";
  };

  const getFileIconComponent = (item) => {
    const fileName = getFileName(item).toLowerCase();
    if (fileName.includes(".xlsx") || fileName.includes(".xls")) {
      return <FaFileExcel className="text-green-600 text-2xl" />;
    } else if (fileName.includes(".pdf")) {
      return <FaFilePdf className="text-red-600 text-2xl" />;
    } else if (fileName.includes(".doc")) {
      return <FaFileWord className="text-blue-600 text-2xl" />;
    } else if (fileName.includes(".csv")) {
      return <FaFileCsv className="text-green-700 text-2xl" />;
    }
    return <FaFileExcel className="text-gray-600 text-2xl" />;
  };

  const handleDownload = (item) => {
    const downloadUrl = getDownloadUrl(item);
    const fileName = getFileName(item);

    if (downloadUrl) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Swal.fire({
        title: "Error",
        text: "Cannot download tech pack - URL not available",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handlePreview = (item) => {
    const techPackUrl = getTechPackUrl(item);

    if (techPackUrl) {
      window.open(techPackUrl, "_blank");
    } else {
      Swal.fire({
        title: "Error",
        text: "Cannot preview tech pack - URL not available",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handleDelete = async (id, fileName) => {
    const result = await Swal.fire({
      title: "Delete style tech pack?",
      text: `Are you sure you want to delete "${fileName}"? This will remove it for all operations in this style.`,
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
        }/api/subOperationMedia/deleteTechPack/${id}`,
        { withCredentials: true },
      );

      if (response.data.success) {
        await fetchStyleTechPacks(styleId);

        let successMessage =
          "Style tech pack has been deleted from cloud storage.";
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

      let errorMessage = "Failed to delete tech pack. Please try again.";
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
    if (styleId) {
      fetchStyleTechPacks(styleId);
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
          {/* Style Info Badge */}
          <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
            <FaTag className="text-purple-500" />
            <span>Style: {styleNo || `ID: ${styleId}`}</span>
          </div>

          <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
            <FaCloud className="text-blue-500" />
            <span>Style Tech Packs: {techPacks.length}</span>
            {techPacks.length > 0 && (
              <span className="text-xs text-gray-400">
                (
                {formatFileSize(
                  techPacks.reduce((sum, tp) => sum + (tp.file_size || 0), 0),
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

      {/* Tech Packs Section */}
      <div className="mb-8">
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaFileExcel className="text-green-500 text-2xl" />
            <h1 className="text-2xl font-bold">Style Tech Pack Gallery</h1>{" "}
            {/* Updated title */}
            <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
              {techPacks.length} {techPacks.length === 1 ? "file" : "files"}
            </span>
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Style ID: {styleId}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <BeatLoader color="#3b82f6" size={15} />
              <p className="mt-4 text-gray-600">
                Loading style tech packs from cloud storage...
              </p>
            </div>
          </div>
        ) : !techPacks || techPacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl shadow-sm">
            <div className="text-gray-400 mb-4 text-6xl">
              <FaCloud />
            </div>
            <h3 className="text-xl font-medium text-gray-600 mb-2">
              No style tech packs found
            </h3>
            <p className="text-gray-500 max-w-md mb-4">
              There are no tech packs uploaded for style {styleNo || styleId}{" "}
              yet. Tech packs uploaded here are available for all operations in
              this style.
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
            {techPacks.map((item) => {
              const fileName = getFileName(item);
              const fileIcon = getFileIcon(item);
              const FileIconComponent = getFileIconComponent(item);

              return (
                <motion.div
                  key={item.so_tech_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative w-full aspect-video bg-gradient-to-br from-gray-50 to-gray-100 group">
                    <button
                      onClick={() => handlePreview(item)}
                      className="w-full h-full flex flex-col items-center justify-center hover:from-gray-100 hover:to-gray-200 transition-all"
                    >
                      <div className="text-4xl mb-2">{fileIcon}</div>
                      <div className="flex items-center justify-center">
                        {FileIconComponent}
                      </div>
                      <span className="text-xs text-gray-500 mt-2 text-center px-2 line-clamp-2">
                        {fileName}
                      </span>

                      {/* Style-level indicator */}
                      <div className="mt-2 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <FaTag className="text-xs" />
                        <span>Style-Level</span>
                      </div>
                    </button>

                    {/* Cloud storage indicator */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <FaCloud className="text-xs" />
                      <span>B2</span>
                    </div>

                    {deletingId === item.so_tech_id && (
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
                      {fileName}
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
                      <div className="flex justify-between">
                        <span className="font-medium">Scope:</span>
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          Style-Level
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                        Uploaded: {formatDate(item.createdAt)}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(item)}
                          className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors text-sm px-2 py-1 rounded hover:bg-green-50"
                          title="Download"
                        >
                          <FaDownload className="text-sm" />
                        </button>

                        {userRole === "Admin" || userRole === "SuperAdmin" ? (
                          <button
                            onClick={() =>
                              handleDelete(item.so_tech_id, fileName)
                            }
                            disabled={deletingId === item.so_tech_id}
                            className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm px-2 py-1 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <FaTrash size={12} />
                          </button>
                        ) : null}
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

export default TechPackGallery;
