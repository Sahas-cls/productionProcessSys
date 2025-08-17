import React, { useState, useMemo, useCallback } from "react";
import ReactPaginate from "react-paginate";
import useOperationBulletin from "../hooks/useOperationBulletin";
import { IoSearchSharp } from "react-icons/io5";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 12;

const ViewOperationBulletin = ({ onViewBO }) => {
  const {
    isLoading,
    refreshOB,
    operationBulletingList,
    setOperationBulletingList,
  } = useOperationBulletin();
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Memoized filtered list based on search term
  const filteredList = useMemo(() => {
    if (!Array.isArray(operationBulletingList)) return [];

    const term = searchTerm.toLowerCase();
    if (!term) return operationBulletingList;

    return operationBulletingList.filter((style) => {
      return (
        style.style_no?.toLowerCase().includes(term) ||
        style.po_number?.toLowerCase().includes(term) ||
        style.operations?.length?.toString().includes(term) ||
        style.operations?.some(
          (op) =>
            op.subOperations?.length?.toString().includes(term) ||
            op.operation_name?.toLowerCase().includes(term)
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
      navigate("/operation-bulletin/operation-details", { state: style });
    },
    [navigate]
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
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
              onViewDetails={() => handleViewDetails(style.style_id)}
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
  // Calculate total sub-operations across all main operations
  const totalSubOperations =
    style.operations?.reduce((total, op) => {
      return total + (op.subOperations?.length || 0);
    }, 0) || 0;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {/* Card Header */}
      <div className="bg-gray-300 px-4 py-3">
        <h3 className="text-black font-semibold text-center truncate">
          Style No: {style.style_no || "N/A"}
        </h3>
        <h5 className="text-center">PO No: {style.po_number || "N/A"}</h5>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
          <span className="font-medium text-gray-700">Style Name:</span>
          <span className="text-right truncate">
            {style.style_name || "N/A"}
          </span>
        </div>

        <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
          <span className="font-medium text-gray-700">Main Ops:</span>
          <span className="inline-block bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded-md text-sm">
            {style.operations?.length || 0}
          </span>
        </div>

        <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
          <span className="font-medium text-gray-700">Sub Ops:</span>
          <span className="inline-block bg-green-100 text-green-800 font-bold px-2 py-1 rounded-md text-sm">
            {totalSubOperations}
          </span>
        </div>

        <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
          <span className="font-medium text-gray-700">Description:</span>
          <span className="text-right truncate">
            {style.style_description || "N/A"}
          </span>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 pb-4 text-right flex justify-between items-center">
        <p className="text-xs text-gray-500">
          Created:{" "}
          <span className="font-medium">
            {new Date(style?.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </p>
        <button
          onClick={onViewDetails}
          className="text-blue-600 font-medium hover:text-blue-800 transition-colors focus:outline-none"
        >
          View Details →
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
