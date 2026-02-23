import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import AddOperationOB from "./AddOperationOB";
import AddSubOperationOB from "./AddSubOperationOB";
import { IoCloseOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { MdDeleteForever, MdPersonOff } from "react-icons/md";
import {
  FaArrowDown,
  FaChevronRight,
  FaDropbox,
  FaPlus,
  FaReact,
  FaSearch,
} from "react-icons/fa";
import { IoIosArrowDropdown, IoIosArrowDropdownCircle } from "react-icons/io";
import { FaDeleteLeft } from "react-icons/fa6";
import { TbTool } from "react-icons/tb";
import AddTechnicalData from "./technicalDataPage/AddTechnicalData";
import { ArrowLeftCircleIcon } from "@heroicons/react/24/outline";
import { MdOutlinePersonAddAlt } from "react-icons/md";

const ViewStyleDetails = () => {
  const navigate = useNavigate();
  const { style_id } = useParams();
  // const [styleId, setStyleId] = useState(
  //   useParams.style_id || useParams.styleId,
  // );
  const apiUrl = import.meta.env.VITE_API_URL;
  const location = useLocation(); //holds the style id
  // console.log("location: ", location);
  const [style, setStyle] = useState(null);
  const [helperOp, setHelperOp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedOperations, setExpandedOperations] = useState(() => {
    const saved = sessionStorage.getItem("expandedOperations");
    return saved ? JSON.parse(saved) : {};
  });
  const [layoutData, setLayoutData] = useState({});
  const [isAddingSubOP, setIsAddingSubOP] = useState(false);
  const [isAddingMO, setIsAddingMO] = useState(false);
  const [mainOperationId, setMainOperationId] = useState("");
  const { user, loading: userLoading, error } = useAuth();
  const [helperFocus, setHelperFocus] = useState(false);
  const [isShowHelperOp, setIsShowHelperOp] = useState(false);
  const [lastActiveOp, setLastActiveOp] = useState(
    sessionStorage.getItem("lastActiveOp") || "",
  );
  const [isTechnicalDataModalOpen, setIsTechnicalDataModalOpen] =
    useState(false);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [selectedSubOperation, setSelectedSubOperation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef(null);
  const searchResultsRef = useRef(null);

  console.log("last active op id; ", location.state);

  const fetchStyleData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiUrl}/api/operationBulleting/getOB/${location.state}`,
      );
      console.log("fetched data: ", response);
      if (response.data && response.data.data) {
        console.log("Fetched style data:", response.data.data);
        setStyle(response.data.data);
        setHelperOp(response.data.helperOp);
        const initialExpanded = {};
        response.data.data.operations?.forEach((op) => {
          initialExpanded[op.operation_id] = false;
        });
        setExpandedOperations((prev) => {
          if (Object.keys(prev || {}).length > 0) {
            return prev; // keep restored state
          }
          return initialExpanded;
        });
      }
    } catch (error) {
      console.error("Error fetching style data:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load style data",
        icon: "error",
      });
      if (error.status === 401) {
        Swal.fire({
          title: "You'r session has been expired please login again",
          icon: "warning",
        });
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  // NOTE sending request to check is layout exist
  const fetchLayout = async () => {
    console.log("sending request to check is layout exist");
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${apiUrl}/api/layout/get-layout-data/${location.state}`,
        {
          withCredentials: true,
        },
      );
      console.log("layout response: ", layoutData);
      if ((response.status = 200)) {
        setLayoutData(response?.data?.data || {});
      }
      console.log("layout response: ", response);
    } catch (error) {
      console.error;
      if (error.status === 401) {
        Swal.fire({
          title: "You'r session has been expired please login again",
          icon: "warning",
        });
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isAddingSubRef = useRef(null);

  useEffect(() => {
    fetchStyleData();
    fetchLayout();
  }, [style_id]);

  // useEffect(() => {
  //   if (style_id) {
  //   }
  // }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const performSearch = () => {
      setIsSearching(true);

      if (!style?.operations) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const results = [];
      const query = searchQuery.toLowerCase().trim();

      style.operations.forEach((operation) => {
        if (operation.subOperations && operation.subOperations.length > 0) {
          operation.subOperations.forEach((subOp) => {
            if (
              subOp.sub_operation_name &&
              subOp.sub_operation_name.toLowerCase().includes(query)
            ) {
              results.push({
                ...subOp,
                parentOperation: operation,
                matchType: "sub-operation",
                matchField: "name",
              });
            }

            // Also search by sub-operation number if needed
            if (
              subOp.sub_operation_number &&
              subOp.sub_operation_number.toLowerCase().includes(query)
            ) {
              results.push({
                ...subOp,
                parentOperation: operation,
                matchType: "sub-operation",
                matchField: "number",
              });
            }
          });
        }
      });

      setSearchResults(results);
      setShowSearchResults(true);
      setIsSearching(false);
    };

    // Debounce search to avoid too many searches while typing
    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, style]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchResultClick = (result) => {
    // Expand the parent operation
    setExpandedOperations((prev) => ({
      ...prev,
      [result.parentOperation.operation_id]: true,
    }));

    // Scroll to the sub-operation
    setTimeout(() => {
      const element = document.getElementById(
        `subop-${result.sub_operation_id}`,
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Highlight temporarily
        element.classList.add(
          "bg-yellow-100",
          "transition-colors",
          "duration-1000",
        );
        setTimeout(() => {
          element.classList.remove("bg-yellow-100");
        }, 2000);
      }
    }, 400);

    setShowSearchResults(false);
    setSearchQuery("");
  };

  const handleBack = () => navigate(-1);

  const handleDeleteOperation = async (operationId) => {
    const choice = await Swal.fire({
      icon: "warning",
      title: "Delete Operation?",
      text: "This will also delete all sub-operations",
      showCancelButton: true,
    });

    if (!choice.isConfirmed) return;

    try {
      setIsLoading(true);
      setIsDeleting(true);
      const response = await axios.delete(
        `${apiUrl}/api/operationBulleting/deleteBO/${operationId}`,
      );

      if (response.status === 200) {
        await Swal.fire({
          title: "Deleted!",
          text: "Operation was deleted successfully",
          icon: "success",
        });
        fetchStyleData();
      }
    } catch (error) {
      console.error("Error deleting operation:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to delete operation",
        icon: "error",
      });
    } finally {
      setIsDeleting(false);
      setIsLoading(false);
    }
  };

  //! =====================================================================
  // for scroll handling
  useEffect(() => {
    if (!style) return;

    const savedPosition = sessionStorage.getItem("bulletinPosition");
    const expanded = sessionStorage.getItem("expandedOperations");

    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
      sessionStorage.removeItem("bulletinPosition");
    }

    if (expanded) {
      setExpandedOperations(JSON.parse(expanded));
    }
  }, [style]);

  //! =====================================================================

  const handleDeleteSubOperation = async (subOperationId, operationId) => {
    const confirmation = await Swal.fire({
      title: "Delete Sub-Operation?",
      text: "This will also delete related machine settings",
      showCancelButton: true,
      confirmButtonColor: "red",
    });

    if (!confirmation.isConfirmed) return;

    try {
      setIsLoading(true);
      const response = await axios.delete(
        `${apiUrl}/api/operationBulleting/delete-sub-operation/${subOperationId}`,
        { withCredentials: true },
      );

      if (response.status === 200) {
        await Swal.fire({
          title: "Deleted!",
          text: "Sub-operation was deleted",
          icon: "success",
        });
        fetchStyleData();
      }
    } catch (error) {
      console.error("Error deleting sub-operation:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to delete sub-operation",
        icon: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // handle delete main operation
  const handleDeleteMainOP = async (operation) => {
    const isConfirmed = await Swal.fire({
      title: "Are you sure?",
      html: `Do you really wish to delete <span style="color:red; font-weight:600;">${operation.operation_name}</span>? <br/> this action cannot be undo`,
      icon: "question",
      showCancelButton: true,
    });

    if (!isConfirmed.isConfirmed) {
      return;
    }

    // send delete request
    try {
      setIsLoading(true);
      const response = await axios.delete(
        `${apiUrl}/api/operationBulleting/delete-mo/${operation.operation_id}`,
        { withCredentials: true },
      );

      console.log("response delete: ", response);

      if (response.status === 200) {
        await Swal.fire({
          title: "Operation delete success",
          icon: "success",
          showCancelButton: false,
        });
      }

      window.location.reload();
    } catch (error) {
      console.error("Error while delete main operation: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOperationExpand = (operationId) => {
    setExpandedOperations((prev) => ({
      ...prev,
      [operationId]: !prev[operationId],
    }));
  };

  useEffect(() => {
    if (Object.keys(expandedOperations).length === 0) return;

    sessionStorage.setItem(
      "expandedOperations",
      JSON.stringify(expandedOperations),
    );
  }, [expandedOperations]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!style) {
    return (
      <div className="p-4 sm:p-8 text-center">
        <p className="text-red-500 text-sm sm:text-base">
          No style data available
        </p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm sm:text-base"
        >
          Back to List
        </button>
      </div>
    );
  }

  const userRole = user?.userRole || null;

  const handleAddTechnicalData = (operation, subOperation) => {
    console.log(`operation ${operation} || subOperation ${subOperation}`);
    setSelectedOperation(operation);
    setSelectedSubOperation(subOperation);
    setIsTechnicalDataModalOpen(true);
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl">
      <AddTechnicalData
        isOpen={isTechnicalDataModalOpen}
        onClose={() => setIsTechnicalDataModalOpen(false)}
        styleId={location.state} // Using the style_id from location.state
        mainOperation={selectedOperation}
        subOperation={selectedSubOperation}
        userRole={user}
      />

      {/* Modal for Adding Main Operation */}
      <AnimatePresence>
        {isAddingMO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: "90deg" }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0, rotate: "90deg" }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <AddOperationOB
                setIsAddingMO={setIsAddingMO}
                fetchStyleData={fetchStyleData}
                state={location.state}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for Adding Sub-Operation */}
      <AnimatePresence>
        {isAddingSubOP && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: "90deg" }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0, rotate: "90deg" }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden mx-2 sm:mx-4"
            >
              <div
                ref={isAddingSubRef}
                className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200"
              >
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                  Add Sub-Operation
                </h3>
                <button
                  className="p-1 hover:bg-red-500 hover:text-white rounded-full transition-colors duration-200"
                  onClick={() => setIsAddingSubOP(false)}
                >
                  <IoCloseOutline className="text-xl sm:text-2xl" />
                </button>
              </div>

              <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
                <AddSubOperationOB
                  mainOp={mainOperationId}
                  setIsAddingSubOP={setIsAddingSubOP}
                  fetchStyleData={fetchStyleData}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <header className="mb-6 sm:mb-8">
        <button
          onClick={handleBack}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4 sm:mb-6 text-sm sm:text-base font-medium transition-colors duration-200"
        >
          <svg
            className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Styles
        </button>

        <div className="text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-0 sm:mb-0">
            {style.style_no || "Unnamed Style"}
          </h1>
          <div className="flex flex-col sm:flex-row justify-center items-center">
            <span className="text-lg sm:text-xl text-teal-600 font-semibold">
              {/* PO: {style.po_number} */}
            </span>
            <span className="text-sm sm:text-base text-gray-500 bg-gray-200 px-2 py-1 rounded min-w-10 border">
              {/* Style ID: {style.style_id} */}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 sm:mb-8">
        {/* Style Details Section */}
        <section className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
            Style Details
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 text-sm sm:text-base">
            <div className="space-y-2 sm:space-y-3 justify-self-start">
              <p className="text-gray-600">
                <span className="font-medium text-gray-700">Name:</span>{" "}
                {style.style_name}
              </p>
              <p className="text-gray-600">
                <span className="font-medium text-gray-700">Customer ID:</span>{" "}
                {style.customer_id}
              </p>
            </div>

            {/* <div className="space-y-2 sm:space-y-3">
              <p className="text-gray-600">
                <span className="font-medium text-gray-700">Created:</span>{" "}
                {formatDate(style.createdAt)}
              </p>
              <p className="text-gray-600">
                <span className="font-medium text-gray-700">Updated:</span>{" "}
                {formatDate(style.updatedAt)}
              </p>
            </div> */}

            {!isLoading && (
              <div className="">
                <div className="">
                  {!layoutData?.layout_id ? (
                    <div className="justify-self-end">
                      <button
                        type="button "
                        className="py-2 px-2 bg-blue-400 text-white rounded-md flex gap-x-2 items-center group shadow-md"
                        onClick={() =>
                          navigate(
                            `/layout/create-new-layout/${location?.state}`,
                          )
                        }
                      >
                        <FaPlus className="group-hover:scale-125 duration-200" />
                        <p className="font-semibold">Create new Layout</p>
                      </button>
                      {/* No layout created yet */}
                    </div>
                  ) : (
                    <div
                      className="justify-self-end py-2 relative bg-gradient-to-b from-blue-200 to-blue-200 w-48 border-l-2 border-l-blue-600 flex justify-center items-center rounded-md shadow-md border group cursor-pointer"
                      onClick={() => {
                        navigate(
                          `/workstation/list-view/${layoutData?.layout_id}/${layoutData?.style_id}/${style?.style_no}`,
                        );
                      }}
                    >
                      <div className="absolute w-8 left-0 group-hover:translate-x-52 opacity-0 group-hover:opacity-100 duration-700 [animation-speed:20]">
                        <FaChevronRight className="group-hover:text-5xl text-white" />
                      </div>
                      <div className="">
                        <h1 className="font-semibold text-black text-center">
                          Layout
                        </h1>
                        <hr className="border-1 border-black/20 my-1" />
                        <p className="text-sm text-black">
                          Workstation Count:{" "}
                          <span className="font-semibold text-red-400">
                            {layoutData?.workstation_count}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-gray-600 text-sm sm:text-base">
              <span className="font-medium text-gray-700">Description:</span>{" "}
              {style.style_description || "No description provided"}
            </p>
            <div className="w-full sm:w-96 relative">
              <div className="flex items-center">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() =>
                    searchQuery.trim() !== "" && setShowSearchResults(true)
                  }
                  className="flex-1 py-2.5 px-4 border border-gray-300 max-h-12 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Search by sub-operation name"
                  aria-label="Search by sub-operation name"
                />
                <button className="bg-blue-600 outline-none border-none hover:bg-blue-700 w-12 min-h-12 max-h-12 flex justify-center items-center rounded-r-lg transition-colors duration-200 focus:outline-none focus:ring-blue-500 focus:ring-offset-2">
                  <FaSearch className="text-white" />
                </button>
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div
                  ref={searchResultsRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto"
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div>
                      <div className="p-2 bg-gray-50 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-500">
                          Found {searchResults.length} result
                          {searchResults.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.sub_operation_id}-${index}`}
                          onClick={() => handleSearchResultClick(result)}
                          className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">
                                {result.sub_operation_name}
                                <span className="ml-2 text-xs text-gray-500">
                                  #{result.sub_operation_number}
                                </span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  {result.parentOperation?.operation_name}
                                </span>
                                {result.matchField === "number" && (
                                  <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                    Matched by number
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400">
                              ID: {result.sub_operation_id}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-gray-500 mb-1">
                        No sub-operations found
                      </p>
                      <p className="text-xs text-gray-400">
                        Try searching with a different keyword
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Operations Section */}
        <section className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              Operations ({style.operations?.length || 0})
            </h2>
            {userRole === "Admin" ||
              (userRole === "SuperAdmin" && (
                <button
                  onClick={() => setIsAddingMO(true)}
                  className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base font-medium transition-colors duration-200 shadow-sm"
                >
                  Add Operation
                </button>
              ))}
          </div>

          {style.operations?.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {style.operations.map((operation) => (
                <div
                  key={operation.operation_id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  {/* Operation Header */}
                  <div
                    className="bg-gray-50 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                    onClick={() =>
                      toggleOperationExpand(operation.operation_id)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-x-4">
                        <div className="">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMainOP(operation);
                            }}
                          >
                            <MdDeleteForever className="text-2xl hover:scale-125 duration-300 text-red-600" />
                          </button>
                        </div>
                        <h3 className="font-semibold text-gray-800 text-base sm:text-lg mb-1 sm:mb-2">
                          {operation.operation_name}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          ID: {operation.operation_id}
                        </span>
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                          Type:{" "}
                          {operation.operation_type_id === 1
                            ? "Main"
                            : "Helper"}
                        </span>
                        <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded">
                          Created: {formatDate(operation.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                      <div className="">
                        <span className="text-xs sm:text-sm bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full font-medium">
                          {operation.subOperations?.length || 0} Sub-Op
                        </span>
                      </div>
                      <svg
                        className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transform transition-transform duration-200 ${
                          expandedOperations[operation.operation_id]
                            ? "rotate-180"
                            : ""
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Sub-Operations */}
                  {expandedOperations[operation.operation_id] && (
                    <div className="p-3 sm:p-4 space-y-4 bg-white">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h4 className="font-semibold text-gray-700 text-sm sm:text-base">
                          Sub-Operations ({operation.subOperations?.length || 0}
                          )
                        </h4>
                        {(userRole === "Admin" ||
                          userRole === "SuperAdmin") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMainOperationId(operation);
                              setIsAddingSubOP(true);
                            }}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm font-medium transition-colors duration-200"
                          >
                            Add Sub-Operation
                          </button>
                        )}
                      </div>

                      {operation.subOperations?.length > 0 ? (
                        <div className="space-y-3">
                          {operation.subOperations.map((subOp) => (
                            <div
                              id={`subop-${subOp.sub_operation_id}`}
                              key={subOp.sub_operation_id}
                              className={`border border-gray-200 rounded-lg p-3 sm:p-4 ${lastActiveOp == subOp.sub_operation_id ? "bg-blue-100/80" : ""} hover:bg-gray-50 transition-colors duration-200`}
                            >
                              <div
                                className={`flex flex-col lg:flex-row justify-between items-start lg:items-start gap-3 relative`}
                              >
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-gray-800 text-sm sm:text-base mb-2">
                                    {subOp.sub_operation_name} (
                                    {subOp.sub_operation_number})
                                  </h5>
                                  <div
                                    className={`grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm`}
                                  >
                                    <p className="text-gray-600">
                                      <span className="font-medium">ID:</span>{" "}
                                      {subOp.sub_operation_id}
                                    </p>
                                    <p className="text-gray-600">
                                      <span className="font-medium">SMV:</span>{" "}
                                      {subOp.smv || "N/A"}
                                    </p>
                                    <p className="text-gray-600">
                                      <span className="font-medium">
                                        Machine type:
                                      </span>{" "}
                                      {subOp.machine_type || "N/A"}
                                    </p>
                                    <p className="text-gray-600">
                                      <span className="font-medium">
                                        Created:
                                      </span>{" "}
                                      {formatDate(subOp.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                {(userRole === "Admin" ||
                                  userRole === "SuperAdmin") && (
                                  <div className="flex gap-2 self-end lg:self-auto relative">
                                    <button
                                      className="bg-orange-400 px-4 rounded-md text-white hover:bg-orange-500/90 hover:text-black"
                                      title="Add Technical Data"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddTechnicalData(
                                          operation,
                                          subOp,
                                        );
                                      }}
                                    >
                                      <TbTool />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        sessionStorage.setItem(
                                          "lastActiveOp",
                                          subOp.sub_operation_id,
                                        );
                                        sessionStorage.setItem(
                                          "bulletinPosition",
                                          window.scrollY,
                                        );
                                        navigate(
                                          `/operations/edit-sub-operation`,
                                          {
                                            state: {
                                              subOperation: subOp,
                                              operationId:
                                                operation.operation_id,
                                            },
                                          },
                                        );
                                      }}
                                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium transition-colors duration-200"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        sessionStorage.setItem(
                                          "bulletinPosition",
                                          window.scrollY,
                                        );
                                        handleDeleteSubOperation(
                                          subOp.sub_operation_id,
                                          operation.operation_id,
                                        );
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs font-medium transition-colors duration-200"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Machines and Configurations */}
                              {subOp.machines?.length > 0 && (
                                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                                  <h6 className="font-semibold text-gray-700 text-sm sm:text-base mb-2 sm:mb-3">
                                    Machine Configurations
                                  </h6>
                                  <div className="space-y-3 sm:space-y-4">
                                    {subOp.machines.map((machine) => (
                                      <div
                                        key={machine.machine_id}
                                        className="pl-3 sm:pl-4 border-l-2 border-blue-200 bg-blue-50 rounded-r-lg p-2 sm:p-3"
                                      >
                                        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs sm:text-sm">
                                          <p className="text-gray-700">
                                            <span className="font-medium">
                                              No:
                                            </span>{" "}
                                            {machine.machine_no}
                                          </p>
                                          <p className="text-gray-700">
                                            <span className="font-medium">
                                              Name:
                                            </span>{" "}
                                            {machine.machine_name}
                                          </p>
                                          <p className="text-gray-700">
                                            <span className="font-medium">
                                              Type:
                                            </span>{" "}
                                            {machine.machine_type}
                                          </p>
                                          <p className="text-gray-700">
                                            <span className="font-medium">
                                              Brand:
                                            </span>{" "}
                                            {machine.machine_brand}
                                          </p>
                                          <p className="text-gray-700">
                                            <span className="font-medium">
                                              Location:
                                            </span>{" "}
                                            {machine.machine_location}
                                          </p>
                                        </div>
                                        {/* Needle Types */}
                                        {subOp.needle_types?.filter(
                                          (nt) =>
                                            nt.machine_id ===
                                            machine.machine_id,
                                        ).length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-xs sm:text-sm font-medium text-gray-700">
                                              Needle Types:
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {subOp.needle_types
                                                .filter(
                                                  (nt) =>
                                                    nt.machine_id ===
                                                    machine.machine_id,
                                                )
                                                .map((nt, idx) => (
                                                  <span
                                                    key={idx}
                                                    className="bg-white text-gray-600 px-2 py-1 rounded text-xs border"
                                                  >
                                                    {nt.type}
                                                  </span>
                                                ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Needle Treads */}
                                        {subOp.needle_treads?.filter(
                                          (nt) =>
                                            nt.machine_id ===
                                            machine.machine_id,
                                        ).length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-xs sm:text-sm font-medium text-gray-700">
                                              Needle Treads:
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {subOp.needle_treads
                                                .filter(
                                                  (nt) =>
                                                    nt.machine_id ===
                                                    machine.machine_id,
                                                )
                                                .map((nt, idx) => (
                                                  <span
                                                    key={idx}
                                                    className="bg-white text-gray-600 px-2 py-1 rounded text-xs border"
                                                  >
                                                    {nt.tread}
                                                  </span>
                                                ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Needle Loopers */}
                                        {subOp.needle_loopers?.filter(
                                          (nl) =>
                                            nl.machine_id ===
                                            machine.machine_id,
                                        ).length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-xs sm:text-sm font-medium text-gray-700">
                                              Loopers:
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {subOp.needle_loopers
                                                .filter(
                                                  (nl) =>
                                                    nl.machine_id ===
                                                    machine.machine_id,
                                                )
                                                .map((nl, idx) => (
                                                  <span
                                                    key={idx}
                                                    className="bg-white text-gray-600 px-2 py-1 rounded text-xs border"
                                                  >
                                                    {nl.looper_type}
                                                  </span>
                                                ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Remarks */}
                              {subOp.remark && (
                                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                                  <h2 className="font-medium mt-4">
                                    Needle thread configurations
                                  </h2>
                                  <div className="bg-green-50/80 border-l-4 border-green-500 rounded-r-lg w-full mt-3 p-4 shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Needle 1 & Bobbin Section */}
                                      <div className="space-y-4">
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <p className="font-medium text-gray-700">
                                              Needle 1
                                            </p>
                                          </div>
                                          <div className="pl-4">
                                            <p className="text-sm text-gray-600">
                                              <span className="font-medium">
                                                Type:
                                              </span>{" "}
                                              {subOp?.needles[0]?.thread
                                                ?.thread_category || (
                                                <span className="text-gray-400 italic">
                                                  Not specified
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <p className="font-medium text-gray-700">
                                              Bobbin
                                            </p>
                                          </div>
                                          <div className="pl-4">
                                            <p className="text-sm text-gray-600">
                                              {subOp?.bobbin
                                                ?.thread_category || (
                                                <span className="text-gray-400 italic">
                                                  Not specified
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Needle 2 & Looper Section */}
                                      <div className="space-y-4">
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <p className="font-medium text-gray-700">
                                              Needle 2
                                            </p>
                                          </div>
                                          <div className="pl-4">
                                            <p className="text-sm text-gray-600">
                                              <span className="font-medium">
                                                Type:
                                              </span>{" "}
                                              {subOp?.needles[1]?.thread
                                                ?.thread_category || (
                                                <span className="text-gray-400 italic">
                                                  Not specified
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                            <p className="font-medium text-gray-700">
                                              Looper
                                            </p>
                                          </div>
                                          <div className="pl-4">
                                            <p className="text-sm text-gray-600">
                                              {subOp?.looper
                                                ?.thread_category || (
                                                <span className="text-gray-400 italic">
                                                  Not specified
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 mt-4">
                                    Remarks:
                                  </p>
                                  <p className="text-gray-600 text-xs sm:text-sm">
                                    {subOp.remark}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 sm:py-6 text-gray-500 text-sm sm:text-base">
                          No sub-operations found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-500 text-sm sm:text-base">
              No operations found for this style
            </div>
          )}
        </section>

        {/* helper operation section */}
        <section className="p-4 sm:p-6">
          <div className="flex justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              Helper Operations ({helperOp?.length || 0})
            </h2>
            <div className="">
              <button
                className={`${isShowHelperOp ? "rotate-180" : "rotate-0"} duration-200`}
                onClick={() => setIsShowHelperOp(!isShowHelperOp)}
              >
                <IoIosArrowDropdown className="text-2xl opacity-45" />
              </button>
            </div>
          </div>
          <AnimatePresence>
            {isShowHelperOp && (
              <motion.div
                className=""
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* helper op card */}
                {helperOp && helperOp.length > 0 ? (
                  <div>
                    {helperOp &&
                      helperOp.length > 0 &&
                      helperOp.map((hOp) => (
                        <div
                          key={hOp.helper_id}
                          className="bg-gray-50 p-3 mt-2 mb-3 border rounded-md sm:p-4 sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer hover:bg-gray-100 hover:shadow-md transition-colors duration-200"
                        >
                          <div className="">
                            <h3 className="font-semibold uppercase text-lg">
                              {hOp.operation_name || "N/A"}
                            </h3>
                          </div>

                          <div className="">
                            <div className="mt-2 relative">
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                {`ID: ${hOp.helper_id}` || "N/A"}
                              </span>
                              <span className="bg-green-50 text-green-700 px-2 py-1 rounded ml-2">
                                Type: Helper
                              </span>
                              <span className="text-sm ml-3">{`Created: ${formatDate(
                                hOp.createdAt,
                              )}`}</span>
                              <span className="absolute right-8 bg-blue-200/40 px-2 py-1 rounded-full text-blue-800 font-semibold">
                                {`SMV: ${hOp.mc_smv}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div
                    className=" w-full border shadow-sm rounded-md flex justify-center items-center p-4"
                    onBlur={() => setHelperFocus(false)}
                    onFocus={() => setHelperFocus(true)}
                    tabIndex={0}
                  >
                    <div
                      className={`flex flex-col items-center text-gray-400 ${helperFocus ? "animate-pulse" : ""}`}
                    >
                      <MdPersonOff className={`text-5xl`} />
                      <h5 className="font-semibold">
                        No Helper Operations Found
                      </h5>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};

export default ViewStyleDetails;
