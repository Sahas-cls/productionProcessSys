import axios from "axios";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Formik, Form, Field, useFormikContext } from "formik";
import * as Yup from "yup";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

// Custom component to handle field updates
const SearchInputWithSuggestions = ({
  operationSearchKey,
  setOperationSearchKey,
  filteredOperations,
}) => {
  const { setFieldValue, values } = useFormikContext();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const suggestionRef = useRef(null);
  const inputRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize input value only once when component mounts
  useEffect(() => {
    if (
      !initialized &&
      values.sub_operation_id &&
      filteredOperations?.length > 0
    ) {
      const selectedOp = filteredOperations.find(
        (op) => op.sub_operation_id === values.sub_operation_id
      );
      if (selectedOp) {
        setInputValue(selectedOp.sub_operation_name);
      }
      setInitialized(true);
    }
  }, [values.sub_operation_id, filteredOperations, initialized]);

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
    setOperationSearchKey("");
    setShowSuggestions(false);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  // Handle clear button
  const handleClear = () => {
    setInputValue("");
    setFieldValue("sub_operation_id", "");
    setOperationSearchKey("");
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name="sub_operation_input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="px-2 py-2 rounded-md border border-black/40 mt-1 focus:ring-blue-400 focus:outline-none ring-2 w-full pr-8"
          placeholder="Enter operation name"
          autoComplete="off"
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions &&
          filteredOperations &&
          filteredOperations.length > 0 && (
            <motion.div
              ref={suggestionRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              {filteredOperations.map((op) => (
                <div
                  key={op.sub_operation_id}
                  className={`px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${
                    values.sub_operation_id === op.sub_operation_id
                      ? "bg-blue-100 text-blue-700"
                      : ""
                  }`}
                  onClick={() => handleSuggestionClick(op)}
                >
                  <p className="text-sm">{op.sub_operation_name}</p>
                </div>
              ))}
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

const AddSubOperation = ({ style_id, workstation_id, onSuccess, onCancel }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [subOperations, setSubOperations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationSearchKey, setOperationSearchKey] = useState("");

  const getSubOperations = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/layout/getLaSubOperations/${style_id}`
      );

      if (response.status === 200) {
        setSubOperations(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredOperations = useMemo(() => {
    if (!operationSearchKey) {
      return subOperations;
    }

    return subOperations?.filter((op) =>
      op.sub_operation_name
        .toLowerCase()
        .includes(operationSearchKey.toLowerCase())
    );
  }, [subOperations, operationSearchKey]);

  useEffect(() => {
    if (style_id) {
      getSubOperations();
    }
  }, [style_id]);

  const validationSchema = Yup.object().shape({
    sub_operation_id: Yup.string().required("Sub Operation is required"),
    workstation_id: Yup.string().required("Workstation is required"),
  });

  const handleSubmit = async (values, { resetForm }) => {
    setIsSubmitting(true);
    try {
      const payload = {
        style_id,
        workstation_id,
        sub_operation_id: values.sub_operation_id,
      };

      const response = await axios.post(
        `${apiUrl}/api/workstations/addSubOperationToWorkstation/${workstation_id}`,
        payload
      );

      if (response.status === 200) {
        resetForm();
        Swal.fire({
          title: "Sub operation added to the workstation",
          icon: "success",
          showCancelButton: false,
        });
        if (onSuccess) onSuccess(response.data);
      }
    } catch (error) {
      console.error("Error adding sub operation:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to add sub operation. Please try again.",
        icon: "error",
        showCancelButton: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialValues = {
    sub_operation_id: "",
    workstation_id: workstation_id,
  };

  return (
    <div className="bg-black/30 fixed inset-0 flex items-center justify-center z-50 p-4">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-[90%] max-w-sm sm:max-w-md bg-white rounded-lg shadow-lg max-h-[90vh]"
        >
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ errors, touched }) => (
              <Form>
                <div className="p-5 sm:p-7 w-full">
                  <h2 className="text-lg sm:text-xl font-bold mb-4">
                    Add Sub Operation
                  </h2>

                  {/* Dropdown with Search */}
                  <div className="grid mb-4 w-full">
                    <label htmlFor="sub_operation_id" className="text-sm">
                      Sub Operation
                    </label>

                    <SearchInputWithSuggestions
                      operationSearchKey={operationSearchKey}
                      setOperationSearchKey={setOperationSearchKey}
                      filteredOperations={filteredOperations}
                    />

                    {errors.sub_operation_id && touched.sub_operation_id && (
                      <div className="text-red-500 text-sm mt-1">
                        {errors.sub_operation_id}
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="submit"
                      className="bg-green-500 px-4 py-2 rounded-md text-white font-semibold w-full disabled:bg-green-300"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Adding..." : "Add Operation"}
                    </button>

                    <button
                      type="button"
                      onClick={onCancel}
                      className="bg-red-500 px-4 py-2 rounded-md text-white font-semibold w-full"
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

export default AddSubOperation;
