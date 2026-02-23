import React, { useState, useEffect, useMemo, useRef } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import axios from "axios";
import { IoMdClose } from "react-icons/io";

const AddHelperOperations = ({
  onClose,
  layoutId,
  workstationId,
  onOperationAdded,
  styleId,
  onRefresh,
}) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [filteredOperations, setFilteredOperations] = useState([]);
  const [operationSearchKey, setOperationSearchKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch helper operations for the style
  useEffect(() => {
    const fetchHelperOperations = async () => {
      if (!styleId) {
        console.error("Style ID is required to fetch helper operations");
        return;
      }

      try {
        setIsLoading(true);
        console.log("Fetching helper operations for style:", styleId);

        // Assuming you have an endpoint to get helper operations by style ID
        const response = await axios.get(
          `${apiUrl}/api/helperOp/getHelperOperations/${styleId}`,
        );

        console.log("Helper operations response:", response.data);

        if (response.status === 200) {
          // Assuming the response has a data array
          setFilteredOperations(response.data.data || response.data || []);
        }
      } catch (error) {
        console.error("Error fetching helper operations:", error);

        // Fallback: If you don't have the endpoint, use mock data
        console.log("Using fallback data...");
        setFilteredOperations([
          {
            helper_id: 16,
            operation_name: "Pouch cut & turn *2",
            operation_code: "H1",
            mc_smv: "0.7",
            mc_type: "CAL Manual Standing",
          },
          {
            helper_id: 17,
            operation_name: "Pouch tape attch mark *2",
            operation_code: "H2",
            mc_smv: "0.36",
            mc_type: "CAL Manual Standing",
          },
          {
            helper_id: 18,
            operation_name: "Pouch tape mark *2",
            operation_code: "H3",
            mc_smv: "0.12",
            mc_type: "CAL Manual Standing",
          },
          {
            helper_id: 19,
            operation_name: "pouch thred cut *2",
            operation_code: "H4",
            mc_smv: "0.3",
            mc_type: "CAL Manual Standing",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHelperOperations();
  }, [styleId, apiUrl]);

  // Extract operations from filteredOperations
  const allOperations = useMemo(() => {
    return filteredOperations.map((helper) => ({
      sub_operation_id: helper.helper_id,
      sub_operation_name: helper.operation_name,
      operation_code: helper.operation_code,
      mc_smv: helper.mc_smv,
      mc_type: helper.mc_type,
    }));
  }, [filteredOperations]);

  // Filter suggestions based on search key
  const suggestions = useMemo(() => {
    if (operationSearchKey.trim() === "") {
      return allOperations.slice(0, 10);
    } else {
      return allOperations
        .filter(
          (op) =>
            op.sub_operation_name
              .toLowerCase()
              .includes(operationSearchKey.toLowerCase()) ||
            (op.operation_code &&
              op.operation_code
                .toLowerCase()
                .includes(operationSearchKey.toLowerCase())),
        )
        .slice(0, 10);
    }
  }, [operationSearchKey, allOperations]);

  // Initial values for the form
  const initialValues = {
    sub_operation_id: "",
    operation_code: "",
    mc_smv: "",
    mc_type: "",
    sub_operation_name: "",
    workstation_id: workstationId,
    layout_id: layoutId,
  };

  // Validation schema
  const validationSchema = Yup.object({
    sub_operation_id: Yup.string().required("Operation is required"),
  });

  // Handle form submission
  const handleSubmit = async (values, { resetForm }) => {
    try {
      setIsSubmitting(true);
      console.log("Submitting values:", values);

      // Make API call to add operation to workstation
      const response = await axios.post(
        `${apiUrl}/api/workstations/add-helper-operation/${layoutId}`,
        values,
        { withCredentials: true },
      );

      if (response.status === 201 || response.status === 200) {
        Swal.fire({
          title: "Success!",
          text: "Operation added successfully",
          icon: "success",
        });

        if (onOperationAdded) {
          onOperationAdded();
        }
        onRefresh();
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error("Error adding operation:", error);
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Failed to add operation",
        icon: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-black/30 fixed inset-0 flex items-center justify-center z-50 p-4">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-[90%] max-w-sm sm:max-w-md bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto"
        >
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ values, errors, touched, setFieldValue }) => (
              <Form>
                <div className="p-5 sm:p-7 w-full">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold">
                        Add Operation to Workstation
                      </h2>
                      {workstationId && (
                        <p className="text-sm text-gray-600 mt-1">
                          Workstation ID: {workstationId}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-white hover:text-gray-700 text-xl bg-red-500 px-3 rounded-md py-2 flex items-center justify-center hover:bg-red-600"
                    >
                      <IoMdClose className="text-xl" />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="mb-4">
                    <label
                      htmlFor="search"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Search Operation
                    </label>
                    <SearchInputWithSuggestions
                      operationSearchKey={operationSearchKey}
                      setOperationSearchKey={setOperationSearchKey}
                      suggestions={suggestions}
                      setFieldValue={setFieldValue}
                      isLoading={isLoading}
                    />
                    {errors.sub_operation_id && touched.sub_operation_id && (
                      <div className="text-red-500 text-sm mt-1">
                        {errors.sub_operation_id}
                      </div>
                    )}
                  </div>

                  {/* Display selected operation details */}
                  {/* {values.sub_operation_id && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-md border">
                      <h3 className="font-medium text-gray-700 mb-2">
                        Selected Operation:
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Code:</span>{" "}
                          {values.operation_code}
                        </div>
                        <div>
                          <span className="text-gray-500">Name:</span>{" "}
                          {values.sub_operation_name}
                        </div>
                        <div>
                          <span className="text-gray-500">SMV:</span>{" "}
                          {values.mc_smv}
                        </div>
                        <div>
                          <span className="text-gray-500">Machine Type:</span>{" "}
                          {values.mc_type}
                        </div>
                      </div>
                    </div>
                  )} */}

                  {/* Buttons */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="submit"
                      className="bg-green-500 px-4 py-2 rounded-md text-white font-semibold w-full disabled:bg-green-300 hover:bg-green-600 transition-colors"
                      disabled={isSubmitting || !values.sub_operation_id}
                    >
                      {isSubmitting ? "Adding..." : "Add Operation"}
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="bg-red-500 px-4 py-2 rounded-md text-white font-semibold w-full hover:bg-red-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// NOTE search suggestion component
const SearchInputWithSuggestions = ({
  operationSearchKey,
  setOperationSearchKey,
  suggestions,
  setFieldValue,
  isLoading,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const suggestionRef = useRef(null);
  const inputRef = useRef(null);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setOperationSearchKey(value);
    setShowSuggestions(true);
  };

  // Handle suggestion click
  const handleSuggestionClick = (op) => {
    setInputValue(op.sub_operation_name);
    setFieldValue("sub_operation_id", op.sub_operation_id);
    setFieldValue("operation_code", op.operation_code);
    setFieldValue("mc_smv", op.mc_smv);
    setFieldValue("mc_type", op.mc_type);
    setFieldValue("sub_operation_name", op.sub_operation_name);
    setOperationSearchKey("");
    setShowSuggestions(false);
  };

  // Handle clear button
  const handleClear = () => {
    setInputValue("");
    setFieldValue("sub_operation_id", "");
    setFieldValue("operation_code", "");
    setFieldValue("mc_smv", "");
    setFieldValue("mc_type", "");
    setFieldValue("sub_operation_name", "");
    setOperationSearchKey("");
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder={
            isLoading ? "Loading operations..." : "Search operations..."
          }
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          autoComplete="off"
          disabled={isLoading}
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((op) => (
              <div
                key={op.sub_operation_id}
                onClick={() => handleSuggestionClick(op)}
                className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-gray-900">
                  {op.operation_code} - {op.sub_operation_name}
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>SMV: {op.mc_smv}</span>
                  <span className="truncate ml-2">{op.mc_type}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {showSuggestions &&
          suggestions.length === 0 &&
          operationSearchKey.trim() !== "" &&
          !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-gray-500"
            >
              No operations found for "{operationSearchKey}"
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default AddHelperOperations;
