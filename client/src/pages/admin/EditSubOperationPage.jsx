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
  const needleThreads = subOperation.needle_treads?.map((nt) => nt.tread) || [""];
  const needleLoopers = subOperation.needle_loopers?.map((nl) => nl.looper_type) || [""];
  const machine = subOperation.machines?.[0] || {};

  const apiUrl = import.meta.env.VITE_API_URL;

  return (
    <div className="bg-gray-50">
      <div className="">
        <a
          onClick={() => handleGoBack()}
          className="text-blue-500 absolute mt-4 ml-24 flex items-center hover:underline duration-150 cursor-pointer"
        >
          <span>
            <GoArrowLeft className="mr-2 text-xl font-extrabold" />
          </span>{" "}
          Go to Operation
        </a>
      </div>
      <div className="flex items-center justify-center min-h-screen ">
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
                navigate(-1); // Go back after successful update
              }
            } catch (error) {
              console.error("Error updating sub-operation:", error);
            }
          }}
        >
          {({ resetForm, values }) => (
            <Form className="bg-white border p-12 rounded-xl shadow-xl w-full max-w-5xl">
              <h1 className="text-xl text-center mb-12 uppercase tracking-wide font-semibold underline">
                Edit Sub-Operation
              </h1>
              <div className="grid grid-cols-3 gap-6">
                {/* Sub Operation Name */}
                <div className="flex flex-col">
                  <label className="font-medium mb-1">
                    Sub Operation Name:
                  </label>
                  <Field
                    name="soName"
                    className="border rounded px-3 py-2"
                    placeholder="Sub operation name"
                  />
                  <ErrorMessage
                    name="soName"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                {/* SMV */}
                <div className="flex flex-col">
                  <label className="font-medium mb-1">SMV</label>
                  <Field
                    name="smv"
                    className="border rounded px-3 py-2"
                    type="number"
                    step="0.01"
                  />
                  <ErrorMessage
                    name="smv"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                {/* Remark */}
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Remark</label>
                  <Field
                    name="remark"
                    className="border rounded px-3 py-2"
                    as="textarea"
                    rows={2}
                  />
                </div>

                {/* Machine Details */}
                <div className="col-span-3">
                  <h4 className="font-semibold text-lg mb-2">
                    Machine Details
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <label className="font-medium mb-1">Machine No</label>
                      <Field
                        name="machineNo"
                        className="border rounded px-3 py-2"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="font-medium mb-1">Machine Name</label>
                      <Field
                        name="machineName"
                        className="border rounded px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Needle Layout */}
                <div className="col-span-3 mt-6">
                  <h1 className="font-semibold text-lg mb-2">Needle Layout</h1>
                  <div className="grid grid-cols-3 gap-6">
                    {/* Needle Type */}
                    <div className="flex flex-col">
                      <label className="font-medium mb-1">Needle Type</label>
                      <FieldArray name="needleType">
                        {({ push, remove, form }) => (
                          <>
                            {form.values.needleType.map((_, index) => (
                              <div
                                key={index}
                                className="flex gap-2 items-center mb-2"
                              >
                                <Field
                                  name={`needleType[${index}]`}
                                  className="border rounded px-3 py-2 w-full"
                                />
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-red-500"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => push("")}
                              className="text-blue-500 text-sm mt-1"
                            >
                              + Add Needle Type
                            </button>
                          </>
                        )}
                      </FieldArray>
                    </div>

                    {/* Needle Thread */}
                    <div className="flex flex-col">
                      <label className="font-medium mb-1">Needle Thread</label>
                      <FieldArray name="needleThread">
                        {({ push, remove, form }) => (
                          <>
                            {form.values.needleThread.map((_, index) => (
                              <div
                                key={index}
                                className="flex gap-2 items-center mb-2"
                              >
                                <Field
                                  name={`needleThread[${index}]`}
                                  className="border rounded px-3 py-2 w-full"
                                />
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-red-500"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => push("")}
                              className="text-blue-500 text-sm mt-1"
                            >
                              + Add Needle Thread
                            </button>
                          </>
                        )}
                      </FieldArray>
                    </div>

                    {/* Needle Looper */}
                    <div className="flex flex-col">
                      <label className="font-medium mb-1">Needle Looper</label>
                      <FieldArray name="needleLooper">
                        {({ push, remove, form }) => (
                          <>
                            {form.values.needleLooper.map((_, index) => (
                              <div
                                key={index}
                                className="flex gap-2 items-center mb-2"
                              >
                                <Field
                                  name={`needleLooper[${index}]`}
                                  className="border rounded px-3 py-2 w-full"
                                />
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-red-500"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => push("")}
                              className="text-blue-500 text-sm mt-1"
                            >
                              + Add Needle Looper
                            </button>
                          </>
                        )}
                      </FieldArray>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-10 flex gap-4 justify-end">
                <button
                  type="button"
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
                  onClick={() => handleGoBack()}
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-yellow-500 text-white px-4 py-2 rounded"
                >
                  Reset
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default EditSubOperationPage;