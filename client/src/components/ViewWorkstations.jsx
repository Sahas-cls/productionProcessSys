import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
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
import { LuConstruction } from "react-icons/lu";
import { FaArrowLeft } from "react-icons/fa6";
import { BsFillCloudUploadFill } from "react-icons/bs";
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
import { FaUpload, FaFolderOpen } from "react-icons/fa";
import { MdOutlineSaveAlt } from "react-icons/md";
import { MdOutlinePersonAddAlt } from "react-icons/md";
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
import AddHelperOperations from "./AddHelperOperations";

// Dragging overlay component
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

const ViewWorkstations = ({ setLayoutId, setStyleNo }) => {
  const { user, loading } = useAuth();
  const userRole = user?.userRole;
  const apiUrl = import.meta.env.VITE_API_URL;
  const location = useLocation();
  const navigate = useNavigate();
  const excelUploadRef = useRef();
  const fileUploadRef = useRef();
  const { state } = location;
  const { layoutId, styleId, styleNo: pStyleNo } = useParams();

  useEffect(() => {
    if (state?.layout) {
      console.log("setting up parent values using useLocation");
      setLayoutId(state.layout); //|| useParams.layoutId;
      setStyleNo(state.style.style.style_no); //|| useParams.styleId;
    }
  }, [state]);

  console.log("state:-- ", state);

  const [workstationList, setWorkstationList] = useState([]);
  const [originalWorkstationList, setOriginalWorkstationList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingSubM, setIsAddingSubM] = useState(false);
  const [selectedWorkstation, setSelectedWorkstation] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingHM, setIsAddingHM] = useState(false);
  // DnD State
  const [activeWorkstation, setActiveWorkstation] = useState(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // FIXED: Proper uploading data structure - RESTORED from working code
  const [uploadingData, setUploadingData] = useState({
    style_id: "",
    styleNo: "",
    moId: "",
    sopId: "",
    sopName: "",
    subOpId: "",
    operationType: "",
  });

  const [showEUploadOrView, setShowEUploadOrView] = useState(false);
  const [showFUploadOrView, setShowFUploadOrView] = useState(false);
  const [editingWorkstationId, setEditingWorkstationId] = useState(null);
  const [newWorkstationNo, setNewWorkstationNo] = useState("");
  const [uploadingMaterial, setUploadingMaterial] = useState(null);

  const isUploadRef = useRef(null);
  const inputRef = useRef(null);

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

  useEffect(() => {
    if (editingWorkstationId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingWorkstationId]);

  // FIXED: Click outside handler for upload modal
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

  // upload excel outside click check
  useEffect(() => {
    const isOutsideClick = (e) => {
      if (
        excelUploadRef.current &&
        !excelUploadRef.current.contains(e.target)
      ) {
        setShowEUploadOrView(false);
      }
    };

    document.addEventListener("mousedown", isOutsideClick);
    return () => {
      document.removeEventListener("mousedown", isOutsideClick);
    };
  }, [excelUploadRef]);

  // file upload outside click function
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (fileUploadRef.current && !fileUploadRef.current.contains(e.target)) {
        setShowFUploadOrView(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [fileUploadRef]);

  // FIXED: Initialize uploading data with style info - RESTORED from working code
  useEffect(() => {
    if (state?.style?.style) {
      setUploadingData({
        style_id: state.style.style.style_id || styleId,
        styleNo: state.style.style.style_no || pStyleNo,
        moId: "",
        sopId: "",
        sopName: "",
        subOpId: "",
      });
    }
  }, [state]);

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
        `${apiUrl}/api/workstations/getWorkstations/${layoutId || state.layout}`,
      );
      console.log("workstation list----: ", response);
      const sortedWorkstations = response.data.data.sort((a, b) => {
        const seqA = a.sequence_number !== null ? a.sequence_number : 9999;
        const seqB = b.sequence_number !== null ? b.sequence_number : 9999;
        return seqA - seqB;
      });
      setWorkstationList(sortedWorkstations);
      setOriginalWorkstationList([...sortedWorkstations]);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error(error);
      setError("Failed to load workstation data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const restoreScroll = () => {
      const savedScroll = sessionStorage.getItem("listScroll");
      if (savedScroll) {
        window.scrollTo(0, parseInt(savedScroll, 10));
        sessionStorage.removeItem("listScroll");
      }
    };

    if (!isLoading && workstationList.length > 0) {
      restoreScroll();
    }
  }, [isLoading, workstationList]);

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

  const handleStyleUpload = () => {
    if (!uploadingData.style_id || !uploadingData.styleNo) {
      Swal.fire({
        title: "Error",
        text: "Style information not available",
        icon: "error",
      });
      return;
    }
    console.log(`Style upload data:`, uploadingData);
  };

  const helperOpDelete = async (subOpId, workstation_id) => {
    const isDelete = await Swal.fire({
      title: `Are you sure want to delete #${subOpId} helper operation`,
      icon: "warning",
      showCancelButton: true,
    });

    if (!isDelete.isConfirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${apiUrl}/api/workstations/deleteHOperation/${subOpId}/${workstation_id}`,
      );
      if (response.status === 200) {
        getWorkstations();
      }
    } catch (error) {
      console.error(error);
    }
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
        { withCredentials: true },
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
        `${apiUrl}/api/workstations/deleteWS/${workstation_id}`,
      );
      if (response.status === 200) {
        getWorkstations();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteSubOP = async (subOpId, wsId) => {
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
        `${apiUrl}/api/workstations/deleteSubOperation/${subOpId}/${wsId}`,
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

  const openAddHelperOperationModal = (workstation) => {
    setSelectedWorkstation(workstation);
    setIsAddingHM(true);
  };

  const closeAddSubOperationModal = () => {
    setIsAddingSubM(false);
    setSelectedWorkstation(null);
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
        `${apiUrl}/api/workstations/renameWorkstation/${workstationId}`,
        { workstation_no: newWorkstationNo.trim() },
        { withCredentials: true },
      );

      if (response.status === 200) {
        setWorkstationList((prevList) =>
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

  useEffect(() => {
    getWorkstations();
  }, [state?.layout, layoutId]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewStyleTechPacks = () => {
    sessionStorage.setItem("listScroll", window.scrollY);
    navigate("/style/tech-packs", {
      state: {
        styleId: state.style?.style?.style_id,
        styleNo: state.style?.style?.style_no,
        layoutId: state.layout,
      },
    });
  };

  const handleViewStyleDocuments = () => {
    sessionStorage.setItem("listScroll", window.scrollY);
    navigate("/style/documents", {
      state: {
        styleId: state.style?.style?.style_id,
        styleNo: state.style?.style?.style_no,
        layoutId: state.layout,
      },
    });
  };

  // ============= FIXED: CRITICAL FIX - RESTORED FROM WORKING CODE =============
  const handleUploadData = (moId, sopId, soName, subOpId) => {
    setUploadingData((prev) => ({
      ...prev,
      style_id: state?.style?.style?.style_id || styleId,
      styleNo: state?.style?.style?.style_no || pStyleNo,
      moId: moId,
      sopId: sopId,
      sopName: soName,
      subOpId: subOpId,
      operationType: "MainOperation",
    }));
    console.log(
      `moid: ${moId} sopId: ${sopId} soName: ${soName} subOpId: ${subOpId}`,
    );
  };

  const handleHWUploadData = (moId, sopId, soName, subOpId) => {
    setUploadingData((prev) => ({
      ...prev,
      style_id: state?.style?.style?.style_id || styleId,
      styleNo: state?.style?.style?.style_no || pStyleNo,
      hoId: moId || "",
      hOpName: soName || "",
      operationType: "HelperOperation",
    }));
    console.log("uploading data: ", uploadingData);
  };
  // ============================================================================

  const showExcelUpload = () => {
    return (
      <div
        ref={excelUploadRef}
        className="relative bg-green-600 rounded-bl-lg rounded-br-lg shadow-xl border border-gray-200"
      >
        <div className="py-2">
          <button
            className="flex items-center gap-3 w-full px-2 py-2 justify-center text-left text-sm hover:bg-green-500/80 transition-colors"
            onClick={() => {
              setUploadingMaterial("techpack");
              setIsUploading(true);
              setShowEUploadOrView(false);
            }}
          >
            <FaUpload className="text-white text-lg" />
            <span className="hidden md:block text-white font-semibold">
              Upload
            </span>
          </button>
          <div className="h-1 bg-gray-100 mx-2 my-2"></div>
          <button
            className="flex items-center gap-3 justify-center w-full px-2 py-2 text-left text-sm hover:bg-green-500/80 transition-colors"
            onClick={() => {
              setShowEUploadOrView(false);
              handleViewStyleTechPacks();
            }}
          >
            <FaFolderOpen className="text-white text-lg" />
            <span className="hidden md:block text-white font-semibold">
              View
            </span>
          </button>
        </div>
      </div>
    );
  };

  const showFileUpload = () => {
    return (
      <div
        ref={fileUploadRef}
        className="relative bg-blue-500 rounded-bl-md rounded-br-md shadow-xl border border-gray-200"
      >
        <div className="py-2">
          <button
            className="flex items-center gap-3 w-full px-2 justify-center py-2 text-left text-sm hover:bg-blue-400 transition-colors"
            onClick={() => {
              setUploadingMaterial("folder");
              setIsUploading(true);
              setShowFUploadOrView(false);
            }}
          >
            <FaUpload className="text-white text-lg" />
            <span className="hidden md:block text-white">Upload</span>
          </button>
          <div className="h-1 bg-gray-100 mx-2 my-2"></div>
          <button
            className="flex items-center gap-3 w-full px-2 justify-center py-2 text-left text-sm hover:bg-blue-400 transition-colors"
            onClick={() => {
              setShowFUploadOrView(false);
              handleViewStyleDocuments();
            }}
          >
            <FaFolderOpen className="text-white text-lg" />
            <span className="hidden md:block text-white">View</span>
          </button>
        </div>
      </div>
    );
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const draggedWorkstation = workstationList.find(
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

    const oldIndex = workstationList.findIndex(
      (ws) => ws.workstation_id.toString() === active.id.toString(),
    );
    const newIndex = workstationList.findIndex(
      (ws) => ws.workstation_id.toString() === over.id.toString(),
    );

    if (oldIndex !== newIndex) {
      const reorderedList = arrayMove(workstationList, oldIndex, newIndex);
      setWorkstationList(reorderedList);
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
      text: "This will update the sequence numbers for all workstations.",
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

      const orderData = workstationList.map((ws, index) => ({
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
        setOriginalWorkstationList([...workstationList]);
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
      setWorkstationList([...originalWorkstationList]);
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
        className="bg-white shadow overflow-hidden rounded-lg divide-y divide-gray-200"
      >
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
                    <h5 className="mt-2 text-sm md:text-lg flex flex-wrap items-center gap-x-2 text-blue-900 ">
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
                    <div className="">
                      <h4 className="text-xs text-gray-100">
                        {workstation?.workstation_id}
                      </h4>
                    </div>
                  </div>
                </h3>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-2">
              <span className="text-xs text-gray-500">
                Created: {formatDate(workstation.createdAt)}
              </span>
              {(userRole === "Admin" || userRole === "SuperAdmin") && (
                <div className="flex gap-x-2">
                  <button
                    className="bg-green-300/40 p-1 text-green-700 rounded"
                    onClick={() => openAddSubOperationModal(workstation)}
                  >
                    <BiPlus className="text-2xl hover:scale-150" />
                  </button>

                  <button
                    className="bg-green-300/40 p-1 text-green-700 rounded"
                    onClick={() => openAddHelperOperationModal(workstation)}
                  >
                    <MdOutlinePersonAddAlt className="text-2xl hover:scale-150" />
                  </button>

                  <button
                    className="bg-red-300/40 p-1 text-red-700 rounded"
                    onClick={() =>
                      handleWorkstationDelete(workstation.workstation_id)
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
            <p className="text-gray-500 text-sm">No sub-operations assigned</p>
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
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-24">
                      Machine Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-40 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y text-xs md:text-base divide-gray-200">
                  {workstation.subOperations.map((subOp) => (
                    <tr
                      key={`${workstation.workstation_id}-${subOp?.sub_operation_id || subOp?.helper_id}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 w-16">
                        {subOp?.sub_operation_id ||
                          subOp?.helper?.operation_code}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium w-64 truncate">
                        {subOp.suboperatoin?.sub_operation_name ||
                          subOp.sub_operation_name ||
                          subOp?.helper?.operation_name ||
                          "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 w-24">
                        {subOp.suboperatoin?.smv ||
                          subOp?.helper?.mc_smv ||
                          "0.00"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 w-24 whitespace-nowrap">
                        {subOp.suboperatoin?.machine_type || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 w-24">
                        {userRole === "Admin" || userRole === "SuperAdmin" ? (
                          <div className="space-x-2 flex">
                            <button
                              className="bg-red-300/40 p-1 text-red-700 rounded"
                              title="Delete"
                              onClick={() => {
                                {
                                  subOp.sub_operation_id === null
                                    ? helperOpDelete(
                                        subOp.helper_id,
                                        workstation.workstation_id,
                                      )
                                    : handleDeleteSubOP(
                                        subOp.sub_operation_id,
                                        workstation.workstation_id,
                                      );
                                }
                              }}
                            >
                              <MdOutlineDeleteForever className="text-xl hover:scale-150" />
                            </button>

                            {/* ============= FIXED: UPLOAD BUTTON USING WORKING CODE ============= */}
                            <button
                              type="button"
                              title="Upload media"
                              className="bg-blue-300/40 p-1 text-blue-700 rounded"
                              onClick={() => {
                                subOp.sub_operation_id !== null
                                  ? handleUploadData(
                                      subOp.suboperatoin?.main_operation_id ||
                                        subOp.main_operation_id,
                                      subOp.sub_operation_id,
                                      subOp.suboperatoin?.sub_operation_name ||
                                        subOp.sub_operation_name ||
                                        "Untitled Operation",
                                      subOp.sub_operation_id,
                                    )
                                  : handleHWUploadData(
                                      subOp.helper_id,
                                      subOp.helper_sub_op_id,
                                      subOp?.helper?.operation_name ||
                                        "Untitled Operation",
                                      subOp.helper_sub_op_id,
                                    );
                                setUploadingMaterial(null);
                                setIsUploading(true);
                              }}
                            >
                              <BsFillCloudUploadFill className="text-xl hover:scale-125" />
                            </button>
                            {/* ================================================================== */}

                            <div className="relative">
                              <div className="w-6 h-6 rounded-full bg-red-500/75 border absolute left-2 bottom-3 flex justify-center items-center">
                                {subOp.sub_operation_id === null ? (
                                  <p className="text-white font-bold text-xs">
                                    {!subOp?.helper?.videos?.length
                                      ? "0"
                                      : subOp.helper?.videos.length > 99
                                        ? "+99"
                                        : subOp.helper?.videos.length}
                                  </p>
                                ) : (
                                  <p className="text-white font-bold text-sm">
                                    {!subOp.suboperatoin?.media_count
                                      ? "0"
                                      : subOp.suboperatoin.media_count > 100
                                        ? "+99"
                                        : subOp.suboperatoin.media_count}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                className="bg-blue-200 p-1 text-black/60 rounded"
                                title="Watch videos"
                                onClick={() => {
                                  sessionStorage.setItem(
                                    "listScroll",
                                    window.scrollY,
                                  );
                                  if (subOp.sub_operation_id === null) {
                                    navigate(
                                      `/helper/videos/${subOp?.helper?.helper_id}`,
                                      {
                                        state: {
                                          subOpId: subOp?.helper?.helper_id,
                                          isHelper: true,
                                        },
                                      },
                                    );
                                  } else {
                                    navigate("/sub-operation/videos", {
                                      state: {
                                        subOpId: subOp.sub_operation_id,
                                      },
                                    });
                                  }
                                }}
                              >
                                <FaPlay className="text-xl hover:scale-125" />
                              </button>
                            </div>

                            <div className="relative">
                              <div className="w-6 h-6 rounded-full bg-red-500/75 border absolute left-2 bottom-3 flex justify-center items-center">
                                {subOp.sub_operation_id === null ? (
                                  <p className="text-white font-bold text-xs">
                                    {!subOp?.helper?.images?.length
                                      ? "0"
                                      : subOp.helper?.images.length > 99
                                        ? "+99"
                                        : subOp.helper?.images.length}
                                  </p>
                                ) : (
                                  <p className="text-white font-bold text-sm">
                                    {!subOp.suboperatoin?.image_count
                                      ? "0"
                                      : subOp.suboperatoin.image_count > 100
                                        ? "+99"
                                        : subOp.suboperatoin.image_count}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                title="Images"
                                className="bg-blue-200 p-1 text-black/60 rounded"
                                onClick={() => {
                                  sessionStorage.setItem(
                                    "listScroll",
                                    window.scrollY,
                                  );
                                  if (subOp.sub_operation_id === null) {
                                    navigate(
                                      `/helper/images/${subOp?.helper?.helper_id}`,
                                    );
                                  } else {
                                    navigate("/sub-operation/images", {
                                      state: {
                                        subOpId: subOp.sub_operation_id,
                                      },
                                    });
                                  }
                                }}
                              >
                                <FaImage className="text-xl hover:scale-125" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-x-2 flex">
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
      </div>
    );
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

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 relative">
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
                  <MdOutlineSaveAlt className="text-xl" />
                  <span className="hidden sm:inline">Save Layout Order</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </button>
          </div>
        )}

      {/* ============= FIXED: UPLOAD MODAL - EXACTLY LIKE WORKING CODE ============= */}
      <AnimatePresence>
        {!isAddingSubM && isUploading && (
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
                  operationType={uploadingData.operationType}
                />
              )}

              {uploadingMaterial === "image" && (
                <ImageCaptureOrBrowse
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                  operationType={uploadingData.operationType}
                />
              )}

              {uploadingMaterial === "techpack" && (
                <TechPackUploader
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                  isStyleLevel={true}
                />
              )}

              {uploadingMaterial === "folder" && (
                <FolderDocumentsUploader
                  uploadingMaterial={uploadingMaterial}
                  setUploadingMaterial={setUploadingMaterial}
                  setIsUploading={setIsUploading}
                  uploadingData={uploadingData}
                  isStyleLevel={true}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ======================================================================== */}

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
                style_id={state?.layout || layoutId}
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

      {isAddingHM && (
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
            {/* 
                onClose,
                layoutId,
                workstationId,
                onOperationAdded,
                styleId,
            */}
            <div className="p-4">
              <AddHelperOperations
                styleId={state?.layout || styleId}
                layoutId={state?.layout || layoutId}
                workstationId={selectedWorkstation?.workstation_id}
                onClose={() => setIsAddingHM(false)}
                onRefresh={() => getWorkstations()}
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

      <div className="mx-auto">
        <div className="flex items-start justify-between">
          <div className="mb-8">
            <h1 className="font-bold text-gray-800 text-lg md:text-3xl">
              Workstation Details
            </h1>
            <p className="mt-0 md:mt-2 text-gray-600">
              <span className="hidden md:inline">Viewing workstation</span>{" "}
              information for layout #{state?.layout || layoutId}
              {/* {state.style?.style?.style_no && (
                <span className="ml-2 text-blue-600">
                  Style: {state.style.style.style_no}
                </span>
              )} */}
            </p>
          </div>

          <div className="flex items-center space-x-4">
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

            <div className="relative">
              <button
                type="button"
                title="Style Tech Packs"
                className="bg-green-600 text-white px-2 md:px-4 py-3 flex items-center gap-x-2   rounded-lg hover:bg-green-700 shadow-lg hover:shadow-xl duration-150"
                onClick={() => setShowEUploadOrView(!showEUploadOrView)}
              >
                <FaFileExcel className="text-2xl" />
                <p className="hidden md:block">Upload Layout</p>
              </button>
              <div className="absolute inset-x-0">
                {showEUploadOrView && showExcelUpload()}
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                title="Style Documents"
                className="bg-blue-500 flex gap-x-2 text-white px-2 md:px-4 py-3 rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl duration-150"
                onClick={() => setShowFUploadOrView(!showFUploadOrView)}
              >
                <FaFolder className="text-2xl hover:scale-125" />
                <p className="hidden md:block">Upload Document</p>
              </button>
              <div className="absolute inset-x-0">
                {showFUploadOrView && showFileUpload()}
              </div>
            </div>
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={workstationList.map((ws) =>
                    ws.workstation_id.toString(),
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  {workstationList.map((workstation) => (
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

export default ViewWorkstations;
