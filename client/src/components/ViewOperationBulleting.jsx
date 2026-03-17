import React, { useState, useMemo, useCallback } from "react";
import ReactPaginate from "react-paginate";
import useOperationBulletin from "../hooks/useOperationBulletin";
import { IoSearchSharp } from "react-icons/io5";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LuCircleArrowRight } from "react-icons/lu";

const ITEMS_PER_PAGE = 12;

const ViewOperationBulletin = ({ onViewBO }) => {
  const {
    isLoading,
    refreshOB,
    operationBulletingList,
    setOperationBulletingList,
  } = useOperationBulletin();
  // console.log("on view bo", operationBulletingList);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Memoized filtered list based on search term
  const filteredList = useMemo(() => {
    if (!Array.isArray(operationBulletingList)) return [];

    const term = searchTerm.toLowerCase();
    if (!term) return operationBulletingList;

    return operationBulletingList.filter((style) => {
      // console.log("style style", style);
      return (
        style.style_no?.toLowerCase().includes(term) ||
        style.po_number?.toLowerCase().includes(term) ||
        style.operations?.length?.toString().includes(term) ||
        style.operations?.some(
          (op) =>
            op.subOperations?.length?.toString().includes(term) ||
            op.operation_name?.toLowerCase().includes(term),
        )
      );
    });
  }, [operationBulletingList, searchTerm]);

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
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(0); // Reset to first page when searching
  }, []);

  const handleViewDetails = useCallback(
    (style) => {
      navigate("/operation-bulletin/operation-details", {
        state: style.style_id,
      });
    },
    [navigate],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-8 text-center">
        <h1 className="text-xl md:text-3xl font-bold text-gray-800 mb-2">
          Operation Bulletin Summary
        </h1>
      </header>

      <div className="mb-8 flex justify-start">
        <motion.div
          className="relative w-full md:w-96"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <input
            type="text"
            placeholder="Search by style no, PO number, operation counts..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <IoSearchSharp className="absolute left-3 top-3 text-gray-400" />
        </motion.div>
      </div>

      {/* Operation Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {currentItems.length > 0 ? (
          currentItems.map((style) => (
            <MemoizedStyleCard
              key={style.style_id}
              style={style}
              onViewDetails={() => handleViewDetails(style)}
            />
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <div className="text-gray-500 text-lg">
              {searchTerm ? "No matching styles found" : "No styles found"}
            </div>
            <button
              onClick={refreshOB}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Data
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-8">
          <PaginationControls
            pageCount={pageCount}
            onPageChange={handlePageClick}
          />
        </div>
      )}
    </div>
  );
};

// Memoized Style Card Component to prevent unnecessary re-renders
const StyleCard = ({ style, onViewDetails }) => {
  // getting image from backend static path
  const apiUrl = import.meta.env.VITE_API_URL;
  const getImageUrl = (mediaUrl) => {
    if (!mediaUrl) return null;

    // If already a full URL (like B2 or CDN)
    if (mediaUrl.startsWith("http")) {
      return mediaUrl;
    }

    // Extract filename if a path is stored
    const fileName = mediaUrl.split("/").pop();

    return `${apiUrl}/style-images/${fileName}`;
  };

  // Calculate total sub-operations across all main operations
  const totalSubOperations =
    style.operations?.reduce((total, op) => {
      return total + (op.subOperations?.length || 0);
    }, 0) || 0;
  // console.log("style ---- ", style);
  return (
    <div className="bg-white rounded-3xl border  border-gray-200 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 flex flex-col h-full">
      {/* Card Header */}
      <div className="px-4 py-3 border-b text-white border-gray-100 bg-gradient-to-br from-blue-700 to-blue-500 flex flex-col justify-center items-center">
        <h3 className="font- text-sm truncate">
          Style No:{" "}
          <span className="text-white font-semibold">
            {style.style_no || "N/A"}
          </span>
        </h3>
        {/* <p className="text-xs mt-0.5">
          PO: <span className="font-semibold">{style.po_number || "N/A"}</span>
        </p> */}
      </div>

      {/* Image */}
      {style.style_medias?.[0]?.media_url && (
        <div className="p-4 flex justify-center">
          <div className="w-32 h-32 rounded border border-gray-200 overflow-hidden">
            <img
              // `${apiUrl}/style-images/${style.style_medias[0].media_url.split("/").pop()}`
              src={getImageUrl(style.style_medias[0].media_url)}
              alt={style.style_name || "Style image"}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() =>
                window.open(
                  getImageUrl(style.style_medias[0].media_url),
                  "_blank",
                )
              }
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-4 flex-1 space-y-3">
        {/* Style Name */}
        <div>
          <h4 className="font-medium text-gray-900 text-sm mb-1">Style Name</h4>
          <p className="text-gray-600 text-sm line-clamp-2">
            {style.style_name || "N/A"}
          </p>
        </div>

        {/* Description */}
        <div>
          <h4 className="font-medium text-gray-900 text-sm mb-1">
            Description
          </h4>
          <p className="text-gray-500 text-xs line-clamp-2">
            {style.style_description || "No description"}
          </p>
        </div>

        {/* Operations */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-gray-600">Main:</span>
            <span className="font-semibold text-gray-900">
              {style.operations?.length || 0}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">Sub:</span>
            <span className="font-semibold text-gray-900">
              {totalSubOperations}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gradient-to-br from-blue-600 to-blue-700 text-white flex justify-between items-center">
        <p className="text-xs space-x-2">
          <span>Created At:</span>
          <span className="">
            {new Date(style?.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </p>
        <button
          onClick={onViewDetails}
          className="text-white hover:text-white hover:scale-110 transition-all duration-200"
          title="View Details"
        >
          <LuCircleArrowRight className="text-xl" />
        </button>
      </div>
    </div>
  );
};

const MemoizedStyleCard = React.memo(StyleCard);

// Extracted Pagination Controls for better readability
const PaginationControls = React.memo(({ pageCount, onPageChange }) => (
  <ReactPaginate
    breakLabel="..."
    nextLabel="Next ›"
    previousLabel="‹ Prev"
    onPageChange={onPageChange}
    pageRangeDisplayed={3}
    marginPagesDisplayed={1}
    pageCount={pageCount}
    containerClassName="flex justify-center items-center space-x-2"
    pageLinkClassName="px-3 py-1 border border-gray-200 rounded-md hover:bg-blue-50 transition-colors min-w-[2.5rem] text-center"
    previousLinkClassName="px-3 py-1 border border-gray-200 rounded-md hover:bg-blue-50 transition-colors"
    nextLinkClassName="px-3 py-1 border border-gray-200 rounded-md hover:bg-blue-50 transition-colors"
    activeLinkClassName="bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
    disabledLinkClassName="opacity-50 cursor-not-allowed hover:bg-transparent"
  />
));

export default ViewOperationBulletin;
