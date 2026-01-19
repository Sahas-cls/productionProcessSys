import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Formik, Form, Field } from "formik";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Plyr from "plyr-react";
import "plyr-react/plyr.css";
import { FaPlay, FaImage, FaFileExcel, FaFolder } from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import { MdOutlineDeleteForever } from "react-icons/md";
import { BsFillCloudUploadFill } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { MdPermMedia } from "react-icons/md";

const Report = () => {
  const [selectedStyle, setSelectedStyle] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;
  const [styleList, setStyleList] = useState([]);
  const [poList, setPoList] = useState([]);
  const [operations, setOperations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedOperations, setExpandedOperations] = useState({});
  const { user, loading: userLoading } = useAuth();
  const userRole = user?.userRole;
  // console.log("expanded operations", operations);
  // Memoize API URL
  const memoizedApiUrl = useMemo(() => apiUrl, [apiUrl]);

  // navigator
  const navigate = useNavigate();

  // Debounce function for API calls
  const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  const debouncedSelectedStyle = useDebounce(selectedStyle, 300);

  // Optimized API calls with useCallback
  const fetchStyles = useCallback(async () => {
    try {
      const response = await axios.get(
        `${memoizedApiUrl}/api/styles/getStylesUnq`,
        {
          withCredentials: true,
        }
      );
      if (response.status === 200) {
        setStyleList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching styles:", error);
    }
  }, [memoizedApiUrl]);

  const fetchPOs = useCallback(async () => {
    if (!debouncedSelectedStyle) {
      setPoList([]);
      return;
    }

    try {
      const response = await axios.get(
        `${memoizedApiUrl}/api/styles/getPOList/${debouncedSelectedStyle}`
      );

      if (response.status === 200) {
        setPoList(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  }, [debouncedSelectedStyle, memoizedApiUrl]);

  // Memoized PDF generation
  const downloadPDF = useCallback(() => {
    if (!operations) return;

    setLoading(true);

    // Use requestAnimationFrame for non-blocking PDF generation
    requestAnimationFrame(() => {
      try {
        const doc = new jsPDF();

        // Add header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("Style Summary Report", 105, 15, { align: "center" });

        // Add style information
        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text(`Style No: ${operations.style_no}`, 20, 25);
        doc.text(`Style Name: ${operations.style_name}`, 20, 30);
        doc.text(`Description: ${operations.style_description}`, 20, 35);

        // Add PO information
        doc.text(`PO Number: ${operations.po_number}`, 20, 45);

        // Add generation date
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          105,
          280,
          { align: "center" }
        );

        let yPosition = 60;

        // Add operations
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Operations", 20, yPosition);
        yPosition += 10;

        if (operations.operations && operations.operations.length > 0) {
          operations.operations.forEach((operation, opIndex) => {
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text(
              `${opIndex + 1}. ${operation.operation_name}`,
              20,
              yPosition
            );
            yPosition += 7;

            if (operation.subOperations && operation.subOperations.length > 0) {
              operation.subOperations.forEach((subOp) => {
                if (yPosition > 250) {
                  doc.addPage();
                  yPosition = 20;
                }

                doc.setFontSize(12);
                doc.setTextColor(80, 80, 80);
                doc.text(
                  `   Sub-operation: ${subOp.sub_operation_name} (${subOp.sub_operation_number})`,
                  25,
                  yPosition
                );
                yPosition += 5;
                doc.text(
                  `   SMV: ${subOp.smv} | Needle Count: ${subOp.needle_count}`,
                  25,
                  yPosition
                );
                yPosition += 5;

                // Add all details in a more compact way
                const details = [];

                if (subOp.machines?.length > 0) {
                  details.push(
                    `Machines: ${subOp.machines
                      .map((m) => `${m.machine_name} (${m.machine_type})`)
                      .join(", ")}`
                  );
                }

                if (subOp.needle_types?.length > 0) {
                  details.push(
                    `Needle Types: ${subOp.needle_types
                      .map((nt) => nt.type)
                      .join(", ")}`
                  );
                }

                if (subOp.needle_treads?.length > 0) {
                  details.push(
                    `Needle Threads: ${subOp.needle_treads
                      .map((nt) => nt.tread)
                      .join(", ")}`
                  );
                }

                if (subOp.needle_loopers?.length > 0) {
                  details.push(
                    `Needle Loopers: ${subOp.needle_loopers
                      .map((nl) => nl.looper_type)
                      .join(", ")}`
                  );
                }

                details.forEach((detail) => {
                  if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                  }
                  doc.text(`   ${detail}`, 25, yPosition);
                  yPosition += 5;
                });

                if (subOp.remark) {
                  if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                  }
                  doc.setTextColor(100, 100, 100);
                  doc.setFont("helvetica", "bold");
                  doc.text(`   Remark: ${subOp.remark}`, 25, yPosition);
                  doc.setFont("helvetica", "normal");
                  yPosition += 7;
                }

                yPosition += 3;
              });
            } else {
              doc.text("   No sub-operations found", 25, yPosition);
              yPosition += 7;
            }

            yPosition += 5;
          });
        } else {
          doc.text("No operations found", 20, yPosition);
        }

        doc.save(`${operations.style_no}_${operations.po_number}_summary.pdf`);
      } catch (error) {
        console.error("Error generating PDF:", error);
      } finally {
        setLoading(false);
      }
    });
  }, [operations]);

  // Optimized toggle functions
  const toggleOperation = useCallback((opIndex) => {
    setExpandedOperations((prev) => ({
      ...prev,
      [opIndex]: !prev[opIndex],
    }));
  }, []);

  const toggleSubOperation = useCallback((opIndex, subIndex) => {
    const key = `${opIndex}-${subIndex}`;
    setExpandedOperations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Memoized form submission
  const handleSubmit = useCallback(
    async (values) => {
      setLoading(true);
      try {
        const response = await axios.post(
          `${memoizedApiUrl}/api/styles/getStylesMo`,
          values,
          { withCredentials: true }
        );

        if (response.status === 200) {
          setOperations(response.data.data);
          setExpandedOperations({});
        }
      } catch (error) {
        console.error("Error fetching operations:", error);
      } finally {
        setLoading(false);
      }
    },
    [memoizedApiUrl]
  );

  // Memoized style change handler
  const handleStyleChange = useCallback((e, setFieldValue) => {
    const value = e.target.value;
    setSelectedStyle(value);
    setFieldValue("styleNo", value);
    setFieldValue("poNo", ""); // Reset PO when style changes
  }, []);

  // Effects with cleanup
  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  // Memoized video components
  const renderVideoPlayer = useCallback(
    (media) => (
      <Plyr
        key={media.sub_operation_id}
        source={{
          type: "video",
          title: media.sub_operation_name || "Video",
          sources: [
            {
              src: `${memoizedApiUrl}/videos/${media.media_url}`,
              type: "video/webm",
            },
          ],
        }}
        options={{
          controls: [
            "play-large",
            "play",
            "progress",
            "current-time",
            "duration",
            "mute",
            "volume",
            "settings",
            "pip",
            "fullscreen",
            "rewind",
            "fast-forward",
          ],
          ratio: "16:9",
          clickToPlay: true,
          tooltips: { controls: true, seek: true },
          keyboard: { global: true },
          seekTime: 10,
          disableContextMenu: true,
        }}
      />
    ),
    [memoizedApiUrl]
  );

  // Memoized form component
  const renderForm = useCallback(
    ({ setFieldValue, values }) => (
      <Form className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col">
          <label
            htmlFor="styleNo"
            className="mb-2 font-medium text-sm md:text-base"
          >
            Style
          </label>
          <Field
            as="select"
            name="styleNo"
            className="form-input border border-gray-300 rounded px-3 py-2 text-sm md:text-base transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            onChange={(e) => handleStyleChange(e, setFieldValue)}
          >
            <option value="">Select a style</option>
            {Array.isArray(styleList) && styleList.length > 0 ? (
              styleList.map((sty) => (
                <option key={sty.style_no} value={sty.style_no}>
                  {sty.style_no}
                </option>
              ))
            ) : (
              <option disabled>There are no styles yet</option>
            )}
          </Field>
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="poNo"
            className="mb-2 font-medium text-sm md:text-base"
          >
            PO Number
          </label>
          <Field
            as="select"
            name="poNo"
            className="form-input border border-gray-300 rounded px-3 py-2 text-sm md:text-base transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedStyle}
          >
            <option value="">Select PO Number</option>
            {Array.isArray(poList) && poList.length > 0 ? (
              poList.map((po) => (
                <option key={po.po_number} value={po.po_number}>
                  {po.po_number}
                </option>
              ))
            ) : (
              <option disabled>No PO Numbers yet</option>
            )}
          </Field>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!values.styleNo || !values.poNo || loading}
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </Form>
    ),
    [styleList, poList, selectedStyle, loading, handleStyleChange]
  );

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-lg md:text-xl font-semibold italic">
          Generate a Report
        </h1>
      </div>

      <Formik
        initialValues={{
          styleNo: "",
          poNo: "",
        }}
        onSubmit={handleSubmit}
      >
        {renderForm}
      </Formik>

      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {operations && !loading && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-bold">
              Style Summary Report
            </h2>
            <button
              onClick={downloadPDF}
              className="bg-green-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center hover:bg-green-700 transition-colors text-sm md:text-base w-full sm:w-auto justify-center"
              disabled={loading}
            >
              <svg
                className="w-4 h-4 md:w-5 md:h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                ></path>
              </svg>
              Download PDF
            </button>
          </div>

          <div className="p-4 md:p-6 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-2">
                  Style Information
                </h3>
                <p className="text-sm md:text-base">
                  <span className="font-medium">Style No:</span>{" "}
                  {operations.style_no}
                </p>
                <p className="text-sm md:text-base">
                  <span className="font-medium">Style Name:</span>{" "}
                  {operations.style_name}
                </p>
                <p className="text-sm md:text-base">
                  <span className="font-medium">Description:</span>{" "}
                  {operations.style_description}
                </p>
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-2">
                  Order Information
                </h3>
                <p className="text-sm md:text-base">
                  <span className="font-medium">PO Number:</span>{" "}
                  {operations.po_number}
                </p>
              </div>
            </div>

            <h3 className="text-lg md:text-xl font-semibold mb-4 border-b pb-2">
              Operations
            </h3>

            {operations.operations && operations.operations.length > 0 ? (
              operations.operations.map((operation, opIndex) => (
                <div
                  key={opIndex}
                  className="mb-4 border rounded-lg p-3 md:p-4 bg-gray-50"
                >
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => toggleOperation(opIndex)}
                  >
                    <h4 className="text-base md:text-lg font-medium">
                      {opIndex + 1}. {operation.operation_name}
                    </h4>
                    <svg
                      className={`w-4 h-4 md:w-5 md:h-5 transform transition-transform ${
                        expandedOperations[opIndex] ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </div>

                  {expandedOperations[opIndex] && (
                    <div className="mt-3 md:mt-4">
                      {operation.subOperations &&
                      operation.subOperations.length > 0 ? (
                        operation.subOperations.map((subOp, subIndex) => (
                          <div
                            key={subIndex}
                            className="mb-4 ml-2 md:ml-4 p-3 md:p-4 border rounded bg-white"
                          >
                            <div
                              className="flex justify-between items-center cursor-pointer"
                              onClick={() =>
                                toggleSubOperation(opIndex, subIndex)
                              }
                            >
                              <h5 className="font-medium text-sm md:text-base">
                                {subOp.sub_operation_name} (
                                {subOp.sub_operation_number})
                              </h5>
                              <svg
                                className={`w-4 h-4 transform transition-transform ${
                                  expandedOperations[`${opIndex}-${subIndex}`]
                                    ? "rotate-180"
                                    : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 9l-7 7-7-7"
                                ></path>
                              </svg>
                            </div>

                            {expandedOperations[`${opIndex}-${subIndex}`] && (
                              <div className="space-y-3">
                                {/* Compact list views */}
                                {subOp.machines &&
                                  subOp.machines.length > 0 && (
                                    <div>
                                      <h6 className="font-medium text-sm mb-1">
                                        Machines:
                                      </h6>
                                      <div className="flex flex-wrap gap-1 ml-2">
                                        {subOp.machines.map((machine) => (
                                          <span
                                            key={machine.machine_id}
                                            className="bg-gray-100 px-2 py-1 rounded text-xs"
                                          >
                                            {machine.machine_name} (
                                            {machine.machine_type})
                                          </span>
                                        ))}
                                        <div className="mt-2 bg-blue-100 w-full border-l-2 border-blue-600 p-2 md:p-4">
                                          <p className="text-xs md:text-sm text-gray-600 mb-3">
                                            SMV: {subOp.smv} | Needle Size:{" "}
                                            {subOp.needle_count}
                                          </p>

                                          <p className="text-xs md:text-sm text-gray-600 mb-3">
                                            Machine Type: {subOp.machine_type}
                                          </p>

                                          <p className="text-xs md:text-sm text-gray-600 mb-3">
                                            Thread:{" "}
                                            {subOp?.thread.thread_category} |
                                            Looper:{" "}
                                            {subOp?.looper.thread_category}
                                          </p>
                                        </div>
                                        {/* media navigators */}
                                        <div className="">
                                          {userRole === "Admin" ? (
                                            <div className="space-x-2 flex">
                                              {/* Videos Button */}
                                              <button
                                                type="button"
                                                className="bg-blue-500 text-black/60 rounded p-2 group hover:shadow-md"
                                                title="You can watch videos and other uploaded assets from here"
                                                onClick={() =>
                                                  navigate(
                                                    "/sub-operation/allMedia",
                                                    {
                                                      state: {
                                                        subOpId:
                                                          subOp.sub_operation_id,
                                                      },
                                                    }
                                                  )
                                                }
                                              >
                                                <div className="flex items-center gap-x-2 text-white">
                                                  <MdPermMedia className="text-xl hover:scale-125 group-hover:scale-110" />
                                                  <p>Go to Assets</p>
                                                </div>
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="space-x-2 flex">
                                              {/* Videos Button - User */}
                                              <button
                                                type="button"
                                                className="bg-blue-200 p-1 text-black/60 rounded"
                                                title="Watch videos"
                                                onClick={() =>
                                                  navigate(
                                                    "/sub-operation/allMedia",
                                                    {
                                                      state: {
                                                        subOpId:
                                                          subOp.sub_operation_id,
                                                      },
                                                    }
                                                  )
                                                }
                                              >
                                                <FaPlay className="text-xl text-black/60 hover:scale-125" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                {/* Similar compact views for other arrays */}
                                {[
                                  {
                                    key: "needle_types",
                                    label: "Needle Types",
                                  },
                                  {
                                    key: "needle_treads",
                                    label: "Needle Threads",
                                  },
                                  {
                                    key: "needle_loopers",
                                    label: "Needle Loopers",
                                  },
                                ].map(
                                  ({ key, label }) =>
                                    subOp[key] &&
                                    subOp[key].length > 0 && (
                                      <div key={key}>
                                        <h6 className="font-medium text-sm mb-1">
                                          {label}:
                                        </h6>
                                        <div className="flex flex-wrap gap-1 ml-2">
                                          {subOp[key].map((item, index) => (
                                            <span
                                              key={index}
                                              className="bg-gray-100 px-2 py-1 rounded text-xs"
                                            >
                                              {item.type ||
                                                item.tread ||
                                                item.looper_type}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                )}

                                {subOp.remark && (
                                  <p className="text-sm italic text-gray-600">
                                    <span className="font-medium">Remark:</span>{" "}
                                    {subOp.remark}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 ml-2 md:ml-4 text-sm">
                          No sub-operations found
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                No operations found
              </p>
            )}

            <div className="mt-6 md:mt-8 pt-4 border-t text-xs md:text-sm text-gray-500 text-center">
              Report generated on {new Date().toLocaleDateString()} at{" "}
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;
