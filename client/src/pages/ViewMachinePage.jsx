import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, useParams } from "react-router-dom";
import { MdOutlineArrowBack } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BeatLoader } from "react-spinners";
import Swal from "sweetalert2";

const ViewMachine = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const [machine, setMachine] = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError] = useState(null);

  const machineId = params.id || location.state?.machine_id;

  useEffect(() => {
    if (!machine && machineId) {
      fetchMachineData(machineId);
    } else if (machine) {
      setLoading(false);
    }
  }, [machineId, machine]);

  const fetchMachineData = async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/machine/getMachine/${id}`,
        { withCredentials: true }
      );

      if (response.data.status === "success") {
        setMachine(response.data.data);
      } else {
        throw new Error(
          response.data.message || "Failed to fetch machine data"
        );
      }
    } catch (error) {
      console.error("❌ Error fetching machine data:", error);
      setError(error.message);

      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Failed to load machine details",
        icon: "error",
        confirmButtonText: "OK",
      }).then(() => navigate(-1));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "N/A";
    }
  };

  // Get unique styles from sub_operations -> mainOperation -> style
  const getUniqueStyles = () => {
    if (!machine?.sub_operations) return [];

    const stylesMap = new Map();

    machine.sub_operations.forEach((subOp) => {
      const style = subOp.mainOperation?.style;
      if (style && style.style_id) {
        stylesMap.set(style.style_id, style);
      }
    });

    return Array.from(stylesMap.values());
  };

  const styles = getUniqueStyles();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BeatLoader color="#3b82f6" size={15} />
          <p className="mt-4 text-gray-600">Loading machine details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Error Loading Machine
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-600 mb-2">
            Machine Not Found
          </h2>
          <p className="text-gray-500 mb-4">
            The requested machine could not be found.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 md:p-8"
    >
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
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
            Machine Details: {machine.machine_name}
          </h1>
          <div className="w-8"></div>
        </div>

        {/* Main content */}
        <div className="p-4 md:p-6">
          {/* Machine Basic Info */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold border-b pb-2 mb-4">
              Machine Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoCard label="Machine Name" value={machine.machine_name} />
              <InfoCard label="Machine Number" value={machine.machine_no} />
              <InfoCard label="Type" value={machine.machine_type} />
              <InfoCard label="Brand" value={machine.machine_brand} />
              <InfoCard label="Location" value={machine.machine_location} />

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={machine.machine_status} />
              </div>

              <InfoCard label="Machine ID" value={machine.machine_id} />
              <InfoCard
                label="Purchase Date"
                value={formatDate(machine.purchase_date)}
              />
              <InfoCard
                label="Last Service Date"
                value={formatDate(machine.service_date)}
              />
            </div>
          </div>

          {/* Styles Section */}
          <div>
            <h2 className="text-lg font-semibold border-b pb-2 mb-4">
              Associated Styles ({styles.length})
            </h2>

            {styles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {styles.map((style) => (
                  <StyleCard
                    key={style.style_id}
                    style={style}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="text-gray-400 text-4xl mb-3">📂</div>
                <p className="text-gray-500 italic">
                  No styles associated with this machine
                </p>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div>
                <span className="text-gray-500">Created At:</span>{" "}
                {formatDate(machine.createdAt)}
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>{" "}
                {formatDate(machine.updatedAt)}
              </div>
              {machine.supplier && (
                <div>
                  <span className="text-gray-500">Supplier:</span>{" "}
                  {machine.supplier}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Helper Components
const InfoCard = ({ label, value }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="font-medium">{value || "N/A"}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const getStatusClasses = () => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800";
      case "Not Assigned":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${getStatusClasses()}`}
    >
      {status || "Unknown"}
    </span>
  );
};

const StyleCard = ({ style, formatDate }) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-bold text-lg text-gray-800">{style.style_name}</h3>
        <p className="text-sm text-gray-600 mt-1">
          Style No: <span className="font-medium">{style.style_no}</span>
        </p>
      </div>
      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
        ID: {style.style_id}
      </span>
    </div>

    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-500">PO Number:</span>
        <span className="font-medium">{style.po_number || "N/A"}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-gray-500">Description:</span>
        <span className="font-medium text-right">
          {style.style_description || "N/A"}
        </span>
      </div>

      <div className="flex justify-between">
        <span className="text-gray-500">Created:</span>
        <span>{formatDate(style.createdAt)}</span>
      </div>
    </div>
  </div>
);

export default ViewMachine;
