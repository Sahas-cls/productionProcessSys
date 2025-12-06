import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaFolder,
  FaTrash,
  FaDownload,
  FaArrowLeft,
  FaCloud,
  FaExternalLinkAlt,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileImage,
  FaFileArchive,
} from "react-icons/fa";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

const DocumentGallery = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.userRole;
  const params = useParams();

  const [documents, setDocuments] = useState([]);
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
      fetchDocuments(id);
    } else {
      Swal.fire({
        title: "Missing Parameter",
        text: "Sub-operation ID is required to view documents",
        icon: "error",
        confirmButtonText: "Go Back",
      }).then(() => navigate(-1));
    }
  }, [location, params]);

  const fetchDocuments = async (id) => {
    setLoading(true);
    try {
      // Note: Changed endpoint from getFolderDocuments to getFolderFiles
      const response = await axios.get(
        `${
          import.meta.env.VITE_API_URL
        }/api/subOperationMedia/getFolderDocuments/${id}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        setDocuments(response.data.data || []);
        console.log(
          `✅ Loaded ${
            response.data.data?.length || 0
          } documents from Backblaze B2`
        );
      } else {
        throw new Error(response.data.message || "Failed to load documents");
      }
    } catch (error) {
      console.error("❌ Error fetching documents:", error);

      let errorMessage = "Failed to load documents";
      if (error.response?.status === 404) {
        errorMessage = "No documents found for this sub-operation";
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

  // Get the best URL for the document - prefers proxy URL for security
  const getDocumentUrl = (item) => {
    const baseUrl = import.meta.env.VITE_API_URL;

    // Priority: proxy_url -> preview_url -> public_url -> direct_url -> old format
    if (item.proxy_url) {
      return `${baseUrl}${item.proxy_url}`;
    } else if (item.preview_url) {
      return `${baseUrl}${item.preview_url}`;
    } else if (item.public_url) {
      return item.public_url;
    } else if (item.direct_url) {
      return item.direct_url;
    } else if (item.folder_url) {
      // Legacy support - check if it's already a full URL
      if (item.folder_url.startsWith("http")) {
        return item.folder_url;
      }
      // Use B2 proxy endpoint
      return `${baseUrl}/api/b2-files/${item.folder_url}`;
    }

    return "";
  };

  // Get URL for download (direct B2 link)
  const getDownloadUrl = (item) => {
    if (item.public_url) {
      return item.public_url;
    }
    if (item.direct_url) {
      return item.direct_url;
    }
    return getDocumentUrl(item);
  };

  const getFileName = (item) => {
    return (
      item.file_name ||
      item.original_filename ||
      item.folder_url?.split("/").pop() ||
      "document"
    );
  };

  const getFileIconComponent = (item) => {
    const fileName = getFileName(item).toLowerCase();

    if (fileName.includes(".pdf")) {
      return <FaFilePdf className="text-red-600 text-2xl" />;
    } else if (fileName.includes(".doc")) {
      return <FaFileWord className="text-blue-600 text-2xl" />;
    } else if (
      fileName.includes(".xls") ||
      fileName.includes(".xlsx") ||
      fileName.includes(".csv")
    ) {
      return <FaFileExcel className="text-green-600 text-2xl" />;
    } else if (
      fileName.includes(".jpg") ||
      fileName.includes(".jpeg") ||
      fileName.includes(".png") ||
      fileName.includes(".gif")
    ) {
      return <FaFileImage className="text-purple-600 text-2xl" />;
    } else if (
      fileName.includes(".zip") ||
      fileName.includes(".rar") ||
      fileName.includes(".7z")
    ) {
      return <FaFileArchive className="text-yellow-600 text-2xl" />;
    } else if (fileName.includes(".txt")) {
      return <FaFileWord className="text-gray-600 text-2xl" />;
    }
    return <FaFolder className="text-orange-500 text-2xl" />;
  };

  const getFileIcon = (item) => {
    if (item.file_icon) return item.file_icon;

    const fileName = getFileName(item).toLowerCase();
    if (fileName.includes(".pdf")) return "📕";
    if (fileName.includes(".doc")) return "📘";
    if (fileName.includes(".xls") || fileName.includes(".xlsx")) return "📊";
    if (fileName.includes(".csv")) return "📑";
    if (
      fileName.includes(".jpg") ||
      fileName.includes(".jpeg") ||
      fileName.includes(".png") ||
      fileName.includes(".gif")
    )
      return "🖼️";
    if (
      fileName.includes(".zip") ||
      fileName.includes(".rar") ||
      fileName.includes(".7z")
    )
      return "🗜️";
    if (fileName.includes(".txt")) return "📝";
    return "📄";
  };

  const getFileTypeName = (item) => {
    if (item.file_type_name) return item.file_type_name;

    const fileName = getFileName(item).toLowerCase();
    if (fileName.includes(".pdf")) return "PDF Document";
    if (fileName.includes(".doc")) return "Word Document";
    if (fileName.includes(".xls") || fileName.includes(".xlsx"))
      return "Excel Spreadsheet";
    if (fileName.includes(".csv")) return "CSV File";
    if (fileName.includes(".jpg") || fileName.includes(".jpeg"))
      return "JPEG Image";
    if (fileName.includes(".png")) return "PNG Image";
    if (fileName.includes(".gif")) return "GIF Image";
    if (fileName.includes(".zip")) return "ZIP Archive";
    if (fileName.includes(".rar")) return "RAR Archive";
    if (fileName.includes(".7z")) return "7-Zip Archive";
    if (fileName.includes(".txt")) return "Text File";
    return "Document";
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
        text: "Cannot download document - URL not available",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handlePreview = (item) => {
    const documentUrl = getDocumentUrl(item);

    if (documentUrl) {
      // Open in new tab for preview
      window.open(documentUrl, "_blank");
    } else {
      Swal.fire({
        title: "Error",
        text: "Cannot preview document - URL not available",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handleDelete = async (id, fileName) => {
    const result = await Swal.fire({
      title: "Delete document?",
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
      // Note: Changed endpoint from deleteFolderDocument to deleteFolderFile
      const response = await axios.delete(
        `${
          import.meta.env.VITE_API_URL
        }/api/subOperationMedia/deleteFolderDocument/${id}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        await fetchDocuments(subOpId);

        let successMessage = "Document has been deleted from cloud storage.";
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

      let errorMessage = "Failed to delete document. Please try again.";
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
      fetchDocuments(subOpId);
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
            <span>Total Documents: {documents.length}</span>
            {documents.length > 0 && (
              <span className="text-xs text-gray-400">
                (
                {formatFileSize(
                  documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0)
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

      {/* Documents Section */}
      <div className="mb-8">
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaFolder className="text-orange-500 text-2xl" />
            <h1 className="text-2xl font-bold">Document Gallery</h1>
            <span className="bg-orange-100 text-orange-800 text-sm px-3 py-1 rounded-full">
              {documents.length} {documents.length === 1 ? "file" : "files"}
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
                Loading documents from cloud storage...
              </p>
            </div>
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl shadow-sm">
            <div className="text-gray-400 mb-4 text-6xl flex">
              <FaCloud />
            </div>
            <h3 className="text-xl font-medium text-gray-600 mb-2">
              No documents found
            </h3>
            <p className="text-gray-500 max-w-md mb-4">
              There are no documents uploaded for sub-operation {subOpId} yet.
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
            {documents.map((item) => {
              const fileName = getFileName(item);
              const fileIcon = getFileIcon(item);
              const FileIconComponent = getFileIconComponent(item);
              const fileTypeName = getFileTypeName(item);

              return (
                <motion.div
                  key={item.so_folder_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative w-full aspect-video bg-gradient-to-br from-gray-50 to-gray-100 group">
                    <button
                      onClick={() => handlePreview(item)}
                      className="w-full h-full flex flex-col items-center justify-center hover:from-gray-100 hover:to-gray-200 transition-all"
                    >
                      {/* <div className="text-4xl mb-2">{fileIcon}</div> */}
                      <div className="flex items-center justify-center">
                        {FileIconComponent}
                      </div>
                      <span className="text-xs text-gray-500 mt-2 text-center px-2 line-clamp-2">
                        {fileName}
                      </span>

                      {/* File type badge */}
                      <div className="mt-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {fileTypeName}
                      </div>

                      {/* Folder name if available */}
                      {item.folder_name &&
                        item.folder_name !== "Untitled Folder" && (
                          <div className="mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {item.folder_name}
                          </div>
                        )}
                    </button>

                    {/* Cloud storage indicator */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <FaCloud className="text-xs" />
                      <span>B2</span>
                    </div>

                    {deletingId === item.so_folder_id && (
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
                      {item.sub_operation_name || "Document"}
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
                      {/* {item.file_type && (
                        <div className="flex justify-between">
                          <span className="font-medium">Type:</span>
                          <span className="text-xs uppercase">
                            {item.file_type.split("/")[1] || item.file_type}
                          </span>
                        </div>
                      )} */}
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                        Uploaded: {formatDate(item.createdAt)}
                      </div>

                      <div className="flex gap-2">
                        {/* <button
                          onClick={() => handlePreview(item)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-sm px-2 py-1 rounded hover:bg-blue-50"
                          title="Preview"
                        >
                          <FaExternalLinkAlt className="text-sm" />
                        </button> */}

                        <button
                          onClick={() => handleDownload(item)}
                          className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors text-sm px-2 py-1 rounded hover:bg-green-50"
                          title="Download"
                        >
                          <FaDownload className="text-sm" />
                        </button>

                        {userRole === "Admin" && (
                          <button
                            onClick={() =>
                              handleDelete(item.so_folder_id, fileName)
                            }
                            disabled={deletingId === item.so_folder_id}
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

export default DocumentGallery;
