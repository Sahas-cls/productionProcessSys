import React, { useState, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Report = () => {
  const [selectedStyle, setSelectedStyle] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;
  const [styleList, setStyleList] = useState([]);
  const [poList, setPoList] = useState([]);
  const [operations, setOperations] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStyles = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/styles/getStylesUnq`, {
        withCredentials: true,
      });
      if (response.status === 200) {
        setStyleList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching styles:", error);
    }
  };

  const fetchPOs = async () => {
    if (!selectedStyle) return;
    
    try {
      const response = await axios.get(
        `${apiUrl}/api/styles/getPOList/${selectedStyle}`
      );

      if (response.status === 200) {
        setPoList(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const downloadPDF = () => {
    const input = document.getElementById('summary-report');
    setLoading(true);
    
    html2canvas(input, {
      scale: 2,
      useCORS: true,
      logging: false
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${operations.style_no}_${operations.po_number}_summary.pdf`);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchStyles();
  }, []);

  useEffect(() => {
    fetchPOs();
  }, [selectedStyle]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold italic">
          Generate a Report
        </h1>
      </div>
      
      <Formik
        initialValues={{
          styleNo: "",
          poNo: "",
        }}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            const response = await axios.post(
              `${apiUrl}/api/styles/getStylesMo`,
              values,
              { withCredentials: true }
            );

            if (response.status === 200) {
              setOperations(response.data.data);
            }
          } catch (error) {
            console.error(error);
          } finally {
            setLoading(false);
          }
        }}
      >
        {({ setFieldValue, values }) => (
          <Form className="grid grid-cols-3 items-end gap-6 bg-white p-6 rounded-lg shadow-md mb-6">
            {/* Style dropdown */}
            <div className="flex flex-col">
              <label htmlFor="styleNo" className="mb-2 font-medium">Style</label>
              <Field
                as="select"
                name="styleNo"
                className="form-input border border-gray-300 rounded px-3 py-2"
                onChange={(e) => {
                  setSelectedStyle(e.target.value);
                  setFieldValue("styleNo", e.target.value);
                }}
              >
                <option value="">Select a style</option>
                {Array.isArray(styleList) && styleList.length > 0 ? (
                  styleList.map((sty, index) => (
                    <option key={index} value={sty.style_no}>
                      {sty.style_no}
                    </option>
                  ))
                ) : (
                  <option disabled>There are no styles yet</option>
                )}
              </Field>
            </div>

            {/* PO Number dropdown */}
            <div className="flex flex-col">
              <label htmlFor="poNo" className="mb-2 font-medium">PO Number</label>
              <Field
                as="select"
                name="poNo"
                className="form-input border border-gray-300 rounded px-3 py-2"
                disabled={!selectedStyle}
              >
                <option value="">Select PO Number</option>
                {Array.isArray(poList) && poList.length > 0 ? (
                  poList.map((po, index) => (
                    <option key={index} value={po.po_number}>
                      {po.po_number}
                    </option>
                  ))
                ) : (
                  <option disabled>No PO Numbers yet</option>
                )}
              </Field>
            </div>

            {/* Submit Button */}
            <div className="flex items-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                disabled={!values.styleNo || !values.poNo}
              >
                Generate Report
              </button>
            </div>
          </Form>
        )}
      </Formik>

      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {operations && !loading && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Style Summary Report</h2>
            <button
              onClick={downloadPDF}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 transition-colors"
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Download PDF
            </button>
          </div>

          <div id="summary-report" className="p-6 border border-gray-200 rounded-lg">
            {/* Header Information */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-lg font-semibold mb-2">Style Information</h3>
                <p><span className="font-medium">Style No:</span> {operations.style_no}</p>
                <p><span className="font-medium">Style Name:</span> {operations.style_name}</p>
                <p><span className="font-medium">Description:</span> {operations.style_description}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Order Information</h3>
                <p><span className="font-medium">PO Number:</span> {operations.po_number}</p>
                {/* <p><span className="font-medium">Season ID:</span> {operations.season_id}</p>
                <p><span className="font-medium">Customer ID:</span> {operations.customer_id}</p> */}
              </div>
            </div>

            {/* Operations Table */}
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Operations</h3>
            
            {operations.operations && operations.operations.length > 0 ? (
              operations.operations.map((operation, opIndex) => (
                <div key={opIndex} className="mb-8 border rounded-lg p-4 bg-gray-50">
                  <h4 className="text-lg font-medium mb-3">
                    {opIndex + 1}. {operation.operation_name}
                  </h4>
                  
                  {operation.subOperations && operation.subOperations.length > 0 ? (
                    operation.subOperations.map((subOp, subIndex) => (
                      <div key={subIndex} className="mb-6 ml-4 p-4 border rounded bg-white">
                        <h5 className="font-medium mb-2">
                          Sub-operation: {subOp.sub_operation_name} ({subOp.sub_operation_number})
                        </h5>
                        <p className="text-sm text-gray-600 mb-3">SMV: {subOp.smv} | Needle Count: {subOp.needle_count}</p>
                        
                        {/* Machines */}
                        {subOp.machines && subOp.machines.length > 0 && (
                          <div className="mb-3">
                            <h6 className="font-medium mb-1">Machines:</h6>
                            <ul className="list-disc list-inside ml-4">
                              {subOp.machines.map((machine, machineIndex) => (
                                <li key={machineIndex}>{machine.machine_name} ({machine.machine_type})</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Needle Types */}
                        {subOp.needle_types && subOp.needle_types.length > 0 && (
                          <div className="mb-3">
                            <h6 className="font-medium mb-1">Needle Types:</h6>
                            <ul className="list-disc list-inside ml-4">
                              {subOp.needle_types.map((needleType, typeIndex) => (
                                <li key={typeIndex}>{needleType.type}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Needle Threads */}
                        {subOp.needle_treads && subOp.needle_treads.length > 0 && (
                          <div className="mb-3">
                            <h6 className="font-medium mb-1">Needle Threads:</h6>
                            <ul className="list-disc list-inside ml-4">
                              {subOp.needle_treads.map((tread, treadIndex) => (
                                <li key={treadIndex}>{tread.tread}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Needle Loopers */}
                        {subOp.needle_loopers && subOp.needle_loopers.length > 0 && (
                          <div className="mb-3">
                            <h6 className="font-medium mb-1">Needle Loopers:</h6>
                            <ul className="list-disc list-inside ml-4">
                              {subOp.needle_loopers.map((looper, looperIndex) => (
                                <li key={looperIndex}>{looper.looper_type}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {subOp.remark && (
                          <p className="text-sm italic mt-2">Remark: {subOp.remark}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 ml-4">No sub-operations found</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No operations found</p>
            )}
            
            {/* Footer with generation date */}
            <div className="mt-8 pt-4 border-t text-sm text-gray-500 text-center">
              Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;