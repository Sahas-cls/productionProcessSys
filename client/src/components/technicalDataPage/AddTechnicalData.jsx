import React, { useState, useMemo, useEffect, useRef } from "react";
import { ErrorMessage, Field, Form, Formik } from "formik";
import * as yup from "yup";
import { IoSettingsOutline, IoClose } from "react-icons/io5";
import useStyles from "../../hooks/useStyles";
import axios from "axios";

const AddTechnicalData = ({
  isOpen,
  onClose,
  styleId,
  mainOperation,
  subOperation,
  userRole,
}) => {
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.API_URL;

  //! use states
  const [baseData, setBaseData] = useState({
    styleNo: styleId || "",
    operationId: mainOperation?.operation_id || "",
    subOperationId: subOperation?.sub_operation_id || "",
    styleName: "",
    operationName: mainOperation?.operation_name || "",
    subOperationName: subOperation?.sub_operation_name || "",
  });

  const [styleSKey, setStyleSKey] = useState("");
  const [operationSKey, setOperationSKey] = useState(
    mainOperation?.operation_name || "",
  );
  const [subOperationSKey, setSubOperationSKey] = useState(
    subOperation?.sub_operation_name || "",
  );
  const [operations, setOperations] = useState([]);
  const [selectedSubOperations, setSelectedSubOperations] = useState([]);
  const [technicalData, setTechnicalData] = useState(null);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showOperationDropdown, setShowOperationDropdown] = useState(false);
  const [showSubOperationDropdown, setShowSubOperationDropdown] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for outside click detection
  const styleDropdownRef = useRef(null);
  const operationDropdownRef = useRef(null);
  const subOperationDropdownRef = useRef(null);
  const modalRef = useRef(null);

  //! use effect - initialize with props
  useEffect(() => {
    if (styleId || mainOperation || subOperation) {
      setBaseData({
        styleNo: styleId || "",
        operationId: mainOperation?.operation_id || "",
        subOperationId: subOperation?.sub_operation_id || "",
        styleName: "",
        operationName: mainOperation?.operation_name || "",
        subOperationName: subOperation?.sub_operation_name || "",
      });

      setOperationSKey(mainOperation?.operation_name || "");
      setSubOperationSKey(subOperation?.sub_operation_name || "");

      // If subOperation is provided, fetch its technical data
      if (subOperation?.sub_operation_id) {
        fetchTechnicalData(subOperation.sub_operation_id);
      }
    }
  }, [styleId, mainOperation, subOperation]);

  //! fetch technical data for the subOperation
  const fetchTechnicalData = async (subOpId) => {
    if (!subOpId) return;

    try {
      setIsLoading(true);
      console.log("Fetching technical data for subOperation:", subOpId);
      const response = await axios.get(
        `${apiUrl}/api/operationBulleting/get-technical-data/${subOpId}`,
        { withCredentials: true },
      );
      console.log("Technical data response: ", response);

      if (response.status === 200 && response.data.data) {
        setTechnicalData(response.data.data);
      } else {
        setTechnicalData(null);
      }
    } catch (error) {
      console.error("Error fetching technical data:", error);
      setTechnicalData(null);
    } finally {
      setIsLoading(false);
    }
  };

  //! fetch operations when styleId is provided (for dropdown selections)
  const fetchOperations = async () => {
    if (!baseData.styleNo && !styleId) {
      setOperations([]);
      setSelectedSubOperations([]);
      return;
    }

    const styleToUse = baseData.styleNo || styleId;

    try {
      setIsLoading(true);
      const response = await axios.get(
        `${apiUrl}/api/operationBulleting/getOB/${styleToUse}`,
      );
      console.log("Operations response: ", response);

      if (response.status === 200 && response.data.data) {
        const ops = response.data.data.operations || [];
        setOperations(ops);

        // If we have mainOperation, select it automatically
        if (mainOperation?.operation_id && ops.length > 0) {
          const selectedOperation = ops.find(
            (op) => op.operation_id === mainOperation.operation_id,
          );
          if (selectedOperation) {
            handleOperationRestoration(selectedOperation);
          }
        }
      } else {
        setOperations([]);
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
      setOperations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to restore operation selection
  const handleOperationRestoration = async (operation) => {
    setOperationSKey(operation.operation_name);
    setSelectedSubOperations(operation.subOperations || []);

    // If we have subOperation, select it automatically
    if (subOperation?.sub_operation_id && operation.subOperations) {
      const selectedSubOp = operation.subOperations.find(
        (subOp) => subOp.sub_operation_id === subOperation.sub_operation_id,
      );
      if (selectedSubOp) {
        handleSubOperationSelect(selectedSubOp);
      }
    }
  };

  useEffect(() => {
    // Fetch operations when style changes
    if (styleId || baseData.styleNo) {
      console.log("Fetching operations for style");
      fetchOperations();
    }
  }, [styleId, baseData.styleNo]);

  //! calling custom hooks
  const { isLoading: styleLoading, stylesList } = useStyles();

  // Set style search key from stylesList
  useEffect(() => {
    if (styleId && stylesList && stylesList.length > 0) {
      const selectedStyle = stylesList.find(
        (style) => style.style_id === styleId,
      );
      if (selectedStyle) {
        setStyleSKey(selectedStyle.style_no);
        setBaseData((prev) => ({
          ...prev,
          styleName: selectedStyle.style_no,
        }));
      }
    }
  }, [stylesList, styleId]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }

      if (
        styleDropdownRef.current &&
        !styleDropdownRef.current.contains(event.target)
      ) {
        setShowStyleDropdown(false);
      }
      if (
        operationDropdownRef.current &&
        !operationDropdownRef.current.contains(event.target)
      ) {
        setShowOperationDropdown(false);
      }
      if (
        subOperationDropdownRef.current &&
        !subOperationDropdownRef.current.contains(event.target)
      ) {
        setShowSubOperationDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  //* use memo's for filtering
  const filteredStyles = useMemo(() => {
    if (!styleSKey || !stylesList) {
      return stylesList || [];
    }
    return (stylesList || []).filter((style) =>
      style.style_no.toLowerCase().includes(styleSKey.toLowerCase()),
    );
  }, [styleSKey, stylesList]);

  const filteredOperations = useMemo(() => {
    if (!operationSKey) {
      return operations || [];
    }
    return (operations || []).filter((operation) =>
      operation.operation_name
        ?.toLowerCase()
        .includes(operationSKey.toLowerCase()),
    );
  }, [operationSKey, operations]);

  const filteredSubOperations = useMemo(() => {
    if (!subOperationSKey) {
      return selectedSubOperations || [];
    }
    return (selectedSubOperations || []).filter((subOp) =>
      subOp.sub_operation_name
        ?.toLowerCase()
        .includes(subOperationSKey.toLowerCase()),
    );
  }, [subOperationSKey, selectedSubOperations]);

  // Handle style selection
  const handleStyleSelect = (style) => {
    setStyleSKey(style.style_no);
    const newBaseData = {
      styleNo: style.style_id,
      styleName: style.style_no,
      operationId: "",
      operationName: "",
      subOperationId: "",
      subOperationName: "",
    };
    setBaseData(newBaseData);
    setOperationSKey("");
    setSubOperationSKey("");
    setOperations([]);
    setSelectedSubOperations([]);
    setShowStyleDropdown(false);
    setTechnicalData(null);
  };

  // Handle operation selection
  const handleOperationSelect = (operation) => {
    setOperationSKey(operation.operation_name);
    const newBaseData = {
      ...baseData,
      operationId: operation.operation_id,
      operationName: operation.operation_name,
      subOperationId: "",
      subOperationName: "",
    };
    setBaseData(newBaseData);
    setSubOperationSKey("");
    setSelectedSubOperations(operation.subOperations || []);
    setShowOperationDropdown(false);
    setTechnicalData(null);
  };

  // Handle sub-operation selection
  const handleSubOperationSelect = (subOp) => {
    setSubOperationSKey(subOp.sub_operation_name);
    const newBaseData = {
      ...baseData,
      subOperationId: subOp.sub_operation_id,
      subOperationName: subOp.sub_operation_name,
    };
    setBaseData(newBaseData);
    setShowSubOperationDropdown(false);

    // Fetch technical data for the selected sub-operation
    fetchTechnicalData(subOp.sub_operation_id);
  };

  //! formik config
  const validationSchema = yup.object({
    cuttableWidth: yup.number().required("Cuttable width required"),
    folderType: yup.string().required("Folder type required"),
    finishWidth: yup.number().required("Finish width required"),
    needleGauge: yup.string().required("Needle gauge required"),
  });

  // Use technical data if available, otherwise use defaults
  const initialData = useMemo(
    () => ({
      cuttableWidth: technicalData?.cuttable_width || 0.0,
      folderType: technicalData?.folder_type || "",
      finishWidth: technicalData?.finish_width || 0.0,
      needleGauge: technicalData?.needle_gauge || "",
    }),
    [technicalData],
  );

  const handleSubmit = async (formData, { setSubmitting }) => {
    try {
      const styleToUse = baseData.styleNo || styleId;
      const operationToUse =
        baseData.operationId || mainOperation?.operation_id;
      const subOperationToUse =
        baseData.subOperationId || subOperation?.sub_operation_id;

      if (!styleToUse || !operationToUse || !subOperationToUse) {
        alert("Please select style, operation, and sub-operation");
        return;
      }

      const dataToSend = {
        ...formData,
        style_id: styleToUse,
        operation_id: operationToUse,
        sub_operation_id: subOperationToUse,
        created_by: userRole?.username || "user",
      };

      const response = await axios.put(
        `${apiUrl}/api/operationBulleting/update-technical-data`,
        dataToSend,
        { withCredentials: true },
      );

      if (response.status === 200) {
        alert("Data submitted successfully!");
        onClose();
      }
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Failed to submit data");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* header with close button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <IoSettingsOutline className="text-5xl text-blue-500/60 [animation-duration:7s]" />
              <div className="ml-2 border-l-4 border-blue-500/40 pl-3">
                <h3 className="text-blue-500/60 font-bold text-xl">
                  Technical Data Entry Form
                </h3>
                <p className="text-blue-500/50 font-semibold text-sm">
                  Add or edit technical data
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <IoClose className="text-3xl" />
            </button>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute top-0 left-0 right-0 bottom-0 bg-white bg-opacity-70 flex items-center justify-center z-50 rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* select style area */}
          <fieldset className="p-4 border rounded-md relative mb-4">
            <legend className="font-semibold italic px-2">
              Select Operation
            </legend>

            {/* Style Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative" ref={styleDropdownRef}>
                <label
                  htmlFor="styleSelect"
                  className="block text-sm font-medium mb-1"
                >
                  Select Style
                </label>
                <input
                  id="styleSelect"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search style..."
                  value={styleSKey}
                  onChange={(e) => {
                    setStyleSKey(e.target.value);
                    setShowStyleDropdown(true);
                  }}
                  onFocus={() => setShowStyleDropdown(true)}
                  disabled={!!styleId}
                />

                {showStyleDropdown && filteredStyles && !styleId && (
                  <div className="absolute top-full left-0 right-0 bg-white rounded-md shadow-lg border border-gray-300 z-20 max-h-60 overflow-y-auto mt-1">
                    {filteredStyles.length > 0 ? (
                      filteredStyles.map((sty) => (
                        <button
                          key={sty.style_id}
                          type="button"
                          className="w-full p-2 text-left hover:bg-blue-50 transition-colors border-b last:border-b-0"
                          onClick={() => handleStyleSelect(sty)}
                        >
                          <div className="font-medium">{sty.style_no}</div>
                          {sty.style_name && (
                            <div className="text-xs text-gray-500">
                              {sty.style_name}
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-500">
                        {styleLoading ? "Loading styles..." : "No styles found"}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Operation Selection */}
              <div className="relative" ref={operationDropdownRef}>
                <label
                  htmlFor="operationSelect"
                  className="block text-sm font-medium mb-1"
                >
                  Select Operation
                </label>
                <input
                  id="operationSelect"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search operation..."
                  value={operationSKey}
                  onChange={(e) => {
                    setOperationSKey(e.target.value);
                    setShowOperationDropdown(true);
                  }}
                  onFocus={() => setShowOperationDropdown(true)}
                  disabled={(!baseData.styleNo && !styleId) || !!mainOperation}
                />

                {showOperationDropdown &&
                  filteredOperations &&
                  (baseData.styleNo || styleId) &&
                  !mainOperation && (
                    <div className="absolute top-full left-0 right-0 bg-white rounded-md shadow-lg border border-gray-300 z-20 max-h-60 overflow-y-auto mt-1">
                      {filteredOperations.length > 0 ? (
                        filteredOperations.map((operation) => (
                          <button
                            key={operation.operation_id}
                            type="button"
                            className="w-full p-2 text-left hover:bg-blue-50 transition-colors border-b last:border-b-0"
                            onClick={() => handleOperationSelect(operation)}
                          >
                            <div className="font-medium">
                              {operation.operation_name}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500">
                          No operations available
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {/* Sub-Operation Selection */}
              <div className="relative" ref={subOperationDropdownRef}>
                <label
                  htmlFor="subOperationSelect"
                  className="block text-sm font-medium mb-1"
                >
                  Select Sub-Operation
                </label>
                <input
                  id="subOperationSelect"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search sub-operation..."
                  value={subOperationSKey}
                  onChange={(e) => {
                    setSubOperationSKey(e.target.value);
                    setShowSubOperationDropdown(true);
                  }}
                  onFocus={() => setShowSubOperationDropdown(true)}
                  disabled={
                    (!baseData.operationId && !mainOperation) || !!subOperation
                  }
                />

                {showSubOperationDropdown &&
                  filteredSubOperations &&
                  (baseData.operationId || mainOperation) &&
                  !subOperation && (
                    <div className="absolute top-full left-0 right-0 bg-white rounded-md shadow-lg border border-gray-300 z-20 max-h-60 overflow-y-auto mt-1">
                      {filteredSubOperations.length > 0 ? (
                        filteredSubOperations.map((subOp) => (
                          <button
                            key={subOp.sub_operation_id}
                            type="button"
                            className="w-full p-2 text-left hover:bg-blue-50 transition-colors border-b last:border-b-0"
                            onClick={() => handleSubOperationSelect(subOp)}
                          >
                            <div className="font-medium">
                              {subOp.sub_operation_name}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500">
                          No sub-operations available
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </fieldset>

          {/* Selected Info Display */}
          {(baseData.styleName || styleId || mainOperation || subOperation) && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md border">
              <div className="flex flex-wrap gap-4 text-sm">
                {baseData.styleName && (
                  <div>
                    <span className="font-semibold">Style:</span>
                    <span className="ml-2 text-blue-600">
                      {baseData.styleName}
                    </span>
                  </div>
                )}
                {baseData.operationName && (
                  <div>
                    <span className="font-semibold">Operation:</span>
                    <span className="ml-2 text-green-600">
                      {baseData.operationName}
                    </span>
                  </div>
                )}
                {baseData.subOperationName && (
                  <div>
                    <span className="font-semibold">Sub-Operation:</span>
                    <span className="ml-2 text-purple-600">
                      {baseData.subOperationName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* form area */}
          <div>
            <Formik
              initialValues={initialData}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              enableReinitialize={true}
            >
              {({ isSubmitting }) => (
                <Form className="border p-4 rounded-md">
                  <h4 className="font-semibold text-red-700 mb-4">
                    Fill below fields
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Folder cuttable width{" "}
                        <span className="text-red-600">*</span>
                      </label>
                      <Field
                        name="cuttableWidth"
                        type="number"
                        step="0.01"
                        placeholder="Enter cuttable width"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <ErrorMessage
                        name="cuttableWidth"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Folder Type <span className="text-red-600">*</span>
                      </label>
                      <Field
                        name="folderType"
                        type="text"
                        placeholder="Enter folder type"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <ErrorMessage
                        name="folderType"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Finish Width <span className="text-red-600">*</span>
                      </label>
                      <Field
                        name="finishWidth"
                        type="number"
                        step="0.01"
                        placeholder="Enter finish width"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <ErrorMessage
                        name="finishWidth"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Needle Gauge <span className="text-red-600">*</span>
                      </label>
                      <Field
                        name="needleGauge"
                        type="text"
                        placeholder="Enter needle gauge"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <ErrorMessage
                        name="needleGauge"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTechnicalData;
