import React, { useState, useMemo, useEffect, useRef } from "react";
import { Field, Form, Formik } from "formik";
import * as yup from "yup";
import { IoSettingsOutline } from "react-icons/io5";
import useStyles from "../../hooks/useStyles";
import axios from "axios";

const AddTechnicalData = ({ userRole }) => {
  //! use states
  const [styleSKey, setStyleSKey] = useState(""); // to hold style name entering value
  const [operationSKey, setOperationSKey] = useState(""); // to hold the operation entering value
  const [subOperationSKey, setSubOperationSKey] = useState(""); // to hold sub-operation entering value
  const [operations, setOperations] = useState([]);
  const [selectedSubOperations, setSelectedSubOperations] = useState([]);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showOperationDropdown, setShowOperationDropdown] = useState(false);
  const [showSubOperationDropdown, setShowSubOperationDropdown] =
    useState(false);

  const [baseData, setBaseData] = useState({
    styleNo: "",
    operationId: "",
    subOperationId: "",
    styleName: "",
    operationName: "",
    subOperationName: "",
  });

  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.API_URL;

  // Refs for outside click detection
  const styleDropdownRef = useRef(null);
  const operationDropdownRef = useRef(null);
  const subOperationDropdownRef = useRef(null);

  //! use effect - data fetchers
  useEffect(() => {
    const fetchOperations = async () => {
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
          // Extract operations from the nested structure
          const ops = response.data.data.operations || [];
          setOperations(ops);
        } else {
          setOperations([]);
        }
      } catch (error) {
        console.error("Error fetching operations:", error);
        setOperations([]);
      }
    };

    fetchOperations();
  }, [baseData.styleNo, apiUrl]);

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

  //! use memo's for filtering
  const filteredStyles = useMemo(() => {
    if (!styleSKey) {
      return stylesList;
    }

    return stylesList.filter((style) =>
      style.style_no.toLowerCase().includes(styleSKey.toLowerCase()),
    );
  }, [styleSKey, stylesList]);

  // Filter operations based on search
  const filteredOperations = useMemo(() => {
    if (!operationSKey) {
      return operations;
    }

    return operations.filter((operation) =>
      operation.operation_name
        ?.toLowerCase()
        .includes(operationSKey.toLowerCase()),
    );
  }, [operationSKey, operations]);

  // Filter sub-operations based on search
  const filteredSubOperations = useMemo(() => {
    if (!subOperationSKey) {
      return selectedSubOperations;
    }

    return selectedSubOperations.filter((subOp) =>
      subOp.sub_operation_name
        ?.toLowerCase()
        .includes(subOperationSKey.toLowerCase()),
    );
  }, [subOperationSKey, selectedSubOperations]);

  // Handle style selection
  const handleStyleSelect = (style) => {
    setStyleSKey(style.style_no);
    setBaseData((prev) => ({
      ...prev,
      styleNo: style.style_id,
      styleName: style.style_no,
      operationId: "",
      operationName: "",
      subOperationId: "",
      subOperationName: "",
    }));
    setOperationSKey("");
    setSubOperationSKey("");
    setOperations([]);
    setSelectedSubOperations([]);
    setShowStyleDropdown(false);
  };

  // Handle operation selection
  const handleOperationSelect = (operation) => {
    setOperationSKey(operation.operation_name);
    setBaseData((prev) => ({
      ...prev,
      operationId: operation.operation_id,
      operationName: operation.operation_name,
      subOperationId: "",
      subOperationName: "",
    }));
    setSubOperationSKey("");
    // Set sub-operations from the selected operation
    setSelectedSubOperations(operation.subOperations || []);
    setShowOperationDropdown(false);
  };

  // Handle sub-operation selection
  const handleSubOperationSelect = (subOperation) => {
    setSubOperationSKey(subOperation.sub_operation_name);
    setBaseData((prev) => ({
      ...prev,
      subOperationId: subOperation.sub_operation_id,
      subOperationName: subOperation.sub_operation_name,
    }));
    setShowSubOperationDropdown(false);
  };

  //! formik config
  const validationSchema = yup.object({
    /* no validations yet */
  });

  const initialData = {
    finishWidth: null,
    folderType: "",
    folderCW: null,
    needleGage: null,
    spreader: false,
    noOfNeedles: null,
    needleCType: null,
    sewingAllowance: null,
    cuttingAllowance: null,
    spi: null,
    needleType: null,
    spreaderType: null,
    looper: null,
  };

  const handleSubmit = (data) => {
    console.log("Submitting data:", { ...data, ...baseData });
    // Submit technical data with style, operation, and sub-operation info
  };

  return (
    <div className="">
      {/* header */}
      <div className="flex items-center">
        <IoSettingsOutline className="text-6xl text-blue-500/60 animate-spin [animation-duration:6s]" />
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
      <fieldset className=" p-4 flex justify-between mt-4 shadow rounded-md">
        <legend className="font-semibold italic">Select Operation</legend>

        {/* Style Selection */}
        <div className="grid grid-cols-1 w-3/12" ref={styleDropdownRef}>
          <label htmlFor="styleSelect">Select Style</label>
          <div className="relative">
            <input
              id="styleSelect"
              className="py-1 rounded-md w-full px-2 border"
              placeholder="Search style..."
              value={styleSKey}
              onChange={(e) => {
                setStyleSKey(e.target.value);
                setShowStyleDropdown(true);
              }}
              onFocus={() => setShowStyleDropdown(true)}
            />

            {/* Style Dropdown */}
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
              className="py-1 rounded-md w-full px-2 border"
              placeholder="Search operation..."
              value={operationSKey}
              onChange={(e) => {
                setOperationSKey(e.target.value);
                setShowOperationDropdown(true);
              }}
              onFocus={() => setShowOperationDropdown(true)}
              disabled={!baseData.styleNo}
            />

            {/* Operation Dropdown */}
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
              className="py-1 rounded-md w-full px-2 border"
              placeholder="Search sub-operation..."
              value={subOperationSKey}
              onChange={(e) => {
                setSubOperationSKey(e.target.value);
                setShowSubOperationDropdown(true);
              }}
              onFocus={() => setShowSubOperationDropdown(true)}
              disabled={!baseData.operationId}
            />

            {/* Sub-Operation Dropdown */}
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
        <div className="ml-2 border-t p-4 flex justify-between border mt-4 shadow rounded-md">
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
          validateOnBlur={true}
          validateOnChange={true}
        >
          {({ setFieldError, resetForm, setFieldValue }) => (
            <Form className="border p-4 rounded-md">
              <div className="">
                <fieldset className="border px-2 py-4 shadow grid grid-cols-3 gap-8 rounded-md">
                  <legend className="font-semibold italic">Folder Data</legend>
                  {/* finish width */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Finish Width(Raw/Cover):</label>
                    <Field
                      type="number"
                      name="finishWidth"
                      className="py-2 px-2 rounded-md border"
                      placeholder="EX: 23"
                    />
                  </div>
                  {/* folder type */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Folder Type:</label>
                    <Field
                      type="text"
                      name="folderType"
                      className="px-2 rounded-md border py-2"
                      placeholder="EX: Folder Type"
                    />
                  </div>
                  {/* folder cuttable width */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Folder Cuttable width:</label>
                    <Field
                      type="number"
                      name="folderCW"
                      className="px-2 rounded-md border py-2"
                      placeholder="Ex: 23.23"
                    />
                  </div>
                </fieldset>

                {/* section 2 needles*/}
                <fieldset className="border px-2 py-4 shadow grid grid-cols-2 gap-x-14 gap-y-2 mt-4 rounded-md">
                  <legend className="font-semibold italic">Needles Data</legend>
                  {/* needle gage */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Needle Gage:</label>
                    <Field
                      type=""
                      name="needleGage"
                      placeholder="Ex: 23"
                      className="py-2 px-2 rounded-md border"
                    />
                  </div>
                  {/* spreader */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Spreader:</label>
                    <Field
                      as="select"
                      className="py-2 px-2 rounded-md border"
                      name="spreader"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Field>
                  </div>
                  {/* no of needles */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">No of Needles:</label>
                    <Field
                      type=""
                      name="noOfNeedles"
                      className="py-2 px-2 rounded-md border"
                      placeholder="Ex: 2"
                    />
                  </div>
                  {/* no of needles */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Needle(Type/ Color):</label>
                    <Field
                      type="text"
                      name="needleCType"
                      placeholder="Ex: 10-11"
                      className="py-2 px-2 rounded-md border"
                    />
                  </div>
                </fieldset>
                {/* section 3 sewing */}
                <fieldset className="border px-2 py-4 shadow grid grid-cols-3 gap-x-8 gap-y-2 mt-4 rounded-md">
                  <legend className="font-semibold italic">Sewing</legend>
                  {/* needle gage */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Sewing Allowance:</label>
                    <Field
                      type=""
                      name="sewingAllowance"
                      placeholder="Ex: 9.9"
                      className="py-2 px-2 rounded-md border"
                    />
                  </div>
                  {/* spreader */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Cutting Allowance:</label>
                    <Field
                      type=""
                      name="cuttingAllowance"
                      placeholder="Ex: 2.2"
                      className="py-2 px-2 rounded-md border"
                    />
                  </div>
                  {/* no of needles */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">SPI:</label>
                    <Field
                      type=""
                      name="spi"
                      placeholder="Ex: 12"
                      className="py-2 px-2 rounded-md border"
                    />
                  </div>
                </fieldset>
                {/* section 4 thread */}
                <fieldset className="border px-2 py-4 shadow grid grid-cols-3 gap-x-8 gap-y-2 mt-4 rounded-md">
                  <legend className="font-semibold italic">Thread</legend>
                  {/* needle gage */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Needle (Type/ Color):</label>
                    <Field
                      type=""
                      name="needleType"
                      placeholder="Ex: 120tkt"
                      className="py-2 px-2 rounded-md border"
                    />
                  </div>
                  {/* spreader */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Spread (Type/ Color):</label>
                    <Field
                      type=""
                      name="spreaderType"
                      placeholder="Ex: "
                      className="py-2 px-2 rounded-md border"
                    />
                  </div>
                  {/* no of needles */}
                  <div className="grid grid-cols-1">
                    <label htmlFor="">Looper:</label>
                    <Field
                      type=""
                      name="looper"
                      placeholder="Ex: 160tkt"
                      className="py-2 px-2 rounded-md border"
                    />
                  </div>
                </fieldset>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddTechnicalData;
