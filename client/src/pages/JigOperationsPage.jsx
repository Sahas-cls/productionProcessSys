// JigOperationsPage.jsx
import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect, useRef } from "react";
import { FaUpload, FaVideo, FaImage, FaFolder } from "react-icons/fa";
import { FcFolder } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { GrAttachment } from "react-icons/gr";
import { MdOutlineArrowBack } from "react-icons/md";
import axios from "axios";
import AttachmentPopupMedia from "../components/AttachmentPopupMedia";

const JigOperationsPage = () => {
  // NOTE STATES
  const [isUploadExp, setIsUploadExp] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isVideo, setIsVideo] = useState(true);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // NOTE REFS
  const navigate = useNavigate();
  const uploadRef = useRef();

  // NOTE FETCH OPERATIONS WITH MEDIA
  const fetchOperationsWithMedia = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/jig-operations/jig-operation-operations`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.data.success) {
        setOperations(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
      setError("Failed to load operations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationsWithMedia();
  }, []);

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

  const handleVideoUpload = () => {
    console.log("VIDEO CLICKED");
    setIsUploadOpen(true);
    setIsVideo(true);
  };

  const handleImageUpload = () => {
    console.log("IMAGE CLICKED");
    setIsUploadOpen(true);
    setIsVideo(false);
  };

  const handleFolderClick = (operationName) => {
    // Navigate using operation name instead of ID
    navigate(
      `/innovations/jig-operations/${encodeURIComponent(operationName)}`,
      {
        state: {
          operationName: operationName,
        },
      },
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="p-4 flex items-center justify-between relative overflow-visible">
        {/* header title sec */}
        <div className="w-3/12 bg-clip-text flex items-center gap-2">
          <button title="Go Back" onClick={() => navigate(-1)}>
            <div className="group">
              <MdOutlineArrowBack className="text-4xl text-blue-500 group-hover:scale-110" />
            </div>
          </button>
          <h2 className="text-4xl font-bold text-blue-500">Jig Operation</h2>
        </div>
        {/* header actions */}
        <div className="absolute right-4">
          <div className="" ref={uploadRef}>
            <button
              onClick={() => setIsUploadExp(!isUploadExp)}
              className="
                w-[140px] h-[48px]
                bg-blue-600 
                text-white
                flex items-center justify-center gap-3
                font-medium
                shadow-md
                hover:bg-blue-700
                hover:shadow-lg
                active:scale-95
                transition-all duration-200
              "
            >
              <FaUpload size={18} />
              <span>Upload</span>
            </button>
            <AnimatePresence>
              {isUploadExp && (
                <motion.div
                  className="absolute z-10 overflow-hidden"
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
                    className="
                      w-[140px] h-[48px]
                      bg-green-600 
                      text-white
                      flex items-center justify-center gap-3
                      font-medium
                      shadow-md
                      hover:bg-green-700
                      hover:shadow-lg
                      active:scale-95
                      transition-all duration-200
                    "
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
                    className="
                      w-[140px] h-[48px]
                      bg-green-600 
                      text-white
                      flex items-center justify-center gap-3
                      font-medium
                      shadow-md
                      hover:bg-green-700
                      hover:shadow-lg
                      active:scale-95
                      transition-all duration-200
                    "
                  >
                    <FaImage size={18} />
                    <span>Image</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <section className="">
        <div className="m-16 max-h-[70vh]">
          {error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : operations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <FaFolder size={48} className="mx-auto text-gray-300 mb-4" />
              <p>No operations with media found</p>
              <p className="text-sm mt-2">Upload some media to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {operations.map((operation) => (
                <div
                  className="cursor-pointer hover:border-2 p-4 hover:shadow-md duration-500"
                  key={operation.operation_name} // Use name as key since it's grouped
                  onClick={() => handleFolderClick(operation.operation_name)}
                >
                  <div className="flex items-center flex-col relative ">
                    <div className="relative">
                      <FcFolder
                        size={90}
                        className="group-hover:scale-110 transition-transform duration-200"
                      />
                      {operation.total_media > 0 && (
                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                          {operation.total_media}
                        </span>
                      )}
                      {operation.operation_count > 1 && (
                        <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                          {operation.operation_count} ops
                        </span>
                      )}
                    </div>
                    <div className="text-center mt-1">
                      <p className="font-medium text-sm text-balance">
                        {operation.operation_name}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        {operation.media_types.image > 0 && (
                          <span className="text-xs text-blue-500">
                            📷 {operation.media_types.image}
                          </span>
                        )}
                        {operation.media_types.video > 0 && (
                          <span className="text-xs text-purple-500">
                            🎬 {operation.media_types.video}
                          </span>
                        )}
                      </div>
                      {/* {operation.operation_count > 1 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {operation.operation_ids.join(", ")}
                        </p>
                      )} */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AttachmentPopupMedia
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        isAttachment={false}
        isVideo={isVideo}
        onUploadSuccess={fetchOperationsWithMedia} // Refresh after upload
      />
    </div>
  );
};

export default JigOperationsPage;
