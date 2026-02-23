import axios from "axios";
import React, { useEffect, useState, useRef } from "react";
import { FaPlus, FaPlay, FaImage } from "react-icons/fa";
import { LuConstruction } from "react-icons/lu";
import { TbMoodEmptyFilled } from "react-icons/tb";
import { BsArrowsMove } from "react-icons/bs";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AddHelperOperations from "./AddHelperOperations";
import { BsFillCloudUploadFill } from "react-icons/bs";
import {
  MdDeleteForever,
  MdOutlineDriveFileRenameOutline,
} from "react-icons/md";
import { FaCheck } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
import { ClipLoader } from "react-spinners";
import { useAuth } from "../hooks/useAuth";

// Import DnD Kit components
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Import upload components
import UploadMaterial from "./UploadMaterial";
import CameraOrBrowse from "./CameraOrBrowse";
import ImageCaptureOrBrowse from "./ImageCaptureorBrows";

// Dragging overlay component (same as reference)
const DraggingOverlay = ({ activeWorkstation }) => {
  if (!activeWorkstation) return null;

  return (
    <div className="bg-white shadow-lg rounded-lg border-2 border-blue-500 opacity-80">
      <div className="px-4 py-4 sm:px-6 bg-gray-100">
        <div className="flex items-center gap-2">
          <BsArrowsMove className="text-blue-600" />
          <h5 className="text-sm md:text-lg text-blue-900">
            Workstation No #{" "}
            {activeWorkstation.workstation_no || "Not assigned yet"}
          </h5>
        </div>
      </div>
    </div>
  );
};

