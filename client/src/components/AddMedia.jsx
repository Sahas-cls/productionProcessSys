import axios from "axios";
import { Formik, Form, Field, FieldArray } from "formik";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const AddMedia = () => {
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const location = useLocation();
  const [formDataSet, setFormDataSet] = useState(null);
  const [loading, setLoading] = useState(true);
  console.log("form data  == ", formDataSet);
  const { state } = location;
  const apiUrl = import.meta.env.VITE_API_URL;
  console.log(state);

  const fetchDataSet = async () => {
    try {
      const response = await axios(
        `${apiUrl}/api/media/getMachineDetails/${state}`
      );

      if (response.status === 200) {
        console.log(response.data.data);
        setFormDataSet(response.data.data);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSet();
  }, [state]);

  const handleVideoUpload = (file, index, arrayHelpers) => {
    if (!file) return;

    // Simulate upload process
    setUploadingIndex(index);

    // In a real app, you would upload the file to your server here
    setTimeout(() => {
      arrayHelpers.replace(index, {
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file), // This is just for preview, in real app you'd use the server URL
      });
      setUploadingIndex(null);
    }, 1500);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!formDataSet) {
    return <div>No data available</div>;
  }

  return (
    <div className="flex justify-start items-start py-4 min-h-screen">
      <Formik
        initialValues={{
          style: formDataSet.mainOperation?.style?.style_name || "",
          styleNo: formDataSet.mainOperation?.style?.style_no || "",
          machineType: formDataSet.machines?.[0]?.machine_type || "",
          needleType: formDataSet.needle_types?.[0]?.type || "",
          operationNo: formDataSet.sub_operation_number || "",
          machineNo: formDataSet.machines?.[0]?.machine_no || "",
          needleTread: formDataSet.needle_treads?.[0]?.tread || "",
          operation: formDataSet.sub_operation_name || "",
          machineName: formDataSet.machines?.[0]?.machine_name || "",
          bobbinTread: formDataSet.needle_loopers?.[0]?.looper_type || "",
          comment: formDataSet.remark || "",
          videos: [],
        }}
        onSubmit={(values, { setSubmitting }) => {
          console.log(values);
          setSubmitting(false);
        }}
      >
        {({ values, setFieldValue, errors, touched, isSubmitting }) => (
          <Form className="w-full max-w-4xl mx-4 px-4 py-6 sm:px-8 sm:py-8 rounded-lg shadow-lg bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Form Fields */}
            <div className="space-y-1">
              <label
                htmlFor="style"
                className="block text-sm font-medium text-gray-700"
              >
                Style
              </label>
              <Field
                name="style"
                className="form-input w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="styleNo"
                className="block text-sm font-medium text-gray-700"
              >
                Style No
              </label>
              <Field
                name="styleNo"
                className="form-input w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="machineType"
                className="block text-sm font-medium text-gray-700"
              >
                Machine Type
              </label>
              <Field
                name="machineType"
                className="form-input w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="needleType"
                className="block text-sm font-medium text-gray-700"
              >
                Needle Type
              </label>
              <Field
                name="needleType"
                className="form-input w-full p-2 border rounded"
                readOnly
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="operationNo"
                className="block text-sm font-medium text-gray-700"
              >
                Operation No
              </label>
              <Field
                name="operationNo"
                className="form-input w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="machineNo"
                className="block text-sm font-medium text-gray-700"
              >
                Machine No
              </label>
              <Field
                name="machineNo"
                className="form-input w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="needleTread"
                className="block text-sm font-medium text-gray-700"
              >
                Needle Tread
              </label>
              <Field
                name="needleTread"
                className="form-input w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="operation"
                className="block text-sm font-medium text-gray-700"
              >
                Operation
              </label>
              <Field
                name="operation"
                className="form-input w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="machineName"
                className="block text-sm font-medium text-gray-700"
              >
                Machine Name
              </label>
              <Field
                name="machineName"
                className="form-input w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="bobbinTread"
                className="block text-sm font-medium text-gray-700"
              >
                Bobbin Tread
              </label>
              <Field
                name="bobbinTread"
                className="form-input w-full p-2 border rounded"
                readOnly
              />
            </div>

            {/* Comment Field */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-1">
              <label
                htmlFor="comment"
                className="block text-sm font-medium text-gray-700"
              >
                Comment
              </label>
              <Field
                as="textarea"
                name="comment"
                className="form-input w-full p-2 border rounded"
                rows="2"
              />
            </div>

            {/* Video Upload Section */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-4">
              <FieldArray name="videos">
                {(arrayHelpers) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Videos
                    </label>

                    {/* Add new video button */}
                    <div className="mb-4">
                      <input
                        id="video-upload"
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const index = values.videos.length;
                            arrayHelpers.push({});
                            handleVideoUpload(file, index, arrayHelpers);
                          }
                          e.target.value = "";
                        }}
                      />
                      <label
                        htmlFor="video-upload"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                      >
                        Add Video
                      </label>
                    </div>

                    {/* Video list */}
                    <div className="space-y-4">
                      {values.videos.length === 0 && (
                        <p className="text-gray-500 text-sm">
                          No videos added yet
                        </p>
                      )}

                      {values.videos.map((video, index) => (
                        <div
                          key={index}
                          className="border rounded-lg overflow-hidden"
                        >
                          {video.url ? (
                            <div>
                              <video
                                controls
                                src={video.url}
                                className="w-full max-h-64 object-contain bg-black"
                              />
                              <div className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <span className="text-sm truncate">
                                  {video.name}
                                </span>
                                <button
                                  type="button"
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                  onClick={() => arrayHelpers.remove(index)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <span className="text-sm">
                                {uploadingIndex === index ? (
                                  <span className="flex items-center">
                                    <svg
                                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    Uploading...
                                  </span>
                                ) : (
                                  "Empty slot"
                                )}
                              </span>
                              {uploadingIndex !== index && (
                                <div className="flex gap-2">
                                  <input
                                    id={`video-replace-${index}`}
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        handleVideoUpload(
                                          file,
                                          index,
                                          arrayHelpers
                                        );
                                      }
                                      e.target.value = "";
                                    }}
                                  />
                                  <label
                                    htmlFor={`video-replace-${index}`}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
                                  >
                                    Upload
                                  </label>
                                  <button
                                    type="button"
                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                    onClick={() => arrayHelpers.remove(index)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </FieldArray>
            </div>

            {/* Submit Button */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default AddMedia;
