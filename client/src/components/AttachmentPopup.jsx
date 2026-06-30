import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaUpload, FaSpinner, FaImage, FaVideo } from "react-icons/fa";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Swal from "sweetalert2";

const AttachmentPopup = ({
  isOpen,
  onClose,
  isVideo,
  onUploadSuccess,
  folderId,
}) => {
  const fileInputRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  // folder name live search
  const [keyWord, setKeyWord] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [folderData, setFolderData] = useState([]);

  const suggestionsRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const searchFolders = async () => {
    if (keyWord.trim().length <= 2) {
      console.log("returning");
      return;
    }

    try {
      console.log("calling api");
      setIsSearching(true);
      const response = await axios.get(
        `${apiUrl}/api/attachment-folder/get-folders/${keyWord}`,
        { withCredentials: true },
      );
      setFolderData(response.data.data);
      console.log(response);
    } catch (error) {
      console.error("Error while finding folders:", error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    console.log("calling search folder function");
    const timeOut = setTimeout(searchFolders, 300);

    return () => clearTimeout(timeOut);
  }, [keyWord]);

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
    folderName: Yup.number().required("Folder Name is required"),
  });

  // Reset form when popup closes
  useEffect(() => {
    if (!isOpen) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {isVideo ? (
              <FaVideo className="text-purple-500" />
            ) : (
              <FaImage className="text-blue-500" />
            )}
            Upload Attachment {isVideo ? "Video" : "Image"}
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
            fileName: "",
            description: "",
            folderName: folderId,
          }}
          validationSchema={validationSchema}
          onSubmit={async (
            values,
            { resetForm, setSubmitting, setFieldError },
          ) => {
            try {
              const formData = new FormData();
              formData.append("attachment", values.attachment);
              formData.append("fileName", values.fileName);
              formData.append("folderName", values.folderName);
              formData.append("description", values.description);
              formData.append("mediaType", isVideo ? "video" : "image");

              const response = await axios.post(
                `${apiUrl}/api/attachment/attachment-media/upload`,
                formData,
                {
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
                },
              );

              if (response.status === 200 || response.status === 201) {
                Swal.fire({
                  title: "Success!",
                  text: `Attachment ${isVideo ? "video" : "image"} uploaded successfully`,
                  icon: "success",
                  timer: 2000,
                  showConfirmButton: false,
                });

                // Reset form and close on success
                resetForm();
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }

                // Callback to refresh parent
                if (onUploadSuccess) {
                  onUploadSuccess();
                }

                onClose();
              }
            } catch (error) {
              console.error("Upload failed:", error);

              let errorMessage = "Upload failed. Please try again.";
              if (error.response) {
                errorMessage = error.response.data.message || errorMessage;
              } else if (error.request) {
                errorMessage =
                  "No response from server. Please check your connection.";
              }

              Swal.fire({
                title: "Error",
                text: errorMessage,
                icon: "error",
              });

              setFieldError("attachment", errorMessage);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ values, setFieldValue, isSubmitting }) => (
            <Form>
              {console.log("formik values: ", values)};{/* Body */}
              <div className="space-y-5 p-6">
                {/* File Upload */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Select a {isVideo ? "Video" : "Image"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={isVideo ? "video/*" : "image/*"}
                    onChange={(event) => {
                      const file = event.currentTarget.files[0];
                      if (file) {
                        setFieldValue("attachment", file);
                        // Auto-fill file name if empty
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
                  <ErrorMessage
                    name="attachment"
                    component="p"
                    className="mt-1 text-sm text-red-500"
                  />
                  {values.attachment && (
                    <p className="mt-1 text-sm text-green-600">
                      Selected: {values.attachment.name} (
                      {(values.attachment.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
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
                    Choose a descriptive name for your file (3-100 characters)
                  </p>
                  <ErrorMessage
                    name="fileName"
                    component="p"
                    className="mt-1 text-sm text-red-500"
                  />
                </div>

                {/* folder name */}
                {!folderId && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Folder Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" ref={suggestionsRef}>
                      <input
                        type="text"
                        value={keyWord}
                        placeholder="Enter a name for the file..."
                        className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        onFocus={() => setShowSuggestions(true)}
                        onChange={(e) => setKeyWord(e.target.value)}
                      />

                      {showSuggestions && (
                        <div className="absolute left-0 top-full mt-1 w-full z-50 bg-white shadow-md rounded-md border">
                          {folderData.length > 0 ? (
                            <ul>
                              {folderData.map((folder) => (
                                <li
                                  key={folder.id}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => {
                                    setFieldValue(
                                      "folderName",
                                      folder.folder_id,
                                    );
                                    setKeyWord(folder.folder_name);
                                    setShowSuggestions(false);
                                  }}
                                >
                                  {folder.folder_name}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="px-3 py-2 text-gray-500">
                              No folder found
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Choose a descriptive name for your file (3-100 characters)
                    </p>
                    <ErrorMessage
                      name="folderName"
                      component="p"
                      className="mt-1 text-sm text-red-500"
                    />
                  </div>
                )}

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
                  <p className="mt-1 text-xs text-gray-500">
                    Describe what this file is about (10-500 characters)
                  </p>
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

export default AttachmentPopup;
