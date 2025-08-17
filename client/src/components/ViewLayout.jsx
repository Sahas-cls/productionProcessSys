import React, { useState, useRef, useEffect } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import useFetchLayout from "../hooks/useLineLayout";
import { FaArrowCircleRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { MdDeleteForever, MdModeEdit } from "react-icons/md";
import ReactPaginate from "react-paginate";

const ViewLayout = () => {
  const { layoutList, isLoading, refresh, deleteLayout } = useFetchLayout();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(null);
  const menuRefs = useRef({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8; // 4 columns x 2 rows = 8 items per page

  console.log("layout list: ", layoutList);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.values(menuRefs.current).forEach((ref) => {
        if (ref && !ref.contains(event.target)) {
          setActiveMenu(null);
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDelete = async (layoutId) => {
    if (window.confirm("Are you sure you want to delete this layout?")) {
      await deleteLayout(layoutId);
      refresh();
    }
  };

  const handleEdit = (layoutId) => {
    navigate(`/layout/edit/${layoutId}`);
  };

  // Filter layouts based on search term
  const filteredLayouts = layoutList?.filter((layout) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      layout.layout_id.toString().includes(searchLower) ||
      (layout.style_id && layout.style_id.toString().includes(searchLower)) ||
      (layout.season_id && layout.season_id.toString().includes(searchLower)) ||
      (layout.workstation_count &&
        layout.workstation_count.toString().includes(searchLower)) ||
      (layout.createdAt &&
        new Date(layout.createdAt)
          .toLocaleDateString()
          .toLowerCase()
          .includes(searchLower))
    );
  });

  // Pagination logic
  const pageCount = Math.ceil(filteredLayouts?.length / itemsPerPage) || 1;
  const offset = currentPage * itemsPerPage;
  const currentItems =
    filteredLayouts?.slice(offset, offset + itemsPerPage) || [];

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">
            Production Layouts
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search layouts..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0); // Reset to first page when searching
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={refresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Loader */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <ClipLoader size={50} color="#2563EB" />
          </div>
        ) : filteredLayouts?.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-10 bg-gray-50 rounded-xl p-8 border border-gray-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-medium text-gray-700 mb-2">
              {searchTerm ? "No matching layouts found" : "No Layouts Found"}
            </h2>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              {searchTerm
                ? "Try adjusting your search query"
                : "There are currently no production layouts available. Try refreshing the data or create a new layout."}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-sm transition-all duration-200"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={refresh}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-sm transition-all duration-200"
              >
                Refresh Data
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentItems.map((layout) => (
                <div
                  key={layout.layout_id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden relative"
                >
                  {/* Options Menu */}
                  <div className="absolute right-2 top-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(
                          activeMenu === layout.layout_id
                            ? null
                            : layout.layout_id
                        );
                      }}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <HiOutlineDotsVertical className="text-gray-500" />
                    </button>

                    {activeMenu === layout.layout_id && (
                      <div
                        ref={(el) => (menuRefs.current[layout.layout_id] = el)}
                        className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                      >
                        <ul className="py-1">
                          <li>
                            <button
                              onClick={() => handleEdit(layout.layout_id)}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <MdModeEdit className="mr-2" />
                              Edit Layout
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleDelete(layout.layout_id)}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              <MdDeleteForever className="mr-2" />
                              Delete Layout
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex justify-center items-center mb-3">
                      <h2 className="text-lg font-bold text-gray-800 truncate text-center">
                        Layout {layout.layout_id}
                      </h2>
                    </div>

                    <div className="px-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Style No
                        </p>
                        <p className="text-gray-700 font-medium">
                          {layout.style.style_no}
                        </p>
                      </div>

                      {/* <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Season ID
                        </p>
                        <p className="text-gray-700 font-medium">
                          {layout.season_id}
                        </p>
                      </div> */}

                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          MO Count
                        </p>
                        <p className="text-gray-700 font-medium">
                          {layout.style.operations.length}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Sub OP Count
                        </p>
                        <p className="text-gray-700 font-medium">
                          {layout.style.operations.reduce(
                            (total, op) =>
                              total + (op.subOperations?.length || 0),
                            0
                          )}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Workstations count
                        </p>
                        <p className="text-gray-700 font-medium">
                          {layout.workstation_count}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-100/70 px-5 py-3 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">
                        Created:{" "}
                        <span className="font-medium">
                          {new Date(layout.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/workstation/list-view", {
                            state: layout.layout_id,
                          })
                        }
                      >
                        <FaArrowCircleRight className="text-xl text-blue-500 hover:scale-105 duration-150" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="mt-8 flex justify-center">
                <ReactPaginate
                  previousLabel={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                  nextLabel={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                  breakLabel={"..."}
                  breakClassName={"break-me"}
                  pageCount={pageCount}
                  marginPagesDisplayed={2}
                  pageRangeDisplayed={5}
                  onPageChange={handlePageClick}
                  containerClassName={
                    "flex items-center space-x-1 sm:space-x-2 text-sm"
                  }
                  pageClassName={
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gray-300 hover:bg-gray-100"
                  }
                  pageLinkClassName={
                    "w-full h-full flex items-center justify-center"
                  }
                  activeClassName={"bg-blue-600 text-white border-blue-600"}
                  previousClassName={
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gray-300 hover:bg-gray-100"
                  }
                  nextClassName={
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gray-300 hover:bg-gray-100"
                  }
                  disabledClassName={"opacity-50 cursor-not-allowed"}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ViewLayout;
