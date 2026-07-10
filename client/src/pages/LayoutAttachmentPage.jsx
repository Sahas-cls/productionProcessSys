// LayoutAttachmentPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaFileExcel,
  FaTrash,
  FaDownload,
  FaArrowLeft,
  FaCloud,
  FaFilePdf,
  FaFileWord,
  FaFileCsv,
  FaTag,
  FaUpload,
} from "react-icons/fa";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { BsFillCloudUploadFill } from "react-icons/bs";
import TechPackUploader from "../components/TechPackUploader";

export const LayoutAttachmentPage = () => {
  const { styleId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.userRole;
  const apiUrl = import.meta.env.VITE_API_URL;

  // get style details
  const [style, setStyle] = useState([]);
  console.log("STYLE", style);
  const getStyle = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/styles/getStyle/${styleId}`,
        { withCredentials: true },
      );
      if (response.status == 200) {
        setStyle(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getStyle();
  }, []);

  // State for tech packs
  const [techPacks, setTechPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [styleNo, setStyleNo] = useState("");

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(null);
  const [uploadingData, setUploadingData] = useState({
    style_id: styleId,
    styleNo: styleNo,
    isStyleLevel: true,
  });

  const isUploadRef = useRef(null);

  // Get style info from location state or params
  useEffect(() => {
    const styleNoFromState = location.state?.styleNo;
    const styleIdFromState = location.state?.styleId || styleId;

    if (styleIdFromState) {
      setStyleNo(styleNoFromState || "");
      setUploadingData((prev) => ({
        ...prev,
        style_id: styleIdFromState,
        styleNo: styleNoFromState || "",
      }));
      fetchStyleTechPacks(styleIdFromState);
    } else {
      Swal.fire({
        title: "Missing Information",
        text: "Style information is required to view tech packs",
        icon: "error",
        confirmButtonText: "Go Back",
      }).then(() => navigate(-1));
    }
  }, [location, styleId]);

  // Click outside handler for upload modal
  useEffect(() => {
    function handleClickOutside(event) {
      if (isUploadRef.current && !isUploadRef.current.contains(event.target)) {
        setIsUploading(false);
        setUploadingMaterial(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUploading]);

  // Fetch style tech packs
  const fetchStyleTechPacks = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/subOperationMedia/getStyleTechPacks/${id}`,
        { withCredentials: true },
      );

      if (response.data.success) {
        setTechPacks(response.data.data || []);
      } else {
        throw new Error(response.data.message || "Failed to load tech packs");
      }
    } catch (error) {
      console.error("❌ Error fetching style tech packs:", error);
      setTechPacks([]);
    } finally {
      setLoading(false);
    }
  };

  // Get URL functions
  const getTechPackUrl = (item) => {
    if (item.tech_pack_url_proxy) {
      return `${apiUrl}${item.tech_pack_url_proxy}`;
    }
    if (item.proxy_url) return `${apiUrl}${item.proxy_url}`;
    if (item.preview_url) return `${apiUrl}${item.preview_url}`;
    if (item.public_url) return item.public_url;
    if (item.direct_url) return item.direct_url;
    if (item.tech_pack_url) {
      if (item.tech_pack_url.startsWith("http")) return item.tech_pack_url;
      return `${apiUrl}/api/b2-files/${item.tech_pack_url}`;
    }
    return "";
  };

  const getFileName = (item) => {
    return (
      item.original_filename ||
      item.file_name ||
      item.tech_pack_url?.split("/").pop() ||
      "techpack.xlsx"
    );
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

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleDownload = (item) => {
    const downloadUrl = getTechPackUrl(item);
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
        text: "Cannot download file - URL not available",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handlePreview = (item) => {
    const fileUrl = getTechPackUrl(item);
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    } else {
      Swal.fire({
        title: "Error",
        text: "Cannot preview file - URL not available",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handleDelete = async (id, fileName) => {
    const result = await Swal.fire({
      title: "Delete Tech Pack?",
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
        `${apiUrl}/api/subOperationMedia/deleteTechPack/${id}`,
        { withCredentials: true },
      );

      if (response.data.success) {
        await fetchStyleTechPacks(styleId);
        Swal.fire({
          title: "Deleted!",
          text: "Tech pack has been deleted successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Failed to delete file.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Handle upload - using the working TechPackUploader
  const handleUpload = () => {
    setUploadingData((prev) => ({
      ...prev,
      style_id: styleId,
      styleNo: styleNo,
    }));
    setIsUploading(true);
    setUploadingMaterial("techpack");
  };

  // Render file grid
  const renderFileGrid = (items) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl shadow-sm">
          <div className="text-gray-400 mb-4 text-6xl">
            <FaFileExcel />
          </div>
          <h3 className="text-xl font-medium text-gray-600 mb-2">
            No tech packs found
          </h3>
          <p className="text-gray-500 max-w-md mb-4">
            Upload tech packs for style {styleNo || styleId}
          </p>
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FaUpload size={14} />
            Upload Tech Pack
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => {
          const fileName = getFileName(item);
          const FileIconComponent = getFileIconComponent(item);
          const itemId = item.so_tech_id || item.id;

          return (
            <motion.div
              key={itemId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              <div className="relative w-full aspect-video bg-gradient-to-br from-gray-50 to-gray-100 group">
                <button
                  onClick={() => handlePreview(item)}
                  className="w-full h-full flex flex-col items-center justify-center hover:from-gray-100 hover:to-gray-200 transition-all"
                >
                  <div className="mb-2">{FileIconComponent}</div>
                  <span className="text-xs text-gray-500 mt-2 text-center px-2 line-clamp-2">
                    {fileName}
                  </span>
                  <div className="mt-2 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                    <FaTag className="text-xs" />
                    <span>Style-Level</span>
                  </div>
                </button>

                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <FaCloud className="text-xs" />
                  <span>B2</span>
                </div>

                {deletingId === itemId && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
                    <BeatLoader color="#ffffff" size={10} />
                    <span className="ml-2 text-white text-sm">Deleting...</span>
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-sm mb-2 line-clamp-1">
                  {fileName}
                </h3>

                <div className="text-sm text-gray-600 space-y-1">
                  {item.file_size && (
                    <div className="flex justify-between">
                      <span className="font-medium">Size:</span>
                      <span>{formatFileSize(item.file_size)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium">Uploaded:</span>
                    <span className="text-xs">
                      {formatDate(
                        item.createdAt || item.created_at || item.uploaded_at,
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => handleDownload(item)}
                    className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors text-sm px-2 py-1 rounded hover:bg-green-50"
                    title="Download"
                  >
                    <FaDownload className="text-sm" />
                  </button>

                  {(userRole === "Admin" || userRole === "SuperAdmin") && (
                    <button
                      onClick={() => handleDelete(itemId, fileName)}
                      disabled={deletingId === itemId}
                      className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm px-2 py-1 rounded hover:bg-red-50"
                      title="Delete"
                    >
                      <FaTrash size={12} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="px-4 md:px-8 lg:px-16 xl:px-32 min-h-screen bg-gray-50 py-8">
      {/* Upload Modal - Using the working TechPackUploader */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            ref={isUploadRef}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed left-0 backdrop-brightness-50 right-0 bottom-0 w-full z-50 lg:w-full lg:h-screen lg:flex lg:justify-center lg:items-center"
          >
            <div className="md:w-[100%] flex justify-center">
              <TechPackUploader
                setIsUploading={setIsUploading}
                uploadingData={uploadingData}
                setUploadingMaterial={setUploadingMaterial}
                onSuccess={fetchStyleTechPacks}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            className="text-blue-600 font-medium flex items-center gap-2 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft />
            <span>Go back</span>
          </button>

          <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
            <FaTag className="text-purple-500" />
            <span className="font-semibold">
              Style: {style?.style_no || "N/A"}
            </span>
          </div>
        </div>

        <button
          onClick={handleUpload}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
        >
          <BsFillCloudUploadFill />
          Upload Layout
        </button>
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <BeatLoader color="#3b82f6" size={15} />
              <p className="mt-4 text-gray-600">Loading tech packs...</p>
            </div>
          </div>
        ) : (
          renderFileGrid(techPacks)
        )}
      </div>
    </div>
  );
};

export default LayoutAttachmentPage;
