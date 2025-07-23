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

    return operationBulletingList.filter((ob) => {
      const matchesType1 =
        ob.style?.style_no?.toLowerCase().includes(term) ||
        ob.operation_id?.toString().includes(term) ||
        ob.operation_name?.toLowerCase().includes(term) ||
        ob.subOperations?.length?.toString().includes(term);

      const matchesType2 =
        ob.style?.style_no?.toLowerCase().includes(term) ||
        ob.helper_id?.toString().includes(term) ||
        ob.operation_name?.toLowerCase().includes(term) ||
        ob.operation_code?.toLowerCase().includes(term) ||
        ob.mc_smv?.toString().includes(term) ||
        ob.comments?.toLowerCase().includes(term);

      return ob.operation_type_id === 1 ? matchesType1 : matchesType2;
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
    (ob) => {
      ob.operation_type_id == 1
        ? navigate("/operation-bulletin/operation-details", { state: ob })
        : navigate("/operation-bulletin/helper-operation-details", {
            state: ob,
          });
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
          All Main Operations
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
            placeholder="Search by style no, operation name, ID..."
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
          currentItems.map((ob) => (
            <MemoizedOperationCard
              key={ob.operation_id}
              operation={ob}
              onViewDetails={() => handleViewDetails(ob)}
            />
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <div className="text-gray-500 text-lg">
              {searchTerm
                ? "No matching operations found"
                : "No operations found"}
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

// Memoized Operation Card Component to prevent unnecessary re-renders
const OperationCard = ({ operation: ob, onViewDetails }) => {
  const isType1 = ob.operation_type_id === 1;
  const isType2 = ob.operation_type_id === 2;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {/* Card Header */}
      <div
        className={`${
          ob.operation_type_id == 1 ? "bg-teal-500" : "bg-blue-600"
        } px-4 py-3`}
      >
        <h3 className="text-white font-semibold text-center truncate">
          Style No: {ob.style?.style_no || "N/A"}
        </h3>
        {/* {isType2 && (
          <p className="text-white text-sm text-center truncate">
            {ob.operation_code}
          </p>
        )} */}
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-center border-b-2 border-black/10">
          <span className="font-medium text-gray-700 w-32">
            {ob.operation_type_id == 1 ? "Operation ID:" : "Helper OP ID: "}
          </span>
          <span className="inline-block bg-yellow-100 text-blue-800 font-bold px-2 py-1 rounded-md text-sm">
            {ob.operation_type_id == 1 ? ob.operation_id : ob.helper_id}
          </span>
        </div>

        <div className="flex items-center border-b-2 border-black/10">
          <span className="font-medium text-gray-700 w-32">Name:</span>
          <span className="truncate">{ob.operation_name}</span>
        </div>

        {isType1 && (
          <div className="flex items-center border-b-2 border-black/10">
            <span className="font-medium text-gray-700 w-32">
              Sub-OP Count:
            </span>
            <span>{ob.subOperations?.length || 0}</span>
          </div>
        )}

        {isType2 && (
          <>
            {/* <div className="flex items-center border-b-2 border-black/10">
              <span className="font-medium text-gray-700 w-32">
                Operation type:
              </span>
              <span>
                {ob.operation_type_id == 2 ? "Helper Operation" : "" || "N/A"}
              </span>
            </div> */}
            <div className="flex items-center border-b-2 border-black/10">
              <span className="font-medium text-gray-700 w-32">MC SMV:</span>
              <span>{ob.mc_smv || "N/A"}</span>
            </div>
            <div className="flex items-center border-b-2 border-black/10">
              <span className="font-medium text-gray-700 w-32">Comments:</span>
              <span className="truncate">{ob.comments || "N/A"}</span>
            </div>
          </>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-4 pb-4 text-right">
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

const MemoizedOperationCard = React.memo(OperationCard);

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
