import React from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import { GoArrowLeft } from "react-icons/go";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const EditSubOperationPage = () => {
  const location = useLocation();
  const { subOperation, operationId } = location.state;
  const subOperationId = location.state?.subOperation.sub_operation_id;
  const navigate = useNavigate();
  console.log(location.state);

  const handleGoBack = () => {
    navigate(-1);
  };

  // Extract needle data from subOperation (not machine)
  const needleTypes = subOperation.needle_types?.map((nt) => nt.type) || [""];
  const needleThreads = subOperation.needle_treads?.map((nt) => nt.tread) || [
    "",
  ];
  const needleLoopers = subOperation.needle_loopers?.map(
    (nl) => nl.looper_type
  ) || [""];
  const machine = subOperation.machines?.[0] || {};

  const apiUrl = import.meta.env.VITE_API_URL;

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 group"
          >
            <GoArrowLeft className="mr-2 text-xl group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Operation
          </button>
        </div>

        <div className="flex items-center justify-center">
          <Formik
            initialValues={{
              soName: subOperation.sub_operation_name || "",
              smv: subOperation.smv || "",
              remark: subOperation.remark || "-",
              machineNo: machine?.machine_no || "",
              machineName: machine?.machine_name || "",
              needleType: needleTypes,
              needleThread: needleThreads,
              needleLooper: needleLoopers,
            }}
            onSubmit={async (values) => {
              try {
                console.log("Form submitted", values);
                const response = await axios.put(
                  `${apiUrl}/api/operationBulleting/edit-sub-operation/${subOperationId}`,
                  values,
                  {
                    withCredentials: true,
                  }
                );
                console.log(response);
                if (response.status === 200) {
                  navigate(-1);
                }
              } catch (error) {
                console.error("Error updating sub-operation:", error);
              }
            }}
          >
            {({ resetForm, values, isSubmitting }) => (
              <Form className="bg-white border border-gray-200 p-6 sm:p-8 lg:p-12 rounded-2xl shadow-lg w-full max-w-6xl hover:shadow-xl transition-shadow duration-300">
                {/* Form Header */}
                <div className="text-center mb-8 sm:mb-12">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                    Edit Sub-Operation
                  </h1>
                  <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                  {/* Sub Operation Name */}
                  <div className="flex flex-col lg:col-span-2">
                    <label className="font-semibold text-gray-700 mb-2 text-sm">
                      Sub Operation Name
                    </label>
                    <Field
                      name="soName"
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter sub operation name"
                    />
                    <ErrorMessage
                      name="soName"
                      component="div"
                      className="text-red-500 text-sm mt-2"
                    />
                  </div>

                  {/* SMV */}
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-700 mb-2 text-sm">
                      SMV
                    </label>
                    <Field
                      name="smv"
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                    />
                    <ErrorMessage
                      name="smv"
                      component="div"
                      className="text-red-500 text-sm mt-2"
                    />
                  </div>

                  {/* Remark */}
                  <div className="flex flex-col lg:col-span-3">
                    <label className="font-semibold text-gray-700 mb-2 text-sm">
                      Remark
                    </label>
                    <Field
                      name="remark"
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      as="textarea"
                      rows={3}
                      placeholder="Add any remarks..."
                    />
                  </div>

                  {/* Machine Details Section */}
                  <div className="lg:col-span-3">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center">
                        <span className="w-3 h-3 bg-blue-600 rounded-full mr-3"></span>
                        Machine Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Machine No
                          </label>
                          <Field
                            name="machineNo"
                            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            placeholder="Machine number"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Machine Name
                          </label>
                          <Field
                            name="machineName"
                            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            placeholder="Machine name"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Needle Layout Section */}
                  <div className="lg:col-span-3 mt-4">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center">
                        <span className="w-3 h-3 bg-green-600 rounded-full mr-3"></span>
                        Needle Layout
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                        {/* Needle Type */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-3 text-sm">
                            Needle Type
                          </label>
                          <FieldArray name="needleType">
                            {({ push, remove, form }) => (
                              <div className="space-y-3">
                                {form.values.needleType.map((_, index) => (
                                  <div
                                    key={index}
                                    className="flex gap-3 items-center"
                                  >
                                    <Field
                                      name={`needleType[${index}]`}
                                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 flex-1"
                                      placeholder={`Needle type ${index + 1}`}
                                    />
                                    {index > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                                        title="Remove needle type"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => push("")}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm mt-2 flex items-center transition-colors duration-200"
                                >
                                  <span className="mr-1">+</span> Add Needle
                                  Type
                                </button>
                              </div>
                            )}
                          </FieldArray>
                        </div>

                        {/* Needle Thread */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-3 text-sm">
                            Needle Thread
                          </label>
                          <FieldArray name="needleThread">
                            {({ push, remove, form }) => (
                              <div className="space-y-3">
                                {form.values.needleThread.map((_, index) => (
                                  <div
                                    key={index}
                                    className="flex gap-3 items-center"
                                  >
                                    <Field
                                      name={`needleThread[${index}]`}
                                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 flex-1"
                                      placeholder={`Thread ${index + 1}`}
                                    />
                                    {index > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                                        title="Remove needle thread"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => push("")}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm mt-2 flex items-center transition-colors duration-200"
                                >
                                  <span className="mr-1">+</span> Add Needle
                                  Thread
                                </button>
                              </div>
                            )}
                          </FieldArray>
                        </div>

                        {/* Needle Looper */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-3 text-sm">
                            Needle Looper
                          </label>
                          <FieldArray name="needleLooper">
                            {({ push, remove, form }) => (
                              <div className="space-y-3">
                                {form.values.needleLooper.map((_, index) => (
                                  <div
                                    key={index}
                                    className="flex gap-3 items-center"
                                  >
                                    <Field
                                      name={`needleLooper[${index}]`}
                                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 flex-1"
                                      placeholder={`Looper ${index + 1}`}
                                    />
                                    {index > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                                        title="Remove needle looper"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => push("")}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm mt-2 flex items-center transition-colors duration-200"
                                >
                                  <span className="mr-1">+</span> Add Needle
                                  Looper
                                </button>
                              </div>
                            )}
                          </FieldArray>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-end">
                  <button
                    type="button"
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium order-2 sm:order-1"
                    onClick={handleGoBack}
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors duration-200 font-medium order-3 sm:order-2"
                    disabled={isSubmitting}
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium order-1 sm:order-3 flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      "Update Sub-Operation"
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default EditSubOperationPage;
