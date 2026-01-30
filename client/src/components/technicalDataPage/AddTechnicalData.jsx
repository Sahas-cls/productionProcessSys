import React, { useState, useMemo, useEffect, useRef } from "react";
import { ErrorMessage, Field, Form, Formik } from "formik";
import * as yup from "yup";
import { IoSettingsOutline } from "react-icons/io5";
import useStyles from "../../hooks/useStyles";
import axios from "axios";

const AddTechnicalData = ({ userRole }) => {
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.API_URL;

  //! use states - Initialize from localStorage
  const [baseData, setBaseData] = useState(() => {
    try {
      const stored = localStorage.getItem("technicalDataSelection");
      return stored
        ? JSON.parse(stored)
        : {
            styleNo: "",
            operationId: "",
            subOperationId: "",
            styleName: "",
            operationName: "",
            subOperationName: "",
          };
    } catch (error) {
      console.error("Error parsing localStorage data:", error);
      return {
        styleNo: "",
        operationId: "",
        subOperationId: "",
        styleName: "",
        operationName: "",
        subOperationName: "",
      };
    }
  });

  const [styleSKey, setStyleSKey] = useState(baseData.styleName || "");
  const [operationSKey, setOperationSKey] = useState(
    baseData.operationName || "",
  );
  const [subOperationSKey, setSubOperationSKey] = useState(
    baseData.subOperationName || "",
  );
  const [operations, setOperations] = useState([]);
  const [selectedSubOperations, setSelectedSubOperations] = useState([]);
  const [cOperation, setCOperation] = useState(null);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showOperationDropdown, setShowOperationDropdown] = useState(false);
  const [showSubOperationDropdown, setShowSubOperationDropdown] =
    useState(false);

  // Refs for outside click detection
  const styleDropdownRef = useRef(null);
  const operationDropdownRef = useRef(null);
  const subOperationDropdownRef = useRef(null);

  //! Save to localStorage whenever baseData changes
  useEffect(() => {
    if (baseData.styleNo || baseData.operationId || baseData.subOperationId) {
      localStorage.setItem("technicalDataSelection", JSON.stringify(baseData));
    }
  }, [baseData]);

  //! use effect - data fetchers
  const fetchOperations = async () => {
    console.log("fetching op back");
    if (!baseData.styleNo) {
      setOperations([]);
      setSelectedSubOperations([]);
      setOperationSKey("");
      setSubOperationSKey("");
      return;
    }
    try {
      const response = await axios.get(
        `${apiUrl}/api/operationBulleting/getOB/${baseData.styleNo}`,
      );
      console.log("Operations response: ", response);
      if (response.status === 200 && response.data.data) {
        const ops = response.data.data.operations || [];
        setOperations(ops);

        // If we have a stored operationId, select it automatically
        if (baseData.operationId && ops.length > 0) {
          const storedOperation = ops.find(
            (op) => op.operation_id === baseData.operationId,
          );
          if (storedOperation) {
            // Automatically restore the operation selection
            handleOperationRestoration(storedOperation);
          }
        }
      } else {
        setOperations([]);
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
      setOperations([]);
    }
  };

  // Function to restore operation selection
  const handleOperationRestoration = async (operation) => {
    setOperationSKey(operation.operation_name);
    setSelectedSubOperations(operation.subOperations || []);

    // If we have a stored subOperationId, select it automatically
    if (baseData.subOperationId && operation.subOperations) {
      const storedSubOp = operation.subOperations.find(
        (subOp) => subOp.sub_operation_id === baseData.subOperationId,
      );
      if (storedSubOp) {
        // Delay slightly to ensure state is updated
        setTimeout(() => {
          handleSubOperationSelect(storedSubOp);
        }, 100);
      }
    }
  };

  // to update sub operation data
  const refreshCurrentSubOperation = async () => {
    if (!baseData.subOperationId) {
      return;
    }

    try {
      const response = await axios.get(
        `${apiUrl}/api/operationBulleting/get-technical-data/${baseData.subOperationId}`,
        { withCredentials: true },
      );

      if (response.status === 200 && response.data.data) {
        setCOperation(response.data.data);
      }
      console.log("response; 😂😂", response);
    } catch (error) {
      console.error("Error refreshing sub-operation data:", error);
    }
  };

  useEffect(() => {
    // Initial load: if we have stored data, fetch operations
    if (baseData.styleNo) {
      fetchOperations();
    }
  }, []); // Empty dependency - run only on mount

  useEffect(() => {
    // When styleNo changes, fetch operations
    if (baseData.styleNo) {
      fetchOperations();
    }
  }, [baseData.styleNo]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  //! calling custom hooks
  const {
    isLoading: styleLoading,
    refresh: refreshStyle,
    stylesList,
  } = useStyles();

  // Auto-select stored style from stylesList
  useEffect(() => {
    if (baseData.styleNo && stylesList && stylesList.length > 0 && !styleSKey) {
      const storedStyle = stylesList.find(
        (style) => style.style_id === baseData.styleNo,
      );
      if (storedStyle) {
        setStyleSKey(storedStyle.style_no);
      }
    }
  }, [stylesList, baseData.styleNo]);

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
    setCOperation(null);
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
    setCOperation(null);
  };

  // Handle sub-operation selection
  const handleSubOperationSelect = (subOperation) => {
    setSubOperationSKey(subOperation.sub_operation_name);
    const newBaseData = {
      ...baseData,
      subOperationId: subOperation.sub_operation_id,
      subOperationName: subOperation.sub_operation_name,
    };
    setBaseData(newBaseData);
    setCOperation(subOperation);
    setShowSubOperationDropdown(false);
  };

  // Clear all selections
  const handleClearSelections = () => {
    setBaseData({
      styleNo: "",
      operationId: "",
      subOperationId: "",
      styleName: "",
      operationName: "",
      subOperationName: "",
    });
    setStyleSKey("");
    setOperationSKey("");
    setSubOperationSKey("");
    setOperations([]);
    setSelectedSubOperations([]);
    setCOperation(null);
    localStorage.removeItem("technicalDataSelection");
  };

  //! formik config
  const validationSchema = yup.object({
    cuttableWidth: yup.number().required("Cuttable width required"),
    folderType: yup.string().required("Folder type required"),
    finishWidth: yup.number().required("Finish width required"),
    needleGauge: yup.string().required("Needle gauge required"),
  });

  const initialData = useMemo(
    () => ({
      cuttableWidth: cOperation?.cuttable_width || 0.0,
      folderType: cOperation?.folder_type || "",
      finishWidth: cOperation?.finish_width || 0.0,
      needleGauge: cOperation?.needle_gauge || "",
    }),
    [cOperation],
  );

  const handleSubmit = async (formData) => {
    try {
      if (
        !baseData.styleNo ||
        !baseData.operationId ||
        !baseData.subOperationId
      ) {
        alert("Please select style, operation, and sub-operation");
        return;
      }

      const dataToSend = {
        ...formData,
        style_id: baseData.styleNo,
        operation_id: baseData.operationId,
        sub_operation_id: baseData.subOperationId,
        created_by: userRole?.username || "user",
      };

      console.log("Sending data:", dataToSend);

      const response = await axios.put(
        `${apiUrl}/api/operationBulleting/update-technical-data`,
        dataToSend,
        { withCredentials: true },
      );

      if (response.status === 200) {
        alert("Data submitted successfully!");
        setCOperation((prev) => ({
          ...prev,
          cuttable_width: formData.cuttableWidth,
          folder_type: formData.folderType,
          finish_width: formData.finishWidth,
          needle_gauge: formData.needleGauge,
        }));
        console.log("Response:", response.data);
        await refreshCurrentSubOperation();
        location.reload();
      }
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Failed to submit data");
    }
  };

  return (
    <div className="">
      {/* header */}
      <div className="flex items-center">
        <IoSettingsOutline className="text-6xl text-blue-500/60 animate-spin [animation-duration:7s]" />
        <div className="ml-2 border-l-4 border-blue-500/40 pl-1">
          <h3 className="text-blue-500/60 font-bold text-xl">
            Technical Data Entry Form
          </h3>
          <p className="text-blue-500/50 font-semibold ">
            Select operations and Add Technical Data
          </p>
        </div>
      </div>

      {/* select style area */}
      <fieldset className="p-4 flex justify-between mt-4 shadow rounded-md relative">
        <legend className="font-semibold italic">Select Operation</legend>

        {/* Clear Button */}
        {(baseData.styleNo ||
          baseData.operationId ||
          baseData.subOperationId) && (
          <button
            type="button"
            onClick={handleClearSelections}
            className="absolute top-2 right-2 text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Clear All
          </button>
        )}

        {/* Style Selection */}
        <div className="grid grid-cols-1 w-3/12" ref={styleDropdownRef}>
          <label htmlFor="styleSelect">Select Style</label>
          <div className="relative">
            <input
              id="styleSelect"
              className="py-2 rounded-md w-full px-2 border"
              placeholder="Search style..."
              value={styleSKey}
              onChange={(e) => {
                setStyleSKey(e.target.value);
                setShowStyleDropdown(true);
              }}
              onFocus={() => setShowStyleDropdown(true)}
            />

            {showStyleDropdown && filteredStyles && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-md shadow-md border border-gray-300 z-20 max-h-60 overflow-y-auto">
                {filteredStyles.length > 0 ? (
                  filteredStyles.map((sty) => (
                    <button
                      key={sty.style_id}
                      type="button"
                      className="p-2 border-b w-full text-left hover:bg-blue-50 transition-colors"
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
        </div>

        {/* Operation Selection */}
        <div className="grid grid-cols-1 w-3/12" ref={operationDropdownRef}>
          <label htmlFor="operationSelect">Select Operation</label>
          <div className="relative">
            <input
              id="operationSelect"
              className="py-2 rounded-md w-full px-2 border"
              placeholder="Search operation..."
              value={operationSKey}
              onChange={(e) => {
                setOperationSKey(e.target.value);
                setShowOperationDropdown(true);
              }}
              onFocus={() => setShowOperationDropdown(true)}
              disabled={!baseData.styleNo}
            />

            {showOperationDropdown &&
              filteredOperations &&
              baseData.styleNo && (
                <div className="absolute top-full left-0 right-0 bg-white rounded-md shadow-md border border-gray-300 z-20 max-h-60 overflow-y-auto">
                  {filteredOperations.length > 0 ? (
                    filteredOperations.map((operation) => (
                      <button
                        key={operation.operation_id}
                        type="button"
                        className="p-2 border-b w-full text-left hover:bg-blue-50 transition-colors"
                        onClick={() => handleOperationSelect(operation)}
                      >
                        <div className="font-medium">
                          {operation.operation_name}
                        </div>
                        {operation.subOperations && (
                          <div className="text-xs text-gray-500">
                            {operation.subOperations.length} sub-operation(s)
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">
                      {operations.length === 0
                        ? "No operations available"
                        : "No matching operations"}
                    </div>
                  )}
                </div>
              )}

            {!baseData.styleNo && (
              <p className="text-xs text-gray-500 mt-1">Select a style first</p>
            )}
          </div>
        </div>

        {/* Sub-Operation Selection */}
        <div className="grid grid-cols-1 w-3/12" ref={subOperationDropdownRef}>
          <label htmlFor="subOperationSelect">Select Sub-Operation</label>
          <div className="relative">
            <input
              id="subOperationSelect"
              className="py-2 rounded-md w-full px-2 border"
              placeholder="Search sub-operation..."
              value={subOperationSKey}
              onChange={(e) => {
                setSubOperationSKey(e.target.value);
                setShowSubOperationDropdown(true);
              }}
              onFocus={() => setShowSubOperationDropdown(true)}
              disabled={!baseData.operationId}
            />

            {showSubOperationDropdown &&
              filteredSubOperations &&
              baseData.operationId && (
                <div className="absolute top-full left-0 right-0 bg-white rounded-md shadow-md border border-gray-300 z-20 max-h-60 overflow-y-auto">
                  {filteredSubOperations.length > 0 ? (
                    filteredSubOperations.map((subOp) => (
                      <button
                        key={subOp.sub_operation_id}
                        type="button"
                        className="p-2 border-b w-full text-left hover:bg-blue-50 transition-colors"
                        onClick={() => handleSubOperationSelect(subOp)}
                      >
                        <div className="font-medium">
                          {subOp.sub_operation_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {subOp.sub_operation_number &&
                            `#${subOp.sub_operation_number}`}
                          {subOp.needle_type &&
                            ` • ${subOp.needle_type.needle_type}`}
                          {subOp.machine_type && ` • ${subOp.machine_type}`}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">
                      {selectedSubOperations.length === 0
                        ? "No sub-operations available"
                        : "No matching sub-operations"}
                    </div>
                  )}
                </div>
              )}

            {!baseData.operationId && (
              <p className="text-xs text-gray-500 mt-1">
                Select an operation first
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Selected Info Display */}
      {baseData.styleName && (
        <div className="ml-2 mb-4 border-t p-4 flex justify-between border mt-4 shadow rounded-md">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-semibold">Selected Style:</span>
              <span className="ml-2 text-blue-600">{baseData.styleName}</span>
            </div>
            {baseData.operationName && (
              <div>
                <span className="font-semibold">Selected Operation:</span>
                <span className="ml-2 text-green-600">
                  {baseData.operationName}
                </span>
              </div>
            )}
            {baseData.subOperationName && (
              <div>
                <span className="font-semibold">Selected Sub-Operation:</span>
                <span className="ml-2 text-purple-600">
                  {baseData.subOperationName}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* form area */}
      <div className="py-4">
        <Formik
          initialValues={initialData}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize={true}
          validateOnBlur={true}
          validateOnChange={true}
        >
          {({ setFieldError, resetForm, setFieldValue }) => (
            <Form className="border p-4 rounded-md shadow-md relative">
              <legend className="absolute -top-3 italic font-semibold text-red-700">
                Fill below fields
              </legend>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="">
                  <label htmlFor="" className="">
                    Folder cuttable width{" "}
                    <span className="text-red-600">*</span>
                  </label>
                  <div className="">
                    <Field
                      name="cuttableWidth"
                      type="number"
                      placeholder="Cuttable width"
                      className="px-2 py-2 rounded-md shadow lg:w-3/4"
                    />
                  </div>
                  <div className="text-red-500">
                    <ErrorMessage name="cuttableWidth" />
                  </div>
                </div>

                <div className="">
                  <label htmlFor="" className="">
                    Folder Type <span className="text-red-600">*</span>
                  </label>
                  <div className="">
                    <Field
                      name="folderType"
                      type="text"
                      placeholder="Cuttable width"
                      className="px-2 py-2 rounded-md shadow lg:w-3/4"
                    />
                  </div>
                  <div className="text-red-500">
                    <ErrorMessage name="folderType" />
                  </div>
                </div>

                <div className="">
                  <label htmlFor="" className="">
                    Finish Width <span className="text-red-600">*</span>
                  </label>
                  <div className="">
                    <Field
                      name="finishWidth"
                      type="number"
                      placeholder="Cuttable width"
                      className="px-2 py-2 rounded-md shadow lg:w-3/4"
                    />
                  </div>{" "}
                  <div className="text-red-500">
                    <ErrorMessage name="finishWidth" />
                  </div>
                </div>

                <div className="">
                  <label htmlFor="" className="">
                    Needle Gauge <span className="text-red-600">*</span>
                  </label>
                  <div className="">
                    <Field
                      name="needleGauge"
                      type="string"
                      placeholder="Cuttable width"
                      className="px-2 py-2 rounded-md shadow lg:w-3/4"
                    />
                  </div>
                  <div className="text-red-500">
                    <ErrorMessage name="needleGauge" />
                  </div>
                </div>
                <div className="flex w-full gap-x-4">
                  <button
                    type="submit"
                    className="p-2 bg-green-600 min-w-[150px] rounded-md font-semibold text-white"
                  >
                    Submit
                  </button>
                  <button className="p-2 bg-red-600 rounded-md min-w-[150px] font-semibold text-white">
                    Reset
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddTechnicalData;
