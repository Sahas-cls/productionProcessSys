import axios from "axios";
import React, { useState, useEffect } from "react";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

const AddSubOperation = ({ style_id, workstation_id, onSuccess, onCancel }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [subOperations, setSubOperations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        // alert("Sub operation added to the workstation");
        Swal.fire({
          title: "Sub operation added to the workstation",
          icon: "success",
          showCancelButton: false,
        });
        if (onSuccess) onSuccess(response.data);
      }
    } catch (error) {
      console.error("Error adding sub operation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialValues = {
    sub_operation_id: "",
    workstation_id: workstation_id,
  };

  return (
    <div className="bg-black/30 fixed inset-0 flex items-center justify-center z-50">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white rounded-lg shadow-lg"
        >
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ errors, touched }) => (
              <Form>
                <div className="p-7">
                  <h2 className="text-xl font-bold mb-4">Add Sub Operation</h2>

                  <div className="grid mb-4">
                    <label htmlFor="sub_operation_id">Sub Operation</label>
                    <Field
                      name="sub_operation_id"
                      className="px-2 py-2 rounded-md border border-black/40 mt-1 focus:border-none focus:outline-none focus:ring-blue-400 ring-2"
                      as="select"
                    >
                      <option value="">Select an operation</option>
                      {Array.isArray(subOperations) &&
                        subOperations.map((subOp) => (
                          <option
                            key={subOp.sub_operation_id}
                            value={subOp.sub_operation_id}
                          >
                            {subOp.sub_operation_name}
                          </option>
                        ))}
                    </Field>
                    {errors.sub_operation_id && touched.sub_operation_id && (
                      <div className="text-red-500 text-sm mt-1">
                        {errors.sub_operation_id}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-x-4">
                    <button
                      type="submit"
                      className="bg-green-500 px-4 py-2 rounded-md text-white font-semibold disabled:bg-green-300"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Adding..." : "Add Operation"}
                    </button>
                    <button
                      type="button"
                      onClick={onCancel}
                      className="bg-red-500 px-4 py-2 rounded-md text-white font-semibold"
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
