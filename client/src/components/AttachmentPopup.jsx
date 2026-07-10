// AttachmentPopupMedia.jsx - CORRECTED VERSION
import React, { useState, useEffect, useRef } from "react";
import {
  FaTimes,
  FaUpload,
  FaSpinner,
  FaCheck,
  FaVideo,
  FaImage,
} from "react-icons/fa";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import useFolders from "../hooks/useFolders";
import axios from "axios";
import Swal from "sweetalert2";

const AttachmentPopupMedia = ({
  isOpen,
  onClose,
  isAttachment = false,
  isVideo = true,
  onUploadSuccess,
  folderId = null,
  hideFolderSearch = false,
}) => {
  // API endpoint based on type
  const apiUrl = import.meta.env.VITE_API_URL;
  const uploadEndpoint = isAttachment
    ? `${apiUrl}/api/attachment/attachment-media/upload`
    : `${apiUrl}/api/jig-operations/upload-jig-operation-media`;

  // Folder search states
  const [folderKeyword, setFolderKeyword] = useState("");
  const [debouncedFolderKeyword, setDebouncedFolderKeyword] = useState("");
  const [isSearchingFolder, setIsSearchingFolder] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const folderSearchTimeoutRef = useRef(null);
  const folderDropdownRef = useRef(null);

  // Use the generic hook with the correct type
  const folderType = isAttachment ? "attachment" : "jig";
  const { folders, refresh: refreshFolders } = useFolders(
    debouncedFolderKeyword,
    folderType,
  );

  // Debounce folder search input
  useEffect(() => {
    if (hideFolderSearch || folderId) return;

    if (folderSearchTimeoutRef.current) {
      clearTimeout(folderSearchTimeoutRef.current);
    }

    setIsSearchingFolder(true);
    setIsFolderDropdownOpen(true);

    folderSearchTimeoutRef.current = setTimeout(() => {
      setDebouncedFolderKeyword(folderKeyword);
      setIsSearchingFolder(false);
    }, 300);

    return () => {
      if (folderSearchTimeoutRef.current) {
        clearTimeout(folderSearchTimeoutRef.current);
      }
    };
  }, [folderKeyword, hideFolderSearch, folderId]);

  // Reset all states when popup closes
  useEffect(() => {
    if (!isOpen) {
      setFolderKeyword("");
      setDebouncedFolderKeyword("");
      setIsSearchingFolder(false);
      setSelectedFolder(null);
      setIsFolderDropdownOpen(false);
    }
  }, [isOpen]);

  // Handle click outside to close folder dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        folderDropdownRef.current &&
        !folderDropdownRef.current.contains(event.target)
      ) {
        setIsFolderDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle folder selection
  const handleSelectFolder = (folder, setFieldValue) => {
    setSelectedFolder(folder);
    setFolderKeyword(folder.folder_name);
    setFieldValue("folderName", folder.folder_id);
    setIsFolderDropdownOpen(false);
    setIsSearchingFolder(false);
  };

  // Validation schema - SAME for both attachment and jig
  const validationSchema = Yup.object({
    attachment: Yup.mixed()
      .required(`Please select an ${isVideo ? "Video" : "Image"}`)
      .test(
        "fileType",
        `Only ${isVideo ? "Video" : "Image"} files are allowed`,
        (value) => {
          if (!value) return false;
          const allowedTypes = isVideo
            ? ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
            : [
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/webp",
                "image/gif",
              ];
          return allowedTypes.includes(value.type);
        },
      ),
    fileName: Yup.string()
      .required("File name is required")
      .min(3, "File name must be at least 3 characters")
      .max(100, "File name must be less than 100 characters")
      .matches(
        /^[a-zA-Z0-9\s\-_\.]+$/,
        "File name can only contain letters, numbers, spaces, and - _ .",
      ),
    folderName: Yup.number().required("Folder is required"),
  });

  // Get initial values - SAME for both
  const getInitialValues = () => ({
    attachment: null,
    fileName: "",
    folderName: folderId || "",
    description: "",
  });

  // Handle form submission
  const handleSubmit = async (
    values,
    { resetForm, setSubmitting, setFieldError },
  ) => {
    console.log("🚀 Submitting with values:", values);

    try {
      const formData = new FormData();
      formData.append("attachment", values.attachment);
      formData.append("fileName", values.fileName);
      formData.append("folderName", values.folderName);
      formData.append("description", values.description);
      formData.append("mediaType", isVideo ? "video" : "image");

      const response = await axios.post(uploadEndpoint, formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      });

      if (response.status === 200 || response.status === 201) {
        await Swal.fire({
          title: "Success",
          text: `${isVideo ? "Video" : "Image"} uploaded successfully`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        if (onUploadSuccess) {
          onUploadSuccess();
        }

        resetForm();
        setFolderKeyword("");
        setSelectedFolder(null);
        onClose();
      }
    } catch (error) {
      console.error("Upload failed:", error);
      await Swal.fire({
        title: "Error",
        text: `Upload failed: ${error.response?.data?.message || error.message}`,
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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {isVideo ? (
              <FaVideo className="text-purple-500" />
            ) : (
              <FaImage className="text-blue-500" />
            )}
            Upload {isAttachment ? "Attachment" : "Jig Operation"}{" "}
            {isVideo ? "Video" : "Image"}
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
          initialValues={getInitialValues()}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({
            values,
            setFieldValue,
            isSubmitting,
            errors,
            touched,
            validateForm,
          }) => {
            console.log("🔍 Form errors:", errors);
            console.log("📝 Form values:", values);
            return (
              <Form>
                <div className="space-y-5 p-6">
                  {/* File Upload */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Select a {isVideo ? "Video" : "Image"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept={isVideo ? "video/*" : "image/*"}
                      onChange={(event) => {
                        const file = event.currentTarget.files[0];
                        if (file) {
                          setFieldValue("attachment", file);
                          if (!values.fileName) {
                            const nameWithoutExt = file.name.replace(
                              /\.[^/.]+$/,
                              "",
                            );
                            setFieldValue("fileName", nameWithoutExt);
                          }
                        }
                      }}
                      className="w-full rounded-md border p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {values.attachment && (
                      <p className="mt-2 text-sm text-gray-600">
                        Selected: {values.attachment.name} (
                        {(values.attachment.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    <ErrorMessage
                      name="attachment"
                      component="p"
                      className="mt-1 text-sm text-red-500"
                    />
                  </div>

                  {/* File Name */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      File Name <span className="text-red-500">*</span>
                    </label>
                    <Field
                      type="text"
                      name="fileName"
                      placeholder="Enter a name for the file..."
                      className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Choose a descriptive name (3-100 characters)
                    </p>
                    <ErrorMessage
                      name="fileName"
                      component="p"
                      className="mt-1 text-sm text-red-500"
                    />
                  </div>

                  {/* Folder Name - Show if folderId not provided */}
                  {!folderId && !hideFolderSearch && (
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Folder Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative" ref={folderDropdownRef}>
                        <div className="relative">
                          <input
                            type="text"
                            value={folderKeyword}
                            onChange={(e) => {
                              setFolderKeyword(e.target.value);
                              if (e.target.value === "") {
                                setSelectedFolder(null);
                                setFieldValue("folderName", "");
                              }
                            }}
                            onFocus={() => {
                              if (folderKeyword.length > 0) {
                                setIsFolderDropdownOpen(true);
                              }
                            }}
                            placeholder="Type to search folders..."
                            className="w-full rounded-md border p-2 pr-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                          {isSearchingFolder && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <FaSpinner className="animate-spin text-gray-400" />
                            </div>
                          )}
                          {selectedFolder && !isSearchingFolder && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <FaCheck className="text-green-500" />
                            </div>
                          )}
                        </div>

                        {/* Folder Dropdown results */}
                        {isFolderDropdownOpen && folderKeyword.length > 0 && (
                          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                            {isSearchingFolder ? (
                              <div className="flex items-center justify-center p-4">
                                <FaSpinner className="animate-spin text-gray-400 mr-2" />
                                <span className="text-gray-500">
                                  Searching...
                                </span>
                              </div>
                            ) : folders && folders.length > 0 ? (
                              <ul className="py-1">
                                {folders.map((folder) => (
                                  <li
                                    key={folder.folder_id}
                                    onClick={() =>
                                      handleSelectFolder(folder, setFieldValue)
                                    }
                                    className={`cursor-pointer px-4 py-2 hover:bg-blue-50 transition-colors ${
                                      selectedFolder?.folder_id ===
                                      folder.folder_id
                                        ? "bg-blue-50"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>{folder.folder_name}</span>
                                      {selectedFolder?.folder_id ===
                                        folder.folder_id && (
                                        <FaCheck
                                          className="text-blue-500"
                                          size={14}
                                        />
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                No {isAttachment ? "attachment" : "jig"} folders
                                found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <ErrorMessage
                        name="folderName"
                        component="p"
                        className="mt-1 text-sm text-red-500"
                      />
                    </div>
                  )}

                  {/* Display folder name if folderId is provided */}
                  {folderId && (
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Folder <span className="text-red-500">*</span>
                      </label>
                      <div className="w-full rounded-md border p-2 bg-gray-50 text-gray-600">
                        (Uploading to this folder)
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Description
                    </label>
                    <Field
                      as="textarea"
                      name="description"
                      rows={4}
                      placeholder="Enter a description (min 10 characters)..."
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
                <div className="flex justify-end gap-3 border-t px-6 py-4 sticky bottom-0 bg-white">
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
            );
          }}
        </Formik>
      </div>
    </div>
  );
};

export default AttachmentPopupMedia;
