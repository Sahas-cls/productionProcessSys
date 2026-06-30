// pages/AttachmentPage.jsx
import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect, useRef } from "react";
import {
  FaUpload,
  FaVideo,
  FaImage,
  FaFileAlt,
  FaFolder,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { MdOutlineArrowBack } from "react-icons/md";
import Swal from "sweetalert2";
import AttachmentPopup from "../components/AttachmentPopup";
import GetFolderName from "../components/GetFolderName";
import axios from "axios";
import { FcFolder } from "react-icons/fc";

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

  // get all folders
  const fetchFolders = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/attachment-folder/get-folders`,
        { withCredentials: true },
      );
      setFolders(response.data.data);
      console.log(response.data.data);
    } catch (error) {
      console.log(error);
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
            <div className="grid grid-cols-5 cursor-pointer">
              {folders.map((folder) => (
                <div
                  className="flex items-center flex-col relative p-4 hover:bg-blue-200/20"
                  onClick={() =>
                    navigate(`/innovations/attachments/${folder.folder_id}`)
                  }
                >
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
          // You can add logic here to refresh folder contents
        }}
      />

      {/* Get folder name popup */}
      <GetFolderName
        isOpen={isGetName}
        onClose={() => {
          setIsGetName(false);
        }}
        onCreate={handleFolderCreated}
      />
    </div>
  );
};

export default AttachmentPage;
