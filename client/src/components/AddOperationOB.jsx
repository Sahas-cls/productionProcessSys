import React from "react";
import { Form, Formik, Field, ErrorMessage } from "formik";
import { motion, AnimatePresence } from "framer-motion";
import { RxCross1 } from "react-icons/rx";
import useStyles from "../hooks/useStyles";
import * as yup from "yup";
import axios from "axios";
import Swal from "sweetalert2";

const AddOperationOB = ({
  setIsAddingMO,
  onSubmitData,
  fetchStyleData,
  state,
}) => {
  const { stylesList, refresh, isLoading } = useStyles();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Validation schema
  const validationSch = yup.object({
    style_no: yup
      .number()
      .typeError("Please select a style number")
      .required("Please select a style number"),
    operation_type: yup
      .number()
      .typeError("Please select operation type")
      .required("Please select operation type"),
    operation_name: yup.string().required("Please enter an operation name"),
  });

  const popupVarient = {
    hidden: { scale: 0, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 },
  };

  return (
    <AnimatePresence>
      <div className="text-right">
        <button
          type="button"
          className="hover:bg-red-400 hover:text-white p-2 text-xl rounded-sm"
          onClick={() => setIsAddingMO(false)}
        >
          <RxCross1 />
        </button>
      </div>

      <motion.div
        variants={popupVarient}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full h-full bg-gray-300/40 rounded-lg shadow-lg"
      >
        <h1 className="text-center pt-4 text-2xl mb-4 uppercase tracking-wide underline font-semibold">
          Add new Main operation
        </h1>

        <Formik
          initialValues={{
            style_no: state || "",
            operation_type: "",
            operation_name: "",
          }}
          validationSchema={validationSch}
          onSubmit={async (values, { resetForm }) => {
            console.log("Form submitted:", values);

            // Send data to parent or API
            try {
              const response = await axios.post(
                `${apiUrl}/api/operationBulleting/create/main-operation`,
                values,
                { withCredentials: true }
              );
              if (response.status === 200) {
                await Swal.fire({
                  title: "Main operation created",
                  icon: "success",
                });
                fetchStyleData();
                setIsAddingMO(false);
              }
            } catch (error) {
              console.error(error);
            }

            // Example API call
            // fetch("/api/operations", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify(values),
            // });

            resetForm();
            // setIsAddingMO(false);
          }}
        >
          {({ resetForm }) => (
            <Form className="grid grid-cols-1 px-8 py-8 gap-4">
              {/* Style No */}
              <div className="grid grid-cols-1">
                <label htmlFor="style_no">Style</label>
                <Field
                  as="select"
                  id="style_no"
                  className="rounded-md px-2 py-2 border-2 border-black/20 outline-none focus:ring-1 ring-blue-400"
                  name="style_no"
                >
                  <option value="">Select a style</option>
                  {Array.isArray(stylesList) && stylesList.length > 0 ? (
                    stylesList.map((sty) => (
                      <option
                        key={sty.style_id}
                        value={sty.style_id}
                      >{`${sty.style_no} (${sty.po_number})`}</option>
                    ))
                  ) : (
                    <option disabled>There are no styles yet</option>
                  )}
                </Field>
                <ErrorMessage
                  name="style_no"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>

              {/* Operation Type */}
              <div className="grid grid-cols-1">
                <label htmlFor="operation_type">Operation Type</label>
                <Field
                  as="select"
                  id="operation_type"
                  className="rounded-md px-2 py-2 border-2 border-black/20 outline-none focus:ring-1 ring-blue-400"
                  name="operation_type"
                >
                  <option value="">Select operation type</option>
                  <option value="1">Main Operation</option>
                  <option value="2">Helper Operation</option>
                </Field>
                <ErrorMessage
                  name="operation_type"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>

              {/* Operation Name */}
              <div className="grid grid-cols-1">
                <label htmlFor="operation_name">Operation Name</label>
                <Field
                  id="operation_name"
                  name="operation_name"
                  className="rounded-md px-2 py-2 border-2 border-black/20 outline-none focus:ring-1 ring-blue-400"
                  placeholder="Enter operation name"
                />
                <ErrorMessage
                  name="operation_name"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-4 px-8">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-gradient-to-r from-blue-600/70 to-blue-700 duration-200 py-2 rounded-lg text-white font-semibold"
                >
                  Submit
                </button>
                <button
                  type="button"
                  className="bg-red-500 hover:bg-red-600 duration-200 py-2 rounded-lg text-white font-semibold"
                  onClick={() => resetForm()}
                >
                  Reset
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddOperationOB;
