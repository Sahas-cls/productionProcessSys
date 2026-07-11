// pages/AttachmentPage.jsx
import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect, useRef } from "react";
import { TbDotsVertical } from "react-icons/tb";
import {
  FaUpload,
  FaVideo,
  FaImage,
  FaFileAlt,
  FaFolder,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { MdDelete, MdOutlineArrowBack } from "react-icons/md";
import Swal from "sweetalert2";
import AttachmentPopup from "../components/AttachmentPopup";
import GetFolderName from "../components/GetFolderName";
import axios from "axios";
import { FcFolder } from "react-icons/fc";
import { MdOutlineDriveFileRenameOutline } from "react-icons/md";
import { FastField } from "formik";

const AttachmentPage = () => {
  // State
  const [isUploadExp, setIsUploadExp] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isVideo, setIsVideo] = useState(true);
  const [isGetName, setIsGetName] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [folders, setFolders] = useState([]);
  const uploadRef = useRef();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  const [showOptions, setShowOptions] = useState("");
  const showOptionRef = useRef();
  const [isLoading, setIsLoading] = useState(false);

  const handleShowOptions = (e, folderId) => {
    //
    e.stopPropagation();
    if (folderId == showOptions) {
      setShowOptions("");
      return;
    }
    setShowOptions(folderId);
  };

  const handleDeleteFolder = async (e, folderId) => {
    e.stopPropagation();
    console.log("folder id: ", folderId);

    try {
      setIsLoading(true);
      const response = await axios.delete(
        `${apiUrl}/api/attachment-folder/delete-att-folder/${folderId}`,
      );
      if (response.status === 200) {
        Swal.fire({
          title: "Success",
          text: "Folder Delete Success",
          icon: "success",
        });
      }
      fetchFolders();
    } catch (error) {
      await Swal.fire({
        title: "Error",
        text: error.response.data.msg || "",
        icon: "error",
      });
      console.log("Error while deleting folders: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameFolder = async (e, folderId, crrName) => {
    e.stopPropagation();
    let folderName = "";
    const result = await Swal.fire({
      title: `Rename Folder "${crrName}"`,
      input: "text",
      inputPlaceholder: "NewFolder-1",
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "Folder name is required!";
        }

        if (value.length < 3) {
          return "Folder name must be at least 3 characters";
        }
      },
    });

    if (result.isConfirmed) {
      folderName = result.value;
    }

    if (!folderName) {
      await Swal.fire({ title: "Renaming Canceled!", icon: "info" });
      return;
    }

    // validate folder name
    if (folderName.trim().length < 3) {
      await Swal.fire({
        title: "Provided name is too short!",
        text: "Folder name at least should have 3 letters",
        icon: "info",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.patch(
        `${apiUrl}/api/attachment-folder/rename-att-folder/${folderId}`,
        { folderName: folderName },
        { withCredentials: true },
      );

      if (response.status === 200) {
        await Swal.fire({ title: "Folder Rename Success", icon: "success" });
        fetchFolders();
      }
      console.log(response);
    } catch (error) {
      console.log(error);
      await Swal.fire({
        title: "Folder Rename Failed",
        text: error.response.data.msg,
        icon: "error",
      });
      console.log("Error while renaming folder: ", error);
    } finally {
      setIsLoading(false);
    }
  };

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
  }, [showOptionRef]);

  // get all folders
  const fetchFolders = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/attachment-folder/get-folders`,
        { withCredentials: true },
      );
      setFolders(response.data.data);
      // console.log(response.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

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

  // fetch attachment folders
  useEffect(() => {
    fetchFolders();
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

  const handleCreateFolder = () => {
    setIsGetName(true);
  };

  const handleFolderCreated = (folderName) => {
    // Handle folder creation success
    Swal.fire({
      title: "Success!",
      text: `Folder "${folderName}" created successfully`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
    // You can add additional logic here like refreshing folder list
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && (
        <div className="absolute inset-0 backdrop-blur-[1px] bg-gray-200/40 z-50 flex items-center justify-center flex-col gap-y-4">
          <div className="w-16 h-16 rounded-full bg-transparent border-2 border-blue-400 border-b-0 animate-spin"></div>
          <div className="text-xl font-semibold">Loading</div>
        </div>
      )}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button title="Go Back" onClick={() => navigate(-1)}>
              <div className="group">
                <MdOutlineArrowBack className="text-4xl text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
            </button>
            <div>
              <h2 className="text-3xl font-bold text-blue-500">Attachments</h2>
              <p className="text-sm text-gray-500">
                Manage your files and folders
              </p>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search attachments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
              />
            </div>

            {/* Create Folder Button */}
            <div
              className="border py-3 px-5 shadow font-medium text-gray-500 hover:shadow-md duration-300 cursor-pointer"
              onClick={handleCreateFolder}
            >
              <div className="flex items-center gap-x-2">
                <FaFolder
                  size={18}
                  className="group-hover:scale-125 duration-150"
                />
                <p>Create Folder</p>
              </div>
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
        <div className="">
          {Array.isArray(folders) && folders.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 cursor-pointer relative z-40">
              {folders.map((folder) => (
                <div
                  className="flex items-center flex-col relative p-4 hover:bg-blue-200/20"
                  onClick={() =>
                    navigate(`/innovations/attachments/${folder.folder_id}`)
                  }
                >
                  <div className="absolute -right-4  md:right-2">
                    <button
                      title="Options"
                      onClick={(e) => handleShowOptions(e, folder.folder_id)}
                      className="z-50 p-4"
                    >
                      <TbDotsVertical />
                    </button>
                  </div>
                  {/* options */}
                  <AnimatePresence>
                    {showOptions === folder.folder_id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{
                          duration: 0.4,
                        }}
                        className="absolute z-50 -right-24 top-12 mt-2 mr-2 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[160px] overflow-hidden"
                      >
                        <ul className="py-1" ref={showOptionRef}>
                          <li>
                            <button
                              className="w-full px-4 py-2 text-left transition-colors duration-150 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
                              onClick={(e) => {
                                handleDeleteFolder(e, folder.folder_id);
                              }}
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
                              className="w-full px-4 py-2 text-left transition-colors duration-150 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                              onClick={(e) => {
                                handleRenameFolder(
                                  e,
                                  folder.folder_id,
                                  folder.folder_name,
                                );
                              }}
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
                  <div className="relative">
                    <FcFolder
                      size={90}
                      className="group-hover:scale-110 transition-transform duration-200"
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm text-balance line-clamp-2 -mt-2">
                      {folder.folder_name}
                    </p>
                    {/* <div className="flex items-center justify-center gap-2 mt-1">
                      {operation.media_types.image > 0 && (
                        <span className="text-xs text-blue-500 flex items-center gap-0.5">
                          📷 {operation.media_types.image}
                        </span>
                      )}
                      {operation.media_types.video > 0 && (
                        <span className="text-xs text-purple-500 flex items-center gap-0.5">
                          🎬 {operation.media_types.video}
                        </span>
                      )}
                    </div> */}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div></div>
          )}
        </div>
      </div>

      {/* Upload Popup */}
      <AttachmentPopup
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
        }}
        isVideo={isVideo}
        onUploadSuccess={() => {
          fetchFolders();
        }}
        isAttachment={true}
      />

      {/* Get folder name popup */}
      <GetFolderName
        isOpen={isGetName}
        onClose={() => {
          setIsGetName(false);
        }}
        refresh={fetchFolders}
        onCreate={handleFolderCreated}
      />
    </div>
  );
};

export default AttachmentPage;
