import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaTimes, FaUpload, FaSpinner, FaCheck } from "react-icons/fa";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import useSubOperations from "../hooks/useSubOperations";
import useStylesLiveSearch from "../hooks/useStylesLiveSearch";
import axios from "axios";
import Swal from "sweetalert2";

const AttachmentPopupMedia = ({ isOpen, onClose, isAttachment, isVideo }) => {
  // Operation search states
  const [operationKeyword, setOperationKeyword] = useState("");
  const [debouncedOperationKeyword, setDebouncedOperationKeyword] =
    useState("");
  const [isSearchingOperation, setIsSearchingOperation] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [isOperationDropdownOpen, setIsOperationDropdownOpen] = useState(false);
  const operationSearchTimeoutRef = useRef(null);
  const operationDropdownRef = useRef(null);
  const operationInputRef = useRef(null);

  // Style search states
  const [styleKeyword, setStyleKeyword] = useState("");
  const [debouncedStyleKeyword, setDebouncedStyleKeyword] = useState("");
  const [isSearchingStyle, setIsSearchingStyle] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const styleSearchTimeoutRef = useRef(null);
  const styleDropdownRef = useRef(null);
  const styleInputRef = useRef(null);

  // Use debounced keywords for API calls
  const { refresh: refreshOperations, subOpList } = useSubOperations(
    debouncedOperationKeyword,
  );
  const { stylesList, refresh: refreshStyles } = useStylesLiveSearch(
    debouncedStyleKeyword,
  );

  // Debounce operation search input
  useEffect(() => {
    if (operationSearchTimeoutRef.current) {
      clearTimeout(operationSearchTimeoutRef.current);
    }

    setIsSearchingOperation(true);
    setIsOperationDropdownOpen(true);

    operationSearchTimeoutRef.current = setTimeout(() => {
      setDebouncedOperationKeyword(operationKeyword);
      setIsSearchingOperation(false);
    }, 300);

    return () => {
      if (operationSearchTimeoutRef.current) {
        clearTimeout(operationSearchTimeoutRef.current);
      }
    };
  }, [operationKeyword]);

  // Debounce style search input
  useEffect(() => {
    if (styleSearchTimeoutRef.current) {
      clearTimeout(styleSearchTimeoutRef.current);
    }

    setIsSearchingStyle(true);
    setIsStyleDropdownOpen(true);

    styleSearchTimeoutRef.current = setTimeout(() => {
      setDebouncedStyleKeyword(styleKeyword);
      setIsSearchingStyle(false);
    }, 300);

    return () => {
      if (styleSearchTimeoutRef.current) {
        clearTimeout(styleSearchTimeoutRef.current);
      }
    };
  }, [styleKeyword]);

  // Reset search when popup closes
  useEffect(() => {
    if (!isOpen) {
      // Reset operation states
      setOperationKeyword("");
      setDebouncedOperationKeyword("");
      setIsSearchingOperation(false);
      setSelectedOperation(null);
      setIsOperationDropdownOpen(false);

      // Reset style states
      setStyleKeyword("");
      setDebouncedStyleKeyword("");
      setIsSearchingStyle(false);
      setSelectedStyle(null);
      setIsStyleDropdownOpen(false);
    }
  }, [isOpen]);

  // Handle click outside to close operation dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        operationDropdownRef.current &&
        !operationDropdownRef.current.contains(event.target)
      ) {
        setIsOperationDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle click outside to close style dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        styleDropdownRef.current &&
        !styleDropdownRef.current.contains(event.target)
      ) {
        setIsStyleDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle operation selection
  const handleSelectOperation = (operation, setFieldValue) => {
    setSelectedOperation(operation);
    setOperationKeyword(operation.sub_operation_name);
    setFieldValue("operation", operation.sub_operation_id);
    setIsOperationDropdownOpen(false);
    setIsSearchingOperation(false);
  };

  // Handle style selection
  const handleSelectStyle = (style, setFieldValue) => {
    setSelectedStyle(style);
    setStyleKeyword(style.style_no || style.style_name || style);
    setFieldValue("styleNo", style.style_no || style);
    setIsStyleDropdownOpen(false);
    setIsSearchingStyle(false);
  };

  const validationSchema = Yup.object({
    attachment: Yup.mixed()
      .required(`Please select an ${isVideo ? "Video" : "Image"}`)
      .test(
        "fileType",
        `Only ${isVideo ? "Video" : "Image"} files are allowed`,
        (value) => {
          if (!value) return false;

          const allowedTypes = isVideo
            ? ["video/mp4", "video/webm", "video/ogg"]
            : ["image/jpeg", "image/jpg", "image/png", "image/webp"];

          return allowedTypes.includes(value.type);
        },
      )
      .test("fileSize", `File size must be less than 5MB`, (value) => {
        if (!value) return false;
        return value.size <= 5 * 1024 * 1024;
      }),
    operation: Yup.string().required("Operation is required"),
    styleNo: Yup.string().required("Style number is required"),
    description: Yup.string()
      .required("Description is required")
      .min(10, "Description must contain at least 10 characters"),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            Upload {isAttachment ? "Attachment" : "Jig Operation"} Media
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 hover:bg-gray-100 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <Formik
          initialValues={{
            attachment: null,
            operation: "",
            styleNo: "",
            description: "",
          }}
          validationSchema={validationSchema}
          onSubmit={async (
            values,
            { resetForm, setSubmitting, setFieldError },
          ) => {
            try {
              const formData = new FormData();
              formData.append("attachment", values.attachment);
              formData.append("operation", values.operation);
              formData.append("styleNo", values.styleNo);
              formData.append("description", values.description);
              formData.append("mediaType", isVideo ? "video" : "image");

              const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/jig-operations/upload-jig-operation-media`,
                formData,
                {
                  withCredentials: true,
                  headers: {
                    "Content-Type": "multipart/form-data",
                  },
                  onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                      (progressEvent.loaded * 100) / progressEvent.total,
                    );
                    console.log(`Upload progress: ${percentCompleted}%`);
                  },
                },
              );

              if (response.status == 200 || response.status == 201) {
                Swal.fire({
                  title: "Success",
                  text: "File upload success",
                  icon: "success",
                });
              }
              console.log("Upload successful:", response.data);

              // Reset form and close on success
              resetForm();
              setOperationKeyword("");
              setDebouncedOperationKeyword("");
              setSelectedOperation(null);
              setStyleKeyword("");
              setDebouncedStyleKeyword("");
              setSelectedStyle(null);
              onClose();
            } catch (error) {
              console.error("Upload failed:", error);
              Swal.fire({
                title: "Error",
                text: `File failed ${error.message}`,
                icon: "error",
              });

              if (error.response) {
                setFieldError(
                  "attachment",
                  error.response.data.message || "Upload failed",
                );
              } else if (error.request) {
                setFieldError(
                  "attachment",
                  "No response from server. Please try again.",
                );
              } else {
                setFieldError("attachment", error.message || "Upload failed");
              }
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ values, setFieldValue, isSubmitting }) => (
            <Form>
              {/* Body */}
              <div className="space-y-5 p-6">
                {/* File Upload */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Select a {isVideo ? "Video" : "Image"}
                  </label>
                  <input
                    type="file"
                    accept={isVideo ? "video/*" : "image/*"}
                    onChange={(event) => {
                      const file = event.currentTarget.files[0];
                      if (file) {
                        setFieldValue("attachment", file);
                      }
                    }}
                    className="w-full rounded-md border p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <ErrorMessage
                    name="attachment"
                    component="p"
                    className="mt-1 text-sm text-red-500"
                  />
                </div>

                {/* Operation with Live Search - Direct dropdown */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Operation Name <span className="text-red-500">*</span>
                  </label>

                  <div className="relative" ref={operationDropdownRef}>
                    <div className="relative">
                      <input
                        ref={operationInputRef}
                        type="text"
                        value={operationKeyword}
                        onChange={(e) => {
                          setOperationKeyword(e.target.value);
                          if (e.target.value === "") {
                            setSelectedOperation(null);
                            setFieldValue("operation", "");
                          }
                        }}
                        onFocus={() => {
                          if (operationKeyword.length > 0) {
                            setIsOperationDropdownOpen(true);
                          }
                        }}
                        placeholder="Type to search operations..."
                        className="w-full rounded-md border p-2 pr-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      {isSearchingOperation && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <FaSpinner className="animate-spin text-gray-400" />
                        </div>
                      )}
                      {selectedOperation && !isSearchingOperation && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <FaCheck className="text-green-500" />
                        </div>
                      )}
                    </div>

                    {/* Operation Dropdown results */}
                    {isOperationDropdownOpen && operationKeyword.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {isSearchingOperation ? (
                          <div className="flex items-center justify-center p-4">
                            <FaSpinner className="animate-spin text-gray-400 mr-2" />
                            <span className="text-gray-500">Searching...</span>
                          </div>
                        ) : subOpList && subOpList.length > 0 ? (
                          <ul className="py-1">
                            {subOpList.map((operation) => (
                              <li
                                key={operation.sub_operation_id}
                                onClick={() =>
                                  handleSelectOperation(
                                    operation,
                                    setFieldValue,
                                  )
                                }
                                className={`cursor-pointer px-4 py-2 hover:bg-blue-50 transition-colors ${
                                  selectedOperation?.sub_operation_id ===
                                  operation.sub_operation_id
                                    ? "bg-blue-50"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{operation.sub_operation_name}</span>
                                  {selectedOperation?.sub_operation_id ===
                                    operation.sub_operation_id && (
                                    <FaCheck
                                      className="text-blue-500"
                                      size={14}
                                    />
                                  )}
                                </div>
                                {operation.sub_operation_code && (
                                  <span className="text-xs text-gray-500">
                                    Code: {operation.sub_operation_code}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            No operations found for "{operationKeyword}"
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hidden field for form validation */}
                    <input
                      type="hidden"
                      name="operation"
                      value={values.operation}
                    />
                  </div>

                  <ErrorMessage
                    name="operation"
                    component="p"
                    className="mt-1 text-sm text-red-500"
                  />
                </div>

                {/* Style Number with Live Search - Direct dropdown */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Style Number <span className="text-red-500">*</span>
                  </label>

                  <div className="relative" ref={styleDropdownRef}>
                    <div className="relative">
                      <input
                        ref={styleInputRef}
                        type="text"
                        value={styleKeyword}
                        onChange={(e) => {
                          setStyleKeyword(e.target.value);
                          if (e.target.value === "") {
                            setSelectedStyle(null);
                            setFieldValue("styleNo", "");
                          }
                        }}
                        onFocus={() => {
                          if (styleKeyword.length > 0) {
                            setIsStyleDropdownOpen(true);
                          }
                        }}
                        placeholder="Type to search styles..."
                        className="w-full rounded-md border p-2 pr-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      {isSearchingStyle && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <FaSpinner className="animate-spin text-gray-400" />
                        </div>
                      )}
                      {selectedStyle && !isSearchingStyle && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <FaCheck className="text-green-500" />
                        </div>
                      )}
                    </div>

                    {/* Style Dropdown results */}
                    {isStyleDropdownOpen && styleKeyword.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {isSearchingStyle ? (
                          <div className="flex items-center justify-center p-4">
                            <FaSpinner className="animate-spin text-gray-400 mr-2" />
                            <span className="text-gray-500">Searching...</span>
                          </div>
                        ) : stylesList && stylesList.length > 0 ? (
                          <ul className="py-1">
                            {stylesList.map((style, index) => (
                              <li
                                key={style.style_id || index}
                                onClick={() =>
                                  handleSelectStyle(style, setFieldValue)
                                }
                                className={`cursor-pointer px-4 py-2 hover:bg-blue-50 transition-colors ${
                                  selectedStyle?.style_id === style.style_id
                                    ? "bg-blue-50"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>
                                    {style.style_no ||
                                      style.style_name ||
                                      style}
                                  </span>
                                  {selectedStyle?.style_id ===
                                    style.style_id && (
                                    <FaCheck
                                      className="text-blue-500"
                                      size={14}
                                    />
                                  )}
                                </div>
                                {style.style_name && style.style_no && (
                                  <span className="text-xs text-gray-500">
                                    Name: {style.style_name}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            No styles found for "{styleKeyword}"
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hidden field for form validation */}
                    <input
                      type="hidden"
                      name="styleNo"
                      value={values.styleNo}
                    />
                  </div>

                  <ErrorMessage
                    name="styleNo"
                    component="p"
                    className="mt-1 text-sm text-red-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <Field
                    as="textarea"
                    name="description"
                    rows={4}
                    placeholder="Enter a description..."
                    className="w-full resize-none rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <ErrorMessage
                    name="description"
                    component="p"
                    className="mt-1 text-sm text-red-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t px-6 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border px-4 py-2 hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin" size={14} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaUpload size={14} />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AttachmentPopupMedia;