const HelperWorkstations = ({ styleId, styleNo }) => {
  const { user, loading } = useAuth();
  const userRole = user?.userRole;
  const navigate = useNavigate();
  const [workstations, setWorkstations] = useState([]);
  const [originalWorkstationList, setOriginalWorkstationList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingOp, setIsAddingOp] = useState(false);
  const [selectedWorkstation, setSelectedWorkstation] = useState(null);
  const { layoutId } = useParams();

  // DnD State
  const [activeWorkstation, setActiveWorkstation] = useState(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Editing state
  const [editingWorkstationId, setEditingWorkstationId] = useState(null);
  const [newWorkstationNo, setNewWorkstationNo] = useState("");
  const inputRef = useRef(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(null);
  const [uploadingData, setUploadingData] = useState({
    style_id: "",
    styleNo: "",
    hoId: "",
  });
  const apiUrl = import.meta.env.VITE_API_URL;
  const workstationDelete = async (workstation_id) => {
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
        `${apiUrl}/api/workstations/deleteWS/${workstation_id}`,
      );
      if (response.status === 200) {
        getWorkstations();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const isUploadRef = useRef(null);

  // Configure sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Focus input when editing
  useEffect(() => {
    if (editingWorkstationId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingWorkstationId]);

  // Click outside handler for upload modal
  useEffect(() => {
    function handleClickOutside(event) {
      if (isUploadRef.current && !isUploadRef.current.contains(event.target)) {
        setIsUploading(false);
        setUploadingMaterial(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUploading]);

  const getWorkstations = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${apiUrl}/api/workstations/get-helper-workstations/${layoutId}`,
      );
      console.log("response workstation : ", response);
      if (response.status === 200) {
        const sortedWorkstations = (response.data.data || []).sort((a, b) => {
          const seqA = a.sequence_number !== null ? a.sequence_number : 9999;
          const seqB = b.sequence_number !== null ? b.sequence_number : 9999;
          return seqA - seqB;
        });
        setWorkstations(sortedWorkstations);
        setOriginalWorkstationList([...sortedWorkstations]);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Error",
        text: "Failed to load workstations",
        icon: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkForChanges = (newList) => {
    if (originalWorkstationList.length !== newList.length) {
      setHasUnsavedChanges(true);
      return;
    }

    const hasChanged = newList.some((ws, index) => {
      const originalWs = originalWorkstationList[index];
      return originalWs && ws.workstation_id !== originalWs.workstation_id;
    });

    setHasUnsavedChanges(hasChanged);
  };

  const createWorkstation = async () => {
    try {
      setIsLoading(true);
      const { value } = await Swal.fire({
        title: "Enter Workstation Number",
        input: "text",
        inputLabel: "Workstation Number",
        inputPlaceholder: "e.g., HWS-01",
        showCancelButton: true,
        inputValidator: (value) => {
          if (!value) {
            return "You must enter a workstation number!";
          }
          return null;
        },
      });

      if (!value) {
        return;
      }

      const response = await axios.post(
        `${apiUrl}/api/workstations/create-helper-workstation`,
        { workstationNo: value, layoutId: layoutId },
        { withCredentials: true },
      );

      if (response.status === 201) {
        await Swal.fire({
          title: "Success",
          text: "New workstation added to layout",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        getWorkstations();
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Operation failed",
        text: `${error?.response?.data?.message || "Unknown error"}`,
        icon: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOperationClick = (workstation) => {
    setSelectedWorkstation(workstation);
    setIsAddingOp(true);
  };

  const handleOperationAdded = () => {
    getWorkstations();
  };

  const handleUploadData = (moId, sopId, soName, subOpId) => {
    setUploadingData((prev) => ({
      ...prev,
      style_id: styleId || "",
      styleNo: styleNo || "",
      hoId: moId || "",
      hOpName: soName || "",
    }));
    console.log("uploading data: ", uploadingData);
  };

  const handleWorkstationDelete = async (workstationId, workstationNo) => {
    const result = await Swal.fire({
      title: `Delete Workstation?`,
      text: `Are you sure you want to delete workstation #${workstationNo}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      setIsLoading(true);
      const response = await axios.delete(
        `${apiUrl}/api/workstations/deleteWS/${workstationId}`,
      );

      if (response.status === 200) {
        Swal.fire({
          title: "Deleted!",
          text: "Workstation has been deleted successfully.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        getWorkstations();
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Error",
        text: error?.response?.data?.message || "Failed to delete workstation",
        icon: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubOp = async (subOpId, wsId) => {
    const result = await Swal.fire({
      title: "Delete Sub Operation?",
      text: "Are you sure you want to delete this sub operation?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await axios.delete(
        `${apiUrl}/api/workstations/delete-helper-suboperation/${subOpId}/${wsId}`,
      );

      if (response.status === 200) {
        Swal.fire({
          title: "Success",
          text: "Sub operation deleted successfully",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        getWorkstations();
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Error",
        text:
          error?.response?.data?.message || "Failed to delete sub operation",
        icon: "error",
      });
    }
  };

  const startEditingWorkstation = (workstation) => {
    setEditingWorkstationId(workstation.workstation_id);
    setNewWorkstationNo(workstation.workstation_no || "");
  };

  const cancelEditing = () => {
    setEditingWorkstationId(null);
    setNewWorkstationNo("");
  };

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
        `${apiUrl}/api/workstations/rename-helper-workstation/${workstationId}`,
        { workstation_no: newWorkstationNo.trim() },
        { withCredentials: true },
      );

      if (response.status === 200) {
        setWorkstations((prevList) =>
          prevList.map((ws) =>
            ws.workstation_id === workstationId
              ? { ...ws, workstation_no: newWorkstationNo.trim() }
              : ws,
          ),
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

  const handleDragStart = (event) => {
    const { active } = event;
    const draggedWorkstation = workstations.find(
      (ws) => ws.workstation_id.toString() === active.id.toString(),
    );
    setActiveWorkstation(draggedWorkstation);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveWorkstation(null);
      return;
    }

    if (userRole !== "Admin" && userRole !== "SuperAdmin") {
      Swal.fire({
        title: "Permission Denied",
        text: "Only administrators can reorder workstations",
        icon: "warning",
      });
      setActiveWorkstation(null);
      return;
    }

    const oldIndex = workstations.findIndex(
      (ws) => ws.workstation_id.toString() === active.id.toString(),
    );
    const newIndex = workstations.findIndex(
      (ws) => ws.workstation_id.toString() === over.id.toString(),
    );

    if (oldIndex !== newIndex) {
      const reorderedList = arrayMove(workstations, oldIndex, newIndex);
      setWorkstations(reorderedList);
      checkForChanges(reorderedList);

      Swal.fire({
        toast: true,
        position: "bottom-end",
        icon: "info",
        title: "Order Changed",
        text: "Workstation order updated locally. Click 'Save Layout' to save permanently.",
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    }

    setActiveWorkstation(null);
  };

  const handleDragCancel = () => {
    setActiveWorkstation(null);
  };

  const saveLayoutOrder = async () => {
    if (!hasUnsavedChanges) {
      Swal.fire({
        title: "No Changes",
        text: "No changes detected to save.",
        icon: "info",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    if (userRole !== "Admin" && userRole !== "SuperAdmin") {
      Swal.fire({
        title: "Permission Denied",
        text: "Only administrators can save workstation order",
        icon: "warning",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Save Layout Order?",
      text: "This will update the sequence numbers for all helper workstations.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, save it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setIsSavingOrder(true);

      const orderData = workstations.map((ws, index) => ({
        workstation_id: ws.workstation_id,
        sequence_number: index,
      }));

      console.log("Saving order data:", orderData);

      const response = await axios.put(
        `${apiUrl}/api/workstations/sequence-update`,
        orderData,
        { withCredentials: true },
      );

      if (response.status === 200 || response.status === 201) {
        setOriginalWorkstationList([...workstations]);
        setHasUnsavedChanges(false);

        Swal.fire({
          title: "Success!",
          text: "Workstation order saved successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Failed to save order:", error);

      Swal.fire({
        title: "Error!",
        text:
          error.response?.data?.message ||
          "Failed to save workstation order. Please try again.",
        icon: "error",
        timer: 3000,
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const resetToOriginalOrder = async () => {
    if (!hasUnsavedChanges) {
      return;
    }

    const result = await Swal.fire({
      title: "Reset Changes?",
      text: "This will discard all unsaved changes and restore the original order.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, reset!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setWorkstations([...originalWorkstationList]);
      setHasUnsavedChanges(false);

      Swal.fire({
        title: "Reset!",
        text: "Changes have been discarded.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const workstationVarient = {
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

  const SortableWorkstationCard = ({ workstation }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: workstation.workstation_id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      cursor: "grab",
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white shadow overflow-hidden rounded-lg divide-y divide-gray-200 mb-4"
      >
        {/* Card Header */}
        <div className="px-4 py-1 md:py-4 sm:px-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between md:gap-4">
            <div className="flex items-center gap-2">
              {(userRole === "Admin" || userRole === "SuperAdmin") && (
                <button
                  className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
                  {...attributes}
                  {...listeners}
                  title="Drag to reorder"
                  style={{ touchAction: "none" }}
                >
                  <BsArrowsMove className="text-xl" />
                </button>
              )}

              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  <div className="">
                    <h5 className="mt-2 text-sm md:text-lg flex flex-wrap items-center gap-x-2 text-blue-900">
                      Workstation No #
                      {editingWorkstationId === workstation.workstation_id ? (
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
                              saveWorkstationNo(workstation.workstation_id)
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
                          <span className=" rounded-md">
                            {workstation.workstation_no || "Not assigned yet"}
                          </span>
                          {/* {(userRole === "Admin" ||
                            userRole === "SuperAdmin") && (
                            <button
                              onClick={() =>
                                startEditingWorkstation(workstation)
                              }
                              className="hover:bg-gradient-to-br from-blue-300/40 to-blue-300/50 px-2 py-1 rounded-md duration-150"
                            >
                              <MdOutlineDriveFileRenameOutline className="text-xl text-blue-600" />
                            </button>
                          )} */}
                        </div>
                      )}
                    </h5>
                    {/* <div className="">
                      <span className="text-xs text-blue-500">
                        Workstation Id: #{workstation.workstation_id}
                      </span>
                    </div> */}
                  </div>
                </h3>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-2 mt-2 sm:mt-0">
              {(userRole === "Admin" || userRole === "SuperAdmin") && (
                <div className="flex gap-x-2">
                  <button
                    className="bg-green-300/40 p-2 text-green-700 rounded hover:bg-green-400/60 transition-all"
                    onClick={() => handleAddOperationClick(workstation)}
                    title="Add Operation"
                  >
                    <FaPlus className="text-xl hover:scale-125" />
                  </button>

                  <button
                    className="bg-red-300/40 p-2 text-red-700 rounded hover:bg-red-400/60 transition-all"
                    onClick={() =>
                      handleWorkstationDelete(
                        workstation.workstation_id,
                        workstation.workstation_no,
                      )
                    }
                    title="Delete Workstation"
                  >
                    <MdDeleteForever className="text-xl hover:scale-125" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-xs md:text-base font-medium text-gray-900 mb-3">
            Helper Operations - {workstation.subOperations?.length || 0}
          </h4>

          {!workstation.subOperations ||
          workstation.subOperations.length === 0 ? (
            <p className="text-gray-500 text-sm">No operations assigned</p>
          ) : (
            <div className="overflow-y-hidden overflow-x-auto md:overflow-x-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50 text-[10px] md:text-base">
                  <tr className="">
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-16 border-r-2">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-64 border-r-2">
                      Operation Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-24 border-r-2">
                      SMV
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 uppercase tracking-wider w-40 text-right pr-8 md:pr-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y text-xs md:text-base divide-gray-200">
                  {workstation.subOperations.map((so) => (
                    <tr key={so.helper_sub_op_id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-gray-900 w-16">
                        {so.helper?.operation_code || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-gray-900 font-medium w-64 truncate">
                        {so?.helper?.operation_name || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-gray-500 w-24">
                        {so?.helper?.mc_smv || "0.00"}
                      </td>
                      <td className="px-4 py-2 text-gray-500 w-24">
                        <div className="flex justify-center space-x-2">
                          {/* Upload button */}
                          <button
                            type="button"
                            title="Upload media"
                            className="bg-blue-300/40 p-1.5 text-blue-700 rounded hover:bg-blue-400/60 transition-all"
                            onClick={() => {
                              handleUploadData(
                                so.helper_id,
                                so.helper_sub_op_id,
                                so?.helper?.operation_name ||
                                  "Untitled Operation",
                                so.helper_sub_op_id,
                              );
                              setUploadingMaterial(null);
                              setIsUploading(true);
                            }}
                          >
                            <BsFillCloudUploadFill className="text-xl hover:scale-125" />
                          </button>

                          {/* Watch Videos Button with Counter */}
                          <div className="relative">
                            <div className="w-6 h-6 rounded-full bg-red-500/75 border absolute -left-2 -top-2 flex justify-center items-center">
                              <p className="text-white font-bold text-xs">
                                {!so?.helper?.videos?.length
                                  ? "0"
                                  : so.helper.videos.length > 99
                                    ? "+99"
                                    : so.helper.videos.length}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="bg-blue-200 p-1.5 text-black/60 rounded hover:bg-blue-300 transition-all"
                              title="Watch videos"
                              onClick={() => {
                                sessionStorage.setItem(
                                  "listScroll",
                                  window.scrollY,
                                );
                                navigate(`/helper/videos/${so.helper_id}`, {
                                  state: {
                                    subOpId: so.helper_sub_op_id,
                                    isHelper: true,
                                  },
                                });
                              }}
                            >
                              <FaPlay className="text-xl hover:scale-125" />
                            </button>
                          </div>

                          {/* Watch Images Button with Counter */}
                          <div className="relative">
                            <div className="w-6 h-6 rounded-full bg-red-500/75 border absolute -left-2 -top-2 flex justify-center items-center">
                              <p className="text-white font-bold text-xs">
                                {!so?.helper?.images?.length
                                  ? "0"
                                  : so.helper?.images.length > 99
                                    ? "+99"
                                    : so.helper?.images.length}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="bg-blue-200 p-1.5 text-black/60 rounded hover:bg-blue-300 transition-all"
                              title="View images"
                              onClick={() => {
                                sessionStorage.setItem(
                                  "listScroll",
                                  window.scrollY,
                                );
                                navigate(`/helper/images/${so.helper_id}`);
                              }}
                            >
                              <FaImage className="text-xl hover:scale-125" />
                            </button>
                          </div>

                          {/* Delete Sub Operation Button */}
                          {(userRole === "Admin" ||
                            userRole === "SuperAdmin") && (
                            <button
                              type="button"
                              title="Delete operation"
                              className="bg-red-300/40 p-1.5 text-red-700 rounded hover:bg-red-400/60 transition-all"
                              onClick={() =>
                                workstationDelete(workstation.workstation_id)
                              }
                            >
                              <MdDeleteForever className="text-xl hover:scale-125" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (layoutId) {
      getWorkstations();
    }
  }, [layoutId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader size={50} color="#2563EB" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 relative">
      {/* Save Layout Buttons - Floating */}
      {(userRole === "Admin" || userRole === "SuperAdmin") &&
        hasUnsavedChanges && (
          <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
            <button
              onClick={resetToOriginalOrder}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-200"
              title="Reset to original order"
            >
              <RxCross2 className="text-xl" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              onClick={saveLayoutOrder}
              disabled={isSavingOrder}
              className={`${
                isSavingOrder
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              } text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-200`}
              title="Save workstation order"
            >
              {isSavingOrder ? (
                <>
                  <ClipLoader size={20} color="#ffffff" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <MdOutlineDriveFileRenameOutline className="text-xl" />
                  <span className="hidden sm:inline">Save Layout Order</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </button>
          </div>
        )}

      {/* Upload Modal - EXACT same as reference */}
      <AnimatePresence>
        {!isAddingOp && isUploading && (
          <motion.div
            ref={isUploadRef}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed left-0 backdrop-brightness-50 right-0 bottom-0 w-full z-50 lg:w-full lg:h-screen lg:flex lg:justify-center lg:items-center"
          >
            <div className="md:w-[100%] flex justify-center">
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
                  operationType={"HelperOperation"}
                />
              )}

              {uploadingMaterial === "image" && (
                <ImageCaptureOrBrowse
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                  operationType={"helperOp"}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Helper Operations Modal */}
      {isAddingOp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full h-2/4">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-semibold">
                Add Helper Operation to Workstation #
                {selectedWorkstation?.workstation_no}
              </h3>
              <button
                onClick={() => {
                  setIsAddingOp(false);
                  setSelectedWorkstation(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <RxCross2 className="text-2xl" />
              </button>
            </div>
            <div className="p-4">
              <AddHelperOperations
                onClose={() => {
                  setIsAddingOp(false);
                  setSelectedWorkstation(null);
                }}
                layoutId={layoutId}
                workstationId={selectedWorkstation?.workstation_id}
                onOperationAdded={handleOperationAdded}
                styleId={styleId}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-bold text-gray-800 text-lg md:text-3xl">
              Helper Workstations
            </h1>
            <p className="mt-0 md:mt-2 text-gray-600">
              <span className="hidden md:inline">
                Viewing helper workstation
              </span>{" "}
              information for layout #{layoutId}
              {styleId && (
                <span className="ml-2 text-blue-600">Style: {styleId}</span>
              )}
            </p>
          </div>

          {(userRole === "Admin" || userRole === "SuperAdmin") && (
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="bg-blue-500 text-white px-2 md:px-4 py-2 rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl duration-150 group"
                onClick={createWorkstation}
                disabled={isLoading}
              >
                <div className="flex items-center justify-center md:space-x-2">
                  <span className="hidden md:inline">Add Workstation</span>
                  <LuConstruction className="text-3xl text-yellow-300 group-hover:scale-110 duration-150" />
                </div>
              </button>
            </div>
          )}
        </div>

        {Array.isArray(workstations) && workstations.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
            <TbMoodEmptyFilled className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No Workstations Found
            </h3>
            <p className="mt-2 text-gray-500">
              There are no helper workstations configured for this layout.
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
              variants={workstationVarient}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={workstations.map((ws) => ws.workstation_id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  {workstations.map((workstation) => (
                    <SortableWorkstationCard
                      key={workstation.workstation_id}
                      workstation={workstation}
                    />
                  ))}
                </SortableContext>

                <DragOverlay>
                  <DraggingOverlay activeWorkstation={activeWorkstation} />
                </DragOverlay>
              </DndContext>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default HelperWorkstations;
