import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { MdOutlineArrowBack } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const ViewMachine = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state: machine } = location;
  
  // Helper function to get distinct style names
  const getStyleNames = () => {
    if (!machine?.sub_operations || machine.sub_operations.length === 0) {
      return "N/A";
    }
    
    const styleNames = new Set();
    machine.sub_operations.forEach(op => {
      if (op.style?.style_name) {
        styleNames.add(op.style.style_name);
      }
    });
    
    return Array.from(styleNames).join(" | ") || "N/A";
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 md:p-8"
    >
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header with back button */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-4 flex items-center justify-between text-white">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 hover:bg-blue-800 p-2 rounded-full transition"
          >
            <MdOutlineArrowBack className="text-xl" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-center">
            Machine Details: {machine?.machine_name || 'N/A'}
          </h1>
          <div className="w-8"></div> {/* Spacer for alignment */}
        </div>

        {/* Main content */}
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Machine Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Machine ID</p>
                <p className="font-medium">{machine?.machine_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Machine Number</p>
                <p className="font-medium">{machine?.machine_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{machine?.machine_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Brand</p>
                <p className="font-medium">{machine?.machine_brand || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{machine?.machine_location || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Needle Count</p>
                <p className="font-medium">{machine?.needle_count || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created At</p>
                <p className="font-medium">{formatDate(machine?.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium">{formatDate(machine?.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Styles and Operations */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Styles & Operations</h2>
            <div>
              <p className="text-sm text-gray-500">Related Styles</p>
              <p className="font-medium">{getStyleNames()}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Sub-Operations</p>
              <div className="space-y-3">
                {machine?.sub_operations?.length > 0 ? (
                  machine.sub_operations.map((op) => (
                    <div key={op.sub_operation_id} className="border rounded p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">{op.sub_operation_name}</span>
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          #{op.sub_operation_number}
                        </span>
                      </div>
                      <div className="mt-1 text-sm">
                        <p>SMV: {op.smv || 'N/A'}</p>
                        {op.style && (
                          <p>Style: {op.style.style_name} ({op.style.style_no})</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No sub-operations found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ViewMachine;