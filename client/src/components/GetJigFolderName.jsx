// components/GetJigFolderName.jsx
import React, { useEffect, useRef, useState } from "react";
import { CgClose } from "react-icons/cg";
import axios from "axios";

const GetJigFolderName = ({ isOpen, onClose, onCreate, refresh }) => {
  const [folderName, setFolderName] = useState("");
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const [sMessage, setSMessage] = useState({ status: "", msg: "" });
  const apiUrl = import.meta.env.VITE_API_URL;
  const [countdown, setCountdown] = useState(null);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) {
      return;
    }

    try {
      const response = await axios.post(
        `${apiUrl}/api/jig-folders/create-jig-folder`,
        { folderName: folderName.trim() },
        { withCredentials: true },
      );

      if (response.status === 201 || response.status === 200) {
        setSMessage({
          status: "Ok",
          msg: response.data.msg || "Folder created successfully",
        });

        setCountdown(3);
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setFolderName("");
              setSMessage({ status: "", msg: "" });
              if (onCreate) onCreate(folderName.trim());
              onClose();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        if (refresh) refresh();
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      setSMessage({
        status: "Error",
        msg: error.response?.data?.msg || "Failed to create folder",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white rounded-md shadow-2xl transform transition-all duration-300 p-6 sm:p-8"
      >
        {/* Close Button */}
        <button
          className="absolute right-2 top-2 p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 group"
          onClick={onClose}
          aria-label="Close modal"
        >
          <CgClose
            size={20}
            className="group-hover:rotate-90 transition-transform duration-200"
          />
        </button>

        {/* Header */}
        <h2
          id="folder-modal-title"
          className="text-center text-xl font-semibold text-gray-800 mb-6"
        >
          Enter Jig Folder Name
        </h2>

        {/* Input Field */}
        <form onSubmit={onSubmit}>
          <div className="mb-6">
            <input
              ref={inputRef}
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 text-lg placeholder:text-gray-400"
              placeholder="Ex: Operation 1, Sample Folder, etc."
              maxLength={50}
              aria-label="Folder name"
            />
            {sMessage.msg === "" ? (
              <p className="mt-2 text-xs text-gray-500">
                {folderName.length}/50 characters
              </p>
            ) : (
              <div className="flex gap-x-3 mt-2">
                <p
                  className={
                    sMessage.status === "Ok" ? "text-green-500" : "text-red-500"
                  }
                >
                  {sMessage.msg}
                  {sMessage.status === "Ok" && countdown > 0 && (
                    <> Closing in {countdown}...</>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              type="submit"
              className="flex-1 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-lg"
              disabled={!folderName.trim()}
            >
              Create Folder
            </button>

            <button
              type="button"
              className="flex-1 py-2 border-2 hover:bg-gray-100/40 text-gray-700 font-semibold rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 text-lg"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GetJigFolderName;
