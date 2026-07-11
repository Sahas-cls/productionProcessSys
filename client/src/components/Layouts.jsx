import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import useStyle from "../hooks/useStyles";
import { FaArrowRight, FaSearch } from "react-icons/fa";
import { IoSearchSharp } from "react-icons/io5";
import ReactPaginate from "react-paginate";
import noImageFound from "../assets/images/no-image-found.png";
import { FaFileExcel, FaFolder } from "react-icons/fa6";
import { motion, AnimatePresence } from "framer-motion";
import { BsFillCloudUploadFill } from "react-icons/bs";
import { BsThreeDotsVertical } from "react-icons/bs";
import TechPackUploader from "./TechPackUploader";
import FolderDocumentsUploader from "./FolderDocumentsUploader";
import Swal from "sweetalert2";
import { Navigate, useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 12;

const Layouts = () => {
  const { stylesList, isLoading, refresh } = useStyle();
  console.log("style list: ", stylesList);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  // Upload states
  const [showEUploadOrView, setShowEUploadOrView] = useState(false);
  const [showFUploadOrView, setShowFUploadOrView] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(null);
  const [uploadingData, setUploadingData] = useState({
    style_id: "",
    styleNo: "",
    isStyleLevel: true,
  });

  const excelUploadRef = useRef(null);
  const fileUploadRef = useRef(null);
  const isUploadRef = useRef(null);
  const searchRef = useRef(null);

  // search bar shortcut ctrl + b
  useEffect(() => {
    const handleShortCut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleShortCut);

    return () => {
      document.removeEventListener("keydown", handleShortCut);
    };
  }, []);

  // Update uploading data when stylesList changes
  useEffect(() => {
    if (stylesList && stylesList.length > 0) {
      // You might want to set this based on selected style or first style
      // For now, we'll set it when a user clicks upload
    }
  }, [stylesList]);

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

  // Click outside for excel upload dropdown
  useEffect(() => {
    const isOutsideClick = (e) => {
      if (
        excelUploadRef.current &&
        !excelUploadRef.current.contains(e.target)
      ) {
        setShowEUploadOrView(false);
      }
    };

    document.addEventListener("mousedown", isOutsideClick);
    return () => {
      document.removeEventListener("mousedown", isOutsideClick);
    };
  }, [excelUploadRef]);

  // Click outside for file upload dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (fileUploadRef.current && !fileUploadRef.current.contains(e.target)) {
        setShowFUploadOrView(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [fileUploadRef]);

  // Memoized filtered list based on search term
  const filteredList = useMemo(() => {
    if (!Array.isArray(stylesList)) return [];

    const term = searchTerm.toLowerCase().trim();
    if (!term) return stylesList;

    return stylesList.filter((style) => {
      return (
        style.style_no?.toLowerCase().includes(term) ||
        style.style_name?.toLowerCase().includes(term) ||
        style.style_description?.toLowerCase().includes(term)
      );
    });
  }, [stylesList, searchTerm]);

  // Memoized pagination calculations
  const { currentItems, pageCount } = useMemo(() => {
    const offset = currentPage * ITEMS_PER_PAGE;
    const validList = Array.isArray(filteredList) ? filteredList : [];
    return {
      currentItems: validList.slice(offset, offset + ITEMS_PER_PAGE),
      pageCount: Math.ceil(validList.length / ITEMS_PER_PAGE),
    };
  }, [filteredList, currentPage]);

  const handlePageClick = useCallback(({ selected }) => {
    setCurrentPage(selected);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setCurrentPage(0);
  }, []);

  const getImageUrl = (img) => {
    if (!img) return null;
    if (img.startsWith("http")) return img;
    const cleanPath = img.replace(/^\//, "");
    return `${apiUrl}/api/b2-files/${cleanPath}`;
  };

  // Handle upload for a specific style
  const handleStyleUpload = (style) => {
    if (!style?.style_id || !style?.style_no) {
      Swal.fire({
        title: "Error",
        text: "Style information not available",
        icon: "error",
      });
      return;
    }

    setUploadingData({
      style_id: style.style_id,
      styleNo: style.style_no,
      isStyleLevel: true,
    });
  };

  // Handle TechPack upload
  const handleTechPackUpload = (style) => {
    handleStyleUpload(style);
    setUploadingMaterial("techpack");
    setIsUploading(true);
    setShowEUploadOrView(false);
  };

  // Handle Folder/Document upload
  const handleFolderUpload = (style) => {
    handleStyleUpload(style);
    setUploadingMaterial("folder");
    setIsUploading(true);
    setShowFUploadOrView(false);
  };

  // Show Excel Upload Dropdown
  const showExcelUpload = (style) => {
    return (
      <div
        ref={excelUploadRef}
        className="relative bg-green-600 rounded-bl-lg rounded-br-lg shadow-xl border border-gray-200"
      >
        <div className="py-2">
          <button
            className="flex items-center gap-3 w-full px-2 py-2 justify-center text-left text-sm hover:bg-green-500/80 transition-colors"
            onClick={() => handleTechPackUpload(style)}
          >
            <BsThreeDotsVertical className="text-white text-lg" />
            <span className="hidden md:block text-white font-semibold">
              Upload Layout
            </span>
          </button>
          <div className="h-1 bg-gray-100 mx-2 my-2"></div>
          <button
            className="flex items-center gap-3 justify-center w-full px-2 py-2 text-left text-sm hover:bg-green-500/80 transition-colors"
            onClick={() => {
              setShowEUploadOrView(false);
              // Navigate to tech packs view
              // You can add navigation here if needed
            }}
          >
            <FaFolder className="text-white text-lg" />
            <span className="hidden md:block text-white font-semibold">
              View Tech Packs
            </span>
          </button>
        </div>
      </div>
    );
  };

  // Show File Upload Dropdown
  const showFileUpload = (style) => {
    return (
      <div
        ref={fileUploadRef}
        className="relative bg-blue-500 rounded-bl-md rounded-br-md shadow-xl border border-gray-200"
      >
        <div className="py-2">
          <button
            className="flex items-center gap-3 w-full px-2 justify-center py-2 text-left text-sm hover:bg-blue-400 transition-colors"
            onClick={() => handleFolderUpload(style)}
          >
            <BsThreeDotsVertical className="text-white text-lg" />
            <span className="hidden md:block text-white">Upload Documents</span>
          </button>
          <div className="h-1 bg-gray-100 mx-2 my-2"></div>
          <button
            className="flex items-center gap-3 w-full px-2 justify-center py-2 text-left text-sm hover:bg-blue-400 transition-colors"
            onClick={() => {
              setShowFUploadOrView(false);
              // Navigate to documents view
              // You can add navigation here if needed
            }}
          >
            <FaFolder className="text-white text-lg" />
            <span className="hidden md:block text-white">View Documents</span>
          </button>
        </div>
      </div>
    );
  };

  // Style Card Component
  const StyleCard = React.memo(
    ({
      styleNo,
      styleName,
      createdAt,
      img,
      description,
      style,
      styleId,
      attachment_count,
    }) => {
      const [imageError, setImageError] = useState(false);
      const [showUploadOptions, setShowUploadOptions] = useState(false);
      const uploadOptionsRef = useRef(null);

      // Click outside for upload options
      useEffect(() => {
        const handleClickOutside = (event) => {
          if (
            uploadOptionsRef.current &&
            !uploadOptionsRef.current.contains(event.target)
          ) {
            setShowUploadOptions(false);
          }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }, []);

      const handleImageError = () => {
        setImageError(true);
      };

      const handleCardClick = (styleId) => {
        navigate(`/layout/${styleId}`);
      };

      return (
        <div className="bg-white  border rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col h-full relative">
          <div className="z-10 absolute bg-red-600 w-8 h-6 text-center font-semibold text-white">
            {attachment_count || 0}
          </div>

          {/* Upload Button - Top Right */}
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={() => setShowUploadOptions(!showUploadOptions)}
              className=" text-white p-1.5 rounded-full  transition-colors border"
              title="Upload"
            >
              <BsThreeDotsVertical size={14} className="text-black" />
            </button>

            {/* Upload Options Dropdown */}
            {showUploadOptions && (
              <div
                ref={uploadOptionsRef}
                className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[140px] overflow-hidden z-20"
              >
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                  onClick={() => {
                    handleTechPackUpload(style);
                    setShowUploadOptions(false);
                  }}
                >
                  <FaFileExcel className="text-green-600" />
                  <span>Upload Layout</span>
                </button>
                {/* <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 border-t border-gray-100"
                  onClick={() => {
                    handleFolderUpload(style);
                    setShowUploadOptions(false);
                  }}
                >
                  <FaFolder className="text-blue-600" />
                  <span>Upload Documents</span>
                </button> */}
              </div>
            )}
          </div>

          {/* Content */}
          <div
            className="p-3 sm:p-4 flex-1 flex flex-col cursor-pointer"
            onClick={() => handleCardClick(styleId)}
          >
            {/* Title */}
            <h2 className="font-semibold text-sm sm:text-base lg:text-lg text-center mb-2 sm:mb-3 truncate">
              Style No: {styleNo}
            </h2>

            {/* Image */}
            <div className="aspect-square bg-gray-100 bg-black/2 rounded-lg overflow-hidden mb-2 sm:mb-3 flex items-center justify-center">
              {!imageError ? (
                <img
                  src={img == "" ? noImageFound : getImageUrl(img)}
                  alt={`Style ${styleNo}`}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400 text-xs sm:text-sm">
                    No Image
                  </span>
                </div>
              )}
            </div>

            {/* Style Name */}
            <p className="text-center text-xs sm:text-sm text-gray-600 line-clamp-2 flex-1">
              {styleName || "N/A"}
            </p>

            {/* Description - optional */}
            {description && (
              <p className="text-center text-[10px] sm:text-xs text-gray-400 line-clamp-1 mt-1">
                {description}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 sm:px-4 py-1 sm:py-2 bg-gradient-to-b from-blue-200 to-blue-200 flex items-center justify-between">
            <p className="text-[10px] sm:text-xs text-black font-medium">
              {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}
            </p>
            <button
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white/80 flex items-center justify-center hover:bg-white hover:text-blue-600 transition-all duration-200 text-black"
              aria-label="View details"
              onClick={() => handleCardClick(styleId)}
            >
              <FaArrowRight size={11} className="sm:text-sm" />
            </button>
          </div>
        </div>
      );
    },
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading styles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Upload Modal */}
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
              {uploadingMaterial === "techpack" && (
                <TechPackUploader
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                  isStyleLevel={true}
                />
              )}

              {uploadingMaterial === "folder" && (
                <FolderDocumentsUploader
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                  isStyleLevel={true}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between py-3 sm:py-2 gap-3 sm:gap-4">
            <h2 className="text-lg sm:text-lg font-semibold text-gray-600">
              Available Layouts
            </h2>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64 md:w-80">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by style no, name...(ctrl + b)"
                className="w-full pl-10 pr-8 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <IoSearchSharp
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="pb-3 flex items-center justify-between text-sm text-gray-500">
            {/* <span>
              Showing {currentItems.length} of {filteredList.length} styles
            </span> */}
            {searchTerm && (
              <span className="text-blue-600">Search: "{searchTerm}"</span>
            )}
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {currentItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
              {currentItems.map((sty) => (
                <StyleCard
                  key={sty.style_id || sty.style_no}
                  styleNo={sty.style_no || "N/A"}
                  styleName={sty.style_name || "N/A"}
                  createdAt={sty.createdAt || sty.created_at}
                  description={sty.style_description}
                  img={sty?.style_medias?.[0]?.media_url || ""}
                  style={sty}
                  styleId={sty.style_id}
                  attachment_count={sty?.attachment_count}
                />
              ))}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="mt-8">
                <PaginationControls
                  pageCount={pageCount}
                  onPageChange={handlePageClick}
                  currentPage={currentPage}
                />
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="text-center">
              {searchTerm ? (
                <>
                  <FaSearch size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">
                    No styles found for "{searchTerm}"
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Try a different search term
                  </p>
                  <button
                    onClick={clearSearch}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg">No styles available</p>
                  <button
                    onClick={refresh}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Refresh
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Pagination Controls Component
const PaginationControls = React.memo(
  ({ pageCount, onPageChange, currentPage }) => (
    <ReactPaginate
      breakLabel="..."
      nextLabel="Next →"
      previousLabel="← Previous"
      onPageChange={onPageChange}
      pageRangeDisplayed={3}
      marginPagesDisplayed={1}
      pageCount={pageCount}
      forcePage={currentPage}
      containerClassName="flex flex-wrap justify-center items-center gap-1 sm:gap-2"
      pageLinkClassName="px-3 py-1 sm:px-4 sm:py-2 border border-gray-200 rounded-md hover:bg-blue-50 transition-colors min-w-[2.5rem] text-center text-sm"
      previousLinkClassName="px-3 py-1 sm:px-4 sm:py-2 border border-gray-200 rounded-md hover:bg-blue-50 transition-colors text-sm"
      nextLinkClassName="px-3 py-1 sm:px-4 sm:py-2 border border-gray-200 rounded-md hover:bg-blue-50 transition-colors text-sm"
      activeLinkClassName="bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
      disabledLinkClassName="opacity-50 cursor-not-allowed hover:bg-transparent"
      breakLinkClassName="px-2 py-1 text-gray-500"
    />
  ),
);

export default Layouts;
