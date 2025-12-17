import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import { BsArrowsMove } from "react-icons/bs";
import { MdEdit } from "react-icons/md";
import { MdOutlineDeleteForever } from "react-icons/md";
import { BiPlus } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import Swal from "sweetalert2";
import AddSubOperation from "./AddSubOperation";
import { motion, AnimatePresence } from "framer-motion";
import { LuConstruction } from "react-icons/lu"; //workstation icon
import { ArrowLeftIcon, CameraIcon } from "@heroicons/react/24/outline";
import { FaArrowLeft } from "react-icons/fa6";
import { BsFillCloudUploadFill } from "react-icons/bs"; //upload icon
import CameraOrBrowse from "./CameraOrBrowse";
import { useAuth } from "../hooks/useAuth";
import { FaPhotoVideo } from "react-icons/fa";
import { MdOutlineDriveFileRenameOutline } from "react-icons/md";
import { FaCheck } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import UploadMaterial from "./UploadMaterial";
import ImageCaptureOrBrowse from "./ImageCaptureorBrows";
import TechPackUploader from "./TechPackUploader";
import FolderDocumentsUploader from "./FolderDocumentsUploader";
import { FaPlay, FaImage, FaFileExcel, FaFolder } from "react-icons/fa";

const ViewWorkstations = () => {
  // alert("user role: ", userRole);
  const { user, loading } = useAuth();
  const userRole = user?.userRole;
  const apiUrl = import.meta.env.VITE_API_URL;
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = location; //layout id
  // alert(state);
  console.log("state:-- ", state);
  const [workstationList, setWorkstationList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingSubM, setIsAddingSubM] = useState(false);
  const [selectedWorkstation, setSelectedWorkstation] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingData, setUploadingData] = useState({
    style_id: "",
    styleNo: "",
    moId: "",
    sopId: "",
    sopName: "",
  });
  const [editingWorkstationId, setEditingWorkstationId] = useState(null);
  const [newWorkstationNo, setNewWorkstationNo] = useState("");
  const [uploadingMaterial, setUploadingMaterial] = useState(null);
  // alert(uploadingMaterial);

  const isUploadRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus input when editing starts
    if (editingWorkstationId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingWorkstationId]);

  useEffect(() => {
    // alert("is uploading ", isUploading);
    function handleClickOutside(event) {
      if (isUploadRef.current && !isUploadRef.current.contains(event.target)) {
        // call close function
        setIsUploading(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUploading]);

  console.log("ws list: ", workstationList);

  const workstatoinVarient = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.2,
      },
    },
    exit: {
      opacity: 0,
      x: 5,
    },
  };

  const workstationCardVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  const getWorkstations = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${apiUrl}/api/workstations/getWorkstations/${state.layout}`
      );
      setWorkstationList(response.data.data);
    } catch (error) {
      console.error(error);
      setError("Failed to load workstation data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadData = (moId, sopId, soName) => {
    // alert("handling upload data");
    setUploadingData((prev) => ({
      ...prev,
      style_id: state.style.style.style_id,
      styleNo: state.style.style.style_no,
      moId: moId,
      sopId: sopId,
      sopName: soName,
    }));
    console.log(`moid: ${moId} sopId: ${sopId} soName: ${soName}`);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleAddNewWorkstation = async () => {
    const { value: workstationNo } = await Swal.fire({
      title: "Enter number of your workstation",
      input: "text",
      inputLabel: "Workstation Number",
      inputPlaceholder: "e.g., WS-01",
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "You must enter a workstation number!";
        }
        return null;
      },
    });

    try {
      const response = await axios.post(
        `${apiUrl}/api/workstations/addEmptyWorkstation/${state.layout}`,
        { workstation_no: workstationNo },
        { withCredentials: true }
      );
      if (response.status === 200) {
        getWorkstations();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleWorkstationDelete = async (workstation_id) => {
    const isDelete = await Swal.fire({
      title: `Are you sure want to delete #${workstation_id} workstation`,
      icon: "warning",
      showCancelButton: true,
    });

    if (!isDelete.isConfirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${apiUrl}/api/workstations/deleteWS/${workstation_id}`
      );
      if (response.status === 200) {
        // await Swal.fire({
        //   title: "Workstation delete success",
        //   icon: "success",
        // });
        getWorkstations();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteSubOP = async (subOpId, wsId) => {
    // alert(wsId);
    const isDelete = await Swal.fire({
      title:
        "Are you sure want to delete this sub operation from your workstation?",
      icon: "question",
      showCancelButton: true,
    });

    if (!isDelete.isConfirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${apiUrl}/api/workstations/deleteSubOperation/${subOpId}/${wsId}`
      );

      if (response.status === 200) {
        Swal.fire({
          title: "Sub Operation delete success",
          icon: "success",
        });
        getWorkstations();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditWorkstation = (workstation) => {
    navigate("/workstation/edit", { state: workstation });
  };

  const openAddSubOperationModal = (workstation) => {
    setSelectedWorkstation(workstation);
    setIsAddingSubM(true);
  };

  const closeAddSubOperationModal = () => {
    setIsAddingSubM(false);
    setSelectedWorkstation(null);
  };

  // Function to start editing workstation number
  const startEditingWorkstation = (workstation) => {
    setEditingWorkstationId(workstation.workstation_id);
    setNewWorkstationNo(workstation.workstation_no || "");
  };

  // Function to cancel editing
  const cancelEditing = () => {
    setEditingWorkstationId(null);
    setNewWorkstationNo("");
  };

  // Function to save workstation number
  const saveWorkstationNo = async (workstationId) => {
    if (!newWorkstationNo.trim()) {
      Swal.fire({
        title: "Error",
        text: "Workstation number cannot be empty",
        icon: "error",
      });
      return;
    }

    try {
      const response = await axios.put(
        `${apiUrl}/api/workstations/renameWorkstation/${workstationId}`,
        { workstation_no: newWorkstationNo.trim() },
        { withCredentials: true }
      );

      if (response.status === 200) {
        // Update the workstation list with the new name
        setWorkstationList((prevList) =>
          prevList.map((ws) =>
            ws.workstation_id === workstationId
              ? { ...ws, workstation_no: newWorkstationNo.trim() }
              : ws
          )
        );
        setEditingWorkstationId(null);
        setNewWorkstationNo("");

        Swal.fire({
          title: "Success",
          text: "Workstation number updated successfully",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Error",
        text: "Failed to update workstation number",
        icon: "error",
      });
    }
  };

  useEffect(() => {
    getWorkstations();
  }, [state.layout]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader size={50} color="#2563EB" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 my-6 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={getWorkstations}
              className="mt-2 text-sm text-red-600 hover:text-red-500 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleNavigatetoMedia = (sub_operation_id) => {
    // alert(sub_operation_id);
    navigate("/sub-Operation/add-media", { state: sub_operation_id });
    // console.log("selected sub op ===== ", sub_operation);
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 relative">
      {/* take image or upload video */}
      <AnimatePresence>
        {!isAddingSubM && isUploading && (
          <motion.div
            ref={isUploadRef}
            initial={{ y: "100%", opacity: 0 }} // Start fully off-screen (bottom)
            animate={{ y: 0, opacity: 1 }} // Slide up into place
            exit={{ y: "100%", opacity: 0 }} // Slide back down when exiting
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed w[] left-0 backdrop-brightness-50 right-0 bottom-0 w-full z-50 lg:w-full lg:h-screen lg:flex lg:justify-center lg:items-center"
          >
            <div className="md:w-[45%]">
              {/* <CameraOrBrowse
                setIsUploading={setIsUploading}
                uploadingData={uploadingData}
              /> */}
              {uploadingMaterial === null && (
                <UploadMaterial
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                />
              )}

              {uploadingMaterial === "video" && (
                <CameraOrBrowse
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                />
              )}

              {uploadingMaterial === "image" && (
                <ImageCaptureOrBrowse
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                />
              )}

              {uploadingMaterial === "techpack" && (
                <TechPackUploader
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                />
              )}

              {uploadingMaterial === "folder" && (
                <FolderDocumentsUploader
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal Overlay */}
      {isAddingSubM && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full h-2/4 ">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-semibold">
                Add Sub-Operation to Workstation #
                {selectedWorkstation?.workstation_id}
              </h3>
              <button
                onClick={closeAddSubOperationModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <IoClose className="text-2xl" />
              </button>
            </div>
            <div className="p-4">
              <AddSubOperation
                style_id={state.layout}
                workstation_id={selectedWorkstation?.workstation_id}
                onSuccess={() => {
                  closeAddSubOperationModal();
                  getWorkstations();
                }}
                onCancel={closeAddSubOperationModal}
              />
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between">
          <div className="mb-8">
            <h1 className="font-bold text-gray-800 text-lg md:text-3xl">
              Workstation Details
            </h1>
            <p className="mt-0 md:mt-2 text-gray-600">
              <span className="hidden md:inline">Viewing workstation</span>{" "}
              information for layout #{state.layout}
            </p>
          </div>

          <div className="">
            {userRole === "Admin" || userRole === "SuperAdmin" ? (
              <button
                type="button"
                className="bg-blue-500 text-white px-2 md:px-4 py-2 rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl duration-150 group"
                onClick={() => handleAddNewWorkstation()}
              >
                <div className="flex items-center justify-center md:space-x-2">
                  <span className="hidden md:inline">Add workstation</span>
                  <LuConstruction className="text-3xl text-yellow-300 group-hover:scale-110 duration-150" />
                </div>
              </button>
            ) : (
              ""
            )}
          </div>
        </div>

        <div className="text-blue-600 hover:underline duration-150">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft /> Go back
          </button>
        </div>

        {Array.isArray(workstationList) && workstationList.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-gray-400"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No Workstations Found
            </h3>
            <p className="mt-2 text-gray-500">
              There are no workstations configured for this layout.
            </p>
            <button
              onClick={getWorkstations}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh
            </button>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              variants={workstatoinVarient}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {Array.isArray(workstationList) &&
                workstationList.map((workstation) => (
                  <motion.div
                    key={workstation.workstation_id}
                    variants={workstationCardVariant} // ✅ this enables staggering
                    className="bg-white shadow overflow-hidden rounded-lg divide-y divide-gray-200"
                  >
                    <div className="px-4 py-1 md:py-4 sm:px-6 bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between md:gap-4">
                        {/* Left Side */}
                        <div>
                          <h3 className="text-lg leading-6 font-medium text-gray-900">
                            <h5 className="mt-2 text-sm md:text-lg flex flex-wrap items-center gap-x-2 text-blue-900 ">
                              Workstation No #
                              {editingWorkstationId ===
                              workstation.workstation_id ? (
                                <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={newWorkstationNo}
                                    onChange={(e) =>
                                      setNewWorkstationNo(e.target.value)
                                    }
                                    className="px-2 py-1 border border-gray-300 rounded-md text-gray-700 text-sm w-32"
                                    placeholder="Enter workstation no"
                                  />
                                  <button
                                    onClick={() =>
                                      saveWorkstationNo(
                                        workstation.workstation_id
                                      )
                                    }
                                    className="hover:bg-green-300/40 p-1 rounded-md duration-150"
                                  >
                                    <FaCheck className="text-lg text-green-600" />
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="hover:bg-red-300/40 p-1 rounded-md duration-150"
                                  >
                                    <RxCross2 className="text-lg text-red-600" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                  {workstation.workstation_no
                                    ? workstation.workstation_no
                                    : "Not assigned yet"}
                                  {(userRole === "Admin" ||
                                    userRole === "SuperAdmin") && (
                                    <button
                                      onClick={() =>
                                        startEditingWorkstation(workstation)
                                      }
                                      className="hover:bg-gradient-to-br from-blue-300/40 to-blue-300/50 px-2 py-1 rounded-md duration-150"
                                    >
                                      <MdOutlineDriveFileRenameOutline className="text-xl text-blue-600" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </h5>
                          </h3>
                        </div>

                        {/* Right Side */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-2">
                          <span className="text-xs text-gray-500">
                            Created: {formatDate(workstation.createdAt)}
                          </span>
                          {(userRole === "Admin" ||
                            userRole === "SuperAdmin") && (
                            <div className="flex gap-x-2">
                              <button
                                className="bg-green-300/40 p-1 text-green-700 rounded"
                                onClick={() =>
                                  openAddSubOperationModal(workstation)
                                }
                              >
                                <BiPlus className="text-2xl hover:scale-150" />
                              </button>

                              <button
                                className="bg-red-300/40 p-1 text-red-700 rounded"
                                onClick={() =>
                                  handleWorkstationDelete(
                                    workstation.workstation_id
                                  )
                                }
                              >
                                <MdOutlineDeleteForever className="text-2xl hover:scale-150" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-5 sm:p-6">
                      <h4 className="text-xs md:text-base font-medium text-gray-900 mb-3">
                        Sub-op Count - {workstation.subOperations.length}
                      </h4>

                      {workstation.subOperations.length === 0 ? (
                        <p className="text-gray-500 text-sm">
                          No sub-operations assigned
                        </p>
                      ) : (
                        <div className="overflow-y-hidden overflow-x-auto md:overflow-x-hidden border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200 table-fixed">
                            <thead className="bg-gray-50 text-[10px] md:text-base">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-16">
                                  ID
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-64">
                                  Operation
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-24">
                                  SMV
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-40 text-center">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y text-xs md:text-base divide-gray-200">
                              {workstation.subOperations.map((subOp) => (
                                <tr
                                  key={`${workstation.workstation_id}-${subOp.sub_operation_id}`}
                                >
                                  <td className="px-4 py-3 font-medium text-gray-900 w-16">
                                    {subOp.sub_operation_id}
                                  </td>
                                  <td className="px-4 py-3 text-gray-900 font-medium w-64 truncate">
                                    {subOp.suboperatoin?.sub_operation_name ||
                                      "N/A"}
                                  </td>
                                  <td className="px-4 py-3 text-gray-500 w-24">
                                    {subOp.suboperatoin?.smv || "0.00"}
                                  </td>
                                  <td className="px-4 py-3 text-gray-500 w-24">
                                    {userRole === "Admin" ||
                                    userRole === "SuperAdmin" ? (
                                      <div className="space-x-2 flex">
                                        {/* Delete Sub-operation Button */}
                                        <button
                                          className="bg-red-300/40 p-1 text-red-700 rounded"
                                          title="Delete"
                                        >
                                          <MdOutlineDeleteForever
                                            onClick={() =>
                                              handleDeleteSubOP(
                                                subOp.sub_operation_id,
                                                workstation.workstation_id
                                              )
                                            }
                                            className="text-xl hover:scale-150"
                                          />
                                        </button>

                                        {/* Upload Media Button */}
                                        <button
                                          type="button"
                                          title="Upload media"
                                          className="bg-blue-300/40 p-1 text-blue-700 rounded"
                                          onClick={() => {
                                            handleUploadData(
                                              subOp.suboperatoin
                                                .main_operation_id,
                                              subOp.sub_operation_id,
                                              subOp.suboperatoin
                                                .sub_operation_name
                                            );
                                            setIsUploading(true);
                                          }}
                                        >
                                          <BsFillCloudUploadFill className="text-xl hover:scale-125" />
                                        </button>

                                        {/* Videos */}
                                        <button
                                          type="button"
                                          className="bg-blue-200 p-1 text-black/60 rounded"
                                          title="Watch videos"
                                          onClick={() =>
                                            navigate("/sub-operation/videos", {
                                              state: {
                                                subOpId: subOp.sub_operation_id,
                                              },
                                            })
                                          }
                                        >
                                          <FaPlay className="text-xl hover:scale-125" />
                                        </button>

                                        {/* Images */}
                                        <button
                                          type="button"
                                          title="Images"
                                          className="bg-blue-200 p-1 text-black/60 rounded"
                                          onClick={() =>
                                            navigate("/sub-operation/images", {
                                              state: {
                                                subOpId: subOp.sub_operation_id,
                                              },
                                            })
                                          }
                                        >
                                          <FaImage className="text-xl hover:scale-125" />
                                        </button>

                                        {/* Tech Packs */}
                                        <button
                                          type="button"
                                          title="Tech packs"
                                          className="bg-green-200 p-1 text-black/60 rounded"
                                          onClick={() =>
                                            navigate(
                                              "/sub-operation/tech_packs",
                                              {
                                                state: {
                                                  subOpId:
                                                    subOp.sub_operation_id,
                                                },
                                              }
                                            )
                                          }
                                        >
                                          <FaFileExcel className="text-xl hover:scale-125" />
                                        </button>

                                        {/* Documents */}
                                        <button
                                          type="button"
                                          title="Other documents"
                                          className="bg-blue-200 p-1 text-black/60 rounded"
                                          onClick={() =>
                                            navigate(
                                              "/sub-operation/documents",
                                              {
                                                state: {
                                                  subOpId:
                                                    subOp.sub_operation_id,
                                                },
                                              }
                                            )
                                          }
                                        >
                                          <FaFolder className="text-xl hover:scale-125" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-x-2 flex">
                                        {/* User buttons (no delete / upload) */}
                                        <button
                                          type="button"
                                          title="Watch videos"
                                          className="bg-blue-200 p-1 text-black/60 rounded"
                                          onClick={() =>
                                            navigate("/sub-operation/videos", {
                                              state: {
                                                subOpId: subOp.sub_operation_id,
                                              },
                                            })
                                          }
                                        >
                                          <FaPlay className="text-xl hover:scale-125" />
                                        </button>

                                        <button
                                          type="button"
                                          title="Watch images"
                                          className="bg-blue-200 p-1 text-black/60 rounded"
                                          onClick={() =>
                                            navigate("/sub-operation/images", {
                                              state: {
                                                subOpId: subOp.sub_operation_id,
                                              },
                                            })
                                          }
                                        >
                                          <FaImage className="text-xl hover:scale-125" />
                                        </button>

                                        <button
                                          type="button"
                                          title="Tech packs"
                                          className="bg-green-200 p-1 text-black/60 rounded"
                                          onClick={() =>
                                            navigate(
                                              "/sub-operation/tech_packs",
                                              {
                                                state: {
                                                  subOpId:
                                                    subOp.sub_operation_id,
                                                },
                                              }
                                            )
                                          }
                                        >
                                          <FaFileExcel className="text-xl hover:scale-125" />
                                        </button>

                                        <button
                                          type="button"
                                          title="Other documents"
                                          className="bg-blue-200 p-1 text-black/60 rounded"
                                          onClick={() =>
                                            navigate(
                                              "/sub-operation/documents",
                                              {
                                                state: {
                                                  subOpId:
                                                    subOp.sub_operation_id,
                                                },
                                              }
                                            )
                                          }
                                        >
                                          <FaFolder className="text-xl hover:scale-125" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ViewWorkstations;
