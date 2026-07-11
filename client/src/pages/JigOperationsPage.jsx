// pages/JigOperationsPage.jsx
import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect, useRef } from "react";
import { FaUpload, FaVideo, FaImage, FaFolder, FaSearch } from "react-icons/fa";
import { FcFolder } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { GrAttachment } from "react-icons/gr";
import {
  MdOutlineArrowBack,
  MdDelete,
  MdOutlineDriveFileRenameOutline,
} from "react-icons/md";
import { TbDotsVertical } from "react-icons/tb";
import axios from "axios";
import Swal from "sweetalert2";
import AttachmentPopupMedia from "../components/AttachmentPopupMedia";
import { FaTimes } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import GetJigFolderName from "../components/GetJigFolderName";
import AttachmentPopup from "../components/AttachmentPopup";

const JigOperationsPage = () => {
  // NOTE STATES
  const [isUploadExp, setIsUploadExp] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isVideo, setIsVideo] = useState(true);
  const [folders, setFolders] = useState([]);
  const [filteredFolders, setFilteredFolders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGetName, setIsGetName] = useState(false);
  const [showOptions, setShowOptions] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // NOTE REFS
  const navigate = useNavigate();
  const uploadRef = useRef();
  const searchInputRef = useRef(null);
  const showOptionRef = useRef();

  // NOTE FETCH JIG FOLDERS
  const fetchJigFolders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/jig-folders/get-folders`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      // console.log("folder response: ", response);

      if (response.data.status === "Ok") {
        setFolders(response.data.data);
        setFilteredFolders(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching jig folders:", error);
      setError("Failed to load folders");
    } finally {
      setLoading(false);
    }
  };

  // Filter folders based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFolders(folders);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = folders.filter((folder) => {
      // Search in folder name
      const nameMatch = folder.folder_name?.toLowerCase().includes(searchLower);

      // Search in creator name
      const creatorMatch = folder.creator?.username
        ?.toLowerCase()
        .includes(searchLower);

      return nameMatch || creatorMatch;
    });

    setFilteredFolders(filtered);
  }, [searchTerm, folders]);

  // Handle click outside for upload dropdown
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

  // Handle click outside for options dropdown
  useEffect(() => {
    const handleOutSideClick = (e) => {
      if (showOptionRef.current && !showOptionRef.current.contains(e.target)) {
        setShowOptions("");
      }
    };

    document.addEventListener("click", handleOutSideClick);
    return () => {
      document.removeEventListener("click", handleOutSideClick);
    };
  }, []);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear search
      if (e.key === "Escape" && searchTerm) {
        setSearchTerm("");
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm]);

  // Initial fetch
  useEffect(() => {
    fetchJigFolders();
  }, []);

  // HANDLERS
  const handleShowOptions = (e, folderId) => {
    e.stopPropagation();
    if (folderId === showOptions) {
      setShowOptions("");
      return;
    }
    setShowOptions(folderId);
  };

  const handleDeleteFolder = async (e, folderId) => {
    e.stopPropagation();

    const result = await Swal.fire({
      title: "Delete Folder?",
      text: "Are you sure you want to delete this folder? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      setIsLoading(true);
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/jig-folders/delete-jig-folder/${folderId}`,
        { withCredentials: true },
      );

      if (response.status === 200) {
        await Swal.fire({
          title: "Deleted!",
          text: "Folder has been deleted successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchJigFolders();
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      await Swal.fire({
        title: "Error",
        text: error.response?.data?.msg || "Failed to delete folder",
        icon: "error",
      });
    } finally {
      setIsLoading(false);
      setShowOptions("");
    }
  };

  const handleRenameFolder = async (e, folderId, currentName) => {
    e.stopPropagation();
    setShowOptions("");

    const result = await Swal.fire({
      title: `Rename Folder "${currentName}"`,
      input: "text",
      inputPlaceholder: "Enter new folder name",
      inputValue: currentName,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "Folder name is required!";
        }
        if (value.trim().length < 3) {
          return "Folder name must be at least 3 characters";
        }
        if (value.trim().length > 50) {
          return "Folder name must be less than 50 characters";
        }
      },
    });

    if (!result.isConfirmed) return;

    const folderName = result.value.trim();

    try {
      setIsLoading(true);
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/jig-folders/rename-jig-folder/${folderId}`,
        { folderName },
        { withCredentials: true },
      );

      if (response.status === 200) {
        await Swal.fire({
          title: "Success!",
          text: "Folder renamed successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchJigFolders();
      }
    } catch (error) {
      console.error("Error renaming folder:", error);
      await Swal.fire({
        title: "Error",
        text: error.response?.data?.msg || "Failed to rename folder",
        icon: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleCreateFolder = () => {
    setIsGetName(true);
  };

  const handleFolderCreated = (folderName) => {
    Swal.fire({
      title: "Success!",
      text: `Folder "${folderName}" created successfully`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
    fetchJigFolders();
  };

  const handleFolderClick = (folderId) => {
    // alert(folderId);
    // return;
    navigate(`/innovations/jig-operations/${folderId}`);
  };

  const clearSearch = () => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading folders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 backdrop-blur-[1px] bg-gray-200/40 z-50 flex items-center justify-center flex-col gap-y-4">
          <div className="w-16 h-16 rounded-full bg-transparent border-2 border-blue-400 border-b-0 animate-spin"></div>
          <div className="text-xl font-semibold">Processing...</div>
        </div>
      )}

      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* header title sec */}
          <div className="flex items-center gap-2">
            <button title="Go Back" onClick={() => navigate(-1)}>
              <div className="group">
                <MdOutlineArrowBack className="text-4xl text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
            </button>
            <div>
              <h2 className="text-3xl font-bold text-blue-500">
                Jig Operation
              </h2>
              <p className="text-sm text-gray-500">
                Manage your jig operation folders
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <FaSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search folders... (Ctrl+K)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FaTimes size={14} />
                </button>
              )}
            </div>
          </div>

          {/* header actions */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Create Folder Button */}
            <button
              className="border py-3 px-5 shadow font-medium text-gray-500 hover:shadow-md duration-300 cursor-pointer flex items-center gap-x-2"
              onClick={handleCreateFolder}
            >
              <FaFolder
                size={18}
                className="group-hover:scale-125 duration-150"
              />
              <p>Create Folder</p>
            </button>

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
      <section className="p-6 max-w-7xl mx-auto">
        {/* Search Results Info */}
        {searchTerm && (
          <div className="mb-4 text-sm text-gray-500">
            Found {filteredFolders.length} result
            {filteredFolders.length !== 1 ? "s" : ""} for "{searchTerm}"
          </div>
        )}

        {error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : filteredFolders.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchTerm ? (
              <>
                <FaSearch size={48} className="mx-auto text-gray-300 mb-4" />
                <p>No folders found for "{searchTerm}"</p>
                <p className="text-sm mt-2">Try a different search term</p>
              </>
            ) : (
              <>
                <FaFolder size={48} className="mx-auto text-gray-300 mb-4" />
                <p>No folders found</p>
                <p className="text-sm mt-2">Create a folder to get started</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredFolders.map((folder, index) => (
              <motion.div
                key={folder.folder_id}
                className="relative cursor-pointer hover:border-2 hover:border-blue-300 p-4 hover:shadow-md duration-500 rounded-lg bg-white"
                onClick={() => handleFolderClick(folder.folder_id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Options Button */}
                <div className="absolute top-2 right-2">
                  <button
                    title="Options"
                    onClick={(e) => handleShowOptions(e, folder.folder_id)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <TbDotsVertical size={18} />
                  </button>
                </div>

                {/* Options Dropdown */}
                <AnimatePresence>
                  {showOptions === folder.folder_id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="absolute z-50 right-0 top-12 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[160px] overflow-hidden"
                      ref={showOptionRef}
                    >
                      <ul className="py-1">
                        <li>
                          <button
                            className="w-full px-4 py-2 text-left transition-colors duration-150 hover:bg-red-50 focus:outline-none"
                            onClick={(e) =>
                              handleDeleteFolder(e, folder.folder_id)
                            }
                          >
                            <div className="flex items-center gap-x-2.5 text-red-500">
                              <MdDelete className="text-lg" />
                              <span className="text-sm font-medium">
                                Delete
                              </span>
                            </div>
                          </button>
                        </li>
                        <li>
                          <button
                            className="w-full px-4 py-2 text-left transition-colors duration-150 hover:bg-blue-50 focus:outline-none"
                            onClick={(e) =>
                              handleRenameFolder(
                                e,
                                folder.folder_id,
                                folder.folder_name,
                              )
                            }
                          >
                            <div className="flex items-center gap-x-2.5 text-blue-500">
                              <MdOutlineDriveFileRenameOutline className="text-lg" />
                              <span className="text-sm font-medium">
                                Rename
                              </span>
                            </div>
                          </button>
                        </li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col items-center">
                  <div className="relative">
                    <FcFolder
                      size={90}
                      className="group-hover:scale-110 transition-transform duration-200"
                    />
                    {folder.media_count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
                        {folder.media_count}
                      </span>
                    )}
                  </div>
                  <div className="text-center mt-1 w-full">
                    <p className="font-medium text-sm text-balance line-clamp-2 break-words">
                      {folder.folder_name}
                    </p>
                    {folder.creator && (
                      <p className="text-xs text-gray-400 mt-1">
                        Created by: {folder.creator.username}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(folder.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Upload Popup */}
      {/* <AttachmentPopupMedia
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        isAttachment={false}
        isVideo={isVideo}
        folderId={null} // Will be selected in the popup
        onUploadSuccess={fetchJigFolders}
      /> */}

      <AttachmentPopup
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
        }}
        isVideo={isVideo}
        onUploadSuccess={() => {
          fetchJigFolders();
        }}
        isAttachment={false}
      />

      {/* Get folder name popup */}
      <GetJigFolderName
        isOpen={isGetName}
        onClose={() => setIsGetName(false)}
        refresh={fetchJigFolders}
        onCreate={handleFolderCreated}
      />
    </div>
  );
};

export default JigOperationsPage;
