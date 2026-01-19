import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import useStyles from "../hooks/useStyles";
import Swal from "sweetalert2";

const AddOpExcel = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const { isLoading, refresh, stylesList } = useStyles([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [delayedStyle, setDelayedStyle] = useState("");
  const [selectedOperations, setSelectedOperations] = useState({
    mainOperations: {},
    subOperations: {},
  });
  const [submitting, setSubmitting] = useState(false);
  const [style, setStyle] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const validExtensions = [".xlsx", ".xls"];

    const fileExtension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (
      !validTypes.includes(selectedFile.type) &&
      !validExtensions.includes(fileExtension)
    ) {
      setError("Please select a valid Excel file (.xlsx or .xls)");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError("");
    setResult(null);
    setSelectedOperations({
      mainOperations: {},
      subOperations: {},
    });
  };

  // Enhanced style search with debouncing
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDelayedStyle(style);
    }, 300);

    return () => clearTimeout(timeout);
  }, [style]);

  // Filter styles based on search
  const filteredStyles = useMemo(() => {
    const list = stylesList || []; // fallback if null

    if (!delayedStyle) return list.slice(0, 10); // Show first 10 when no search

    return list
      .filter((item) => {
        // Handle both string and object styles
        const styleText = typeof item === "object" ? item.style_no : item;
        return styleText.toLowerCase().includes(delayedStyle.toLowerCase());
      })
      .slice(0, 15); // Limit results
  }, [delayedStyle, stylesList]);

  // Handle style selection
  const handleStyleSelect = (selectedStyle) => {
    const styleValue =
      typeof selectedStyle === "object"
        ? selectedStyle.style_no
        : selectedStyle;
    setStyle(styleValue);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    console.log("Selected style:", styleValue);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredStyles.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredStyles.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredStyles[highlightedIndex]) {
          handleStyleSelect(filteredStyles[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle input change
  const handleStyleChange = (e) => {
    const { value } = e.target;
    setStyle(value);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSelectedOperations({
      mainOperations: {},
      subOperations: {},
    });

    const formData = new FormData();
    formData.append("excelFile", file);

    try {
      const response = await axios.post(
        `${apiUrl}/api/operationBulleting/uploadExcel`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        setResult(response.data);
        setStyle(response.data?.styleId || "");
        console.log(response);

        // Initialize all main operations and sub-operations as selected by default
        const initialMainOperations = {};
        const initialSubOperations = {};

        response.data.data.forEach((mainOp, mainIndex) => {
          initialMainOperations[mainIndex] = true;
          initialSubOperations[mainIndex] = {};
          mainOp.SubOperations.forEach((subOp, subIndex) => {
            initialSubOperations[mainIndex][subIndex] = true;
          });
        });

        setSelectedOperations({
          mainOperations: initialMainOperations,
          subOperations: initialSubOperations,
        });
      } else {
        setError(response.data.error || "Failed to process file");
      }
    } catch (err) {
      console.error("Upload error:", err);
      if (err.code === "ECONNABORTED") {
        setError("Request timeout - file might be too large");
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 413) {
        setError("File too large - please select a smaller file");
      } else {
        setError("Upload failed - please check your connection and try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError("");
    setResult(null);
    setSelectedOperations({
      mainOperations: {},
      subOperations: {},
    });
  };

  // Handle checkbox change for individual sub-operations
  const handleSubOperationChange = (mainIndex, subIndex, checked) => {
    setSelectedOperations((prev) => ({
      ...prev,
      subOperations: {
        ...prev.subOperations,
        [mainIndex]: {
          ...prev.subOperations[mainIndex],
          [subIndex]: checked,
        },
      },
    }));
  };

  // Handle checkbox change for entire main operation
  const handleMainOperationChange = (mainIndex, checked) => {
    setSelectedOperations((prev) => {
      const newSubOperations = { ...prev.subOperations };
      const newMainOperations = { ...prev.mainOperations };

      if (checked) {
        newMainOperations[mainIndex] = true;
        newSubOperations[mainIndex] = {};
        result.data[mainIndex].SubOperations.forEach((_, subIndex) => {
          newSubOperations[mainIndex][subIndex] = true;
        });
      } else {
        newMainOperations[mainIndex] = false;
        newSubOperations[mainIndex] = {};
      }

      return {
        mainOperations: newMainOperations,
        subOperations: newSubOperations,
      };
    });
  };

  // Check if all sub-operations in a main operation are selected
  const isMainOperationSelected = (mainIndex) => {
    return !!selectedOperations.mainOperations[mainIndex];
  };

  // Check if some sub-operations in a main operation are selected
  const isMainOperationIndeterminate = (mainIndex) => {
    if (!selectedOperations.subOperations[mainIndex]) return false;
    const subOps = result.data[mainIndex].SubOperations;
    const selectedCount = Object.values(
      selectedOperations.subOperations[mainIndex] || {}
    ).filter(Boolean).length;
    return selectedCount > 0 && selectedCount < subOps.length;
  };

  // Get selected count for statistics
  const getSelectionStats = () => {
    if (!result) return { total: 0, selectedMain: 0, selectedSub: 0 };

    let totalMain = result.data.length;
    let totalSub = 0;
    let selectedMain = 0;
    let selectedSub = 0;

    result.data.forEach((mainOp, mainIndex) => {
      totalSub += mainOp.SubOperations.length;

      if (selectedOperations.mainOperations[mainIndex]) {
        selectedMain++;
      }

      if (selectedOperations.subOperations[mainIndex]) {
        Object.values(selectedOperations.subOperations[mainIndex]).forEach(
          (isSelected) => {
            if (isSelected) selectedSub++;
          }
        );
      }
    });

    return {
      totalMain,
      totalSub,
      selectedMain,
      selectedSub,
      total: totalMain + totalSub,
      selected: selectedMain + selectedSub,
    };
  };

  // Prepare data for submission with required field for both main and sub operations
  const prepareDataForSubmission = () => {
    return result.data.map((mainOp, mainIndex) => ({
      ...mainOp,
      required: selectedOperations.mainOperations[mainIndex] ? "true" : "false",
      SubOperations: mainOp.SubOperations.map((subOp, subIndex) => ({
        ...subOp,
        required: selectedOperations.subOperations[mainIndex]?.[subIndex]
          ? "true"
          : "false",
      })),
    }));
  };

  // Submit selected operations to backend
  const handleSubmitSelected = async () => {
    if (!style) {
      Swal.fire({
        title: "Please select a style before submit",
        icon: "warning",
        showCancelButton: false,
      });
      return;
    }
    if (!result) return;
    // alert(style);
    setSubmitting(true);
    try {
      const dataToSubmit = prepareDataForSubmission();
      const stats = getSelectionStats();

      console.log("Submitting data:", dataToSubmit);

      const response = await axios.post(
        `${apiUrl}/api/operationBulleting/saveOperations/${style}`,
        {
          operations: dataToSubmit,
          fileName: result.summary.fileName,
          selectionStats: stats,
        },
        { withCredentials: true },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        alert(
          `✅ Successfully saved ${stats.selectedMain} main operations and ${stats.selectedSub} sub-operations to database!`
        );
        console.log("Save response:", response.data);
      } else {
        setError(response.data.error || "Failed to save operations");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError(err?.response?.data.error || "Failed to save operations - please try again");
    } finally {
      setSubmitting(false);
    }
  };

  // Select all operations
  const handleSelectAll = () => {
    const newMainOperations = {};
    const newSubOperations = {};

    result.data.forEach((mainOp, mainIndex) => {
      newMainOperations[mainIndex] = true;
      newSubOperations[mainIndex] = {};
      mainOp.SubOperations.forEach((_, subIndex) => {
        newSubOperations[mainIndex][subIndex] = true;
      });
    });

    setSelectedOperations({
      mainOperations: newMainOperations,
      subOperations: newSubOperations,
    });
  };

  // Deselect all operations
  const handleDeselectAll = () => {
    setSelectedOperations({
      mainOperations: {},
      subOperations: {},
    });
  };

  const selectionStats = getSelectionStats();

  return (
    <div className="bg-white w-full h-full py-2 md:px-2">
      <div className="w-full border rounded-lg md:p-6">
        {/* Enhanced Style Search */}
        <div className="pb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Style:
          </label>
          <div className="relative">
            <input
              type="text"
              className="w-full border border-gray-300 py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search styles..."
              onChange={handleStyleChange}
              onKeyDown={handleKeyDown}
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(true);
              }}
              value={style}
            />

            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute right-3 top-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* Dropdown */}
            {showDropdown && filteredStyles.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredStyles.map((item, index) => {
                  const styleText =
                    typeof item === "object" ? item.style_no : item;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={index}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        isHighlighted
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleStyleSelect(item)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      {styleText}
                    </div>
                  );
                })}
              </div>
            )}

            {/* No results message */}
            {showDropdown && filteredStyles.length === 0 && delayedStyle && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                <div className="px-3 py-2 text-gray-500">
                  No styles found matching "{delayedStyle}"
                </div>
              </div>
            )}
          </div>

          {/* Selected style info */}
          {/* {style && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <span className="text-sm text-green-700">
                Selected style: <strong>{style}</strong>
              </span>
            </div>
          )} */}
        </div>

        {/* excel upload part */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragActive ? "bg-blue-50" : "border-gray-300 hover:bg-blue-50"
          } ${loading ? "opacity-50 pointer-events-none" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-blue hover:bg-blue-50"
            } ${loading ? "opacity-50 pointer-events-none" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />

            <div className="pointer-events-none">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="flex flex-col items-center justify-center gap-1">
                <p className="text-lg font-medium text-gray-900">
                  {file ? file.name : "Upload Excel File"}
                </p>
                <p className="text-sm text-gray-500">
                  {file
                    ? "Click to change file"
                    : "Drag & drop or click to browse"}
                </p>
                <p className="text-xs text-gray-400">
                  Supports .xlsx, .xls files
                </p>
              </div>
            </div>
          </div>

          {/* Selected File Info */}
          {file && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg
                  className="h-8 w-8 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="text-red-500 hover:text-red-700 transition-colors"
                disabled={loading}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Upload Button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !file || loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                "Process Excel File"
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-700">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Success Results with Selection */}
        {result && (
          <div className="mt-6 space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 text-green-700">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium">{result.message}</span>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Select Operations to Save
                </h3>
                <div className="text-sm text-gray-600">
                  {selectionStats.selectedMain} of {selectionStats.totalMain}{" "}
                  main operations, {selectionStats.selectedSub} of{" "}
                  {selectionStats.totalSub} sub-operations selected
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Deselect All
                </button>
                <button
                  onClick={handleSubmitSelected}
                  disabled={selectionStats.selected === 0 || submitting}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    selectionStats.selected === 0 || submitting
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                >
                  {submitting
                    ? "Saving..."
                    : `Save Selected (${selectionStats.selected})`}
                </button>
              </div>
            </div>

            {/* Operations with Checkboxes */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Extracted Operations
              </h3>

              {result.data.map((mainOp, mainIndex) => (
                <div key={mainIndex} className="mb-4 last:mb-0">
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    {/* Main Operation Header with Checkbox */}
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={isMainOperationSelected(mainIndex)}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate =
                              isMainOperationIndeterminate(mainIndex);
                          }
                        }}
                        onChange={(e) =>
                          handleMainOperationChange(mainIndex, e.target.checked)
                        }
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <h4 className="font-medium text-blue-600 ml-2">
                        {mainOp.MainOperation}
                      </h4>
                      <span className="ml-2 text-xs text-gray-500">
                        ({mainOp.SubOperations.length} sub-operations)
                      </span>
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 hidden md:blockl">
                        Feature
                      </span>
                    </div>

                    {/* Sub Operations */}
                    <div className="space-y-2 ml-6">
                      {mainOp.SubOperations.map((subOp, subIndex) => (
                        <div
                          key={subIndex}
                          className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center flex-1">
                            <input
                              type="checkbox"
                              checked={
                                !!selectedOperations.subOperations[mainIndex]?.[
                                  subIndex
                                ]
                              }
                              onChange={(e) =>
                                handleSubOperationChange(
                                  mainIndex,
                                  subIndex,
                                  e.target.checked
                                )
                              }
                              className="h-4 w-4 text-green-600 rounded focus:ring-green-500 mr-3"
                            />
                            <div>
                              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mr-2 hidden md:block">
                                #{subOp.OperationNo}
                              </span>
                              <span className="text-sm text-gray-700">
                                {subOp.Operation}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {subOp["M/C Type"]} • SMV: {subOp["MC SMV"]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* JSON Preview (for debugging) */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600">
                Preview JSON to be submitted
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(prepareDataForSubmission(), null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddOpExcel;
