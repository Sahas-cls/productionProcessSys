import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon, // Note: XIcon is now XMarkIcon in v2
} from "@heroicons/react/24/outline";

const ViewMachine = ({ machineId, onBack }) => {
  const location = useLocation();
  console.log("data that comes when navigating", location.state);
  const [isEditing, setIsEditing] = useState(false);
  const [machineData, setMachineData] = useState({
    type: "Type 1",
    name: "Example Machine",
    number: "MCH-001",
    brand: "Brand 1",
    style: "Style 1 | Style 2",
    location: "Cutting Section",
    operations: [
      { id: 1, name: "Front PKT Mouth TST" },
      { id: 2, name: "Back PKT Attach" },
    ],
    needleType: "DBx1",
    needleCount: "14",
    needleThread: "Polyester #40",
    bobbinThread: "Polyester #60",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMachineData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setIsEditing(false);
    // Add API call to save data here
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 py-6 bg-gray-200"
    >
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Machine Details</h1>
        <div className="flex gap-3"></div>
      </div>

      {/* Machine ID Badge */}
      <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-md inline-block mb-6">
        Machine ID: {machineId}
      </div>

      {/* Main Form Grid */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
              Basic Information
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Machine Type
              </label>
              <input
                type="text"
                name="type"
                value={machineData.type}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 rounded-md border ${
                  isEditing
                    ? "border-gray-300 focus:ring-2 focus:ring-blue-500"
                    : "border-transparent bg-gray-100"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Machine Name
              </label>
              <input
                type="text"
                name="name"
                value={machineData.name}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 rounded-md border ${
                  isEditing
                    ? "border-gray-300 focus:ring-2 focus:ring-blue-500"
                    : "border-transparent bg-gray-100"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Machine No
              </label>
              <input
                type="text"
                name="number"
                value={machineData.number}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 rounded-md border ${
                  isEditing
                    ? "border-gray-300 focus:ring-2 focus:ring-blue-500"
                    : "border-transparent bg-gray-100"
                }`}
              />
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
              Technical Details
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Machine Brand
              </label>
              <input
                type="text"
                name="brand"
                value={machineData.brand}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 rounded-md border ${
                  isEditing
                    ? "border-gray-300 focus:ring-2 focus:ring-blue-500"
                    : "border-transparent bg-gray-100"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Style
              </label>
              <input
                type="text"
                name="style"
                value={machineData.style}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 rounded-md border ${
                  isEditing
                    ? "border-gray-300 focus:ring-2 focus:ring-blue-500"
                    : "border-transparent bg-gray-100"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Machine Location
              </label>
              <input
                type="text"
                name="location"
                value={machineData.location}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 rounded-md border ${
                  isEditing
                    ? "border-gray-300 focus:ring-2 focus:ring-blue-500"
                    : "border-transparent bg-gray-100"
                }`}
              />
            </div>
          </div>

          {/* Needle Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
              Needle Configuration
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Needle Type
              </label>
              <input
                type="text"
                name="needleType"
                value={machineData.needleType}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 rounded-md border ${
                  isEditing
                    ? "border-gray-300 focus:ring-2 focus:ring-blue-500"
                    : "border-transparent bg-gray-100"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Needle Count
              </label>
              <input
                type="text"
                name="needleCount"
                value={machineData.needleCount}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 rounded-md border ${
                  isEditing
                    ? "border-gray-300 focus:ring-2 focus:ring-blue-500"
                    : "border-transparent bg-gray-100"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Bobbin Thread/Looper
              </label>
              <input
                type="text"
                name="bobbinThread"
                value={machineData.bobbinThread}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 rounded-md border ${
                  isEditing
                    ? "border-gray-300 focus:ring-2 focus:ring-blue-500"
                    : "border-transparent bg-gray-100"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operations Table */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Operations</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-500">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Operation
                </th>
                {isEditing && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {machineData.operations.map((op, index) => (
                <tr
                  key={op.id}
                  className={index % 2 === 0 ? "bg-blue-50" : "bg-white"}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <input
                        type="text"
                        value={op.name}
                        onChange={(e) => {
                          const newOps = [...machineData.operations];
                          newOps[index].name = e.target.value;
                          setMachineData({
                            ...machineData,
                            operations: newOps,
                          });
                        }}
                        className="w-full px-2 py-1 rounded border border-gray-300 focus:ring-blue-500"
                      />
                    ) : (
                      op.name
                    )}
                  </td>
                  {isEditing && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          const newOps = machineData.operations.filter(
                            (_, i) => i !== index
                          );
                          setMachineData({
                            ...machineData,
                            operations: newOps,
                          });
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isEditing && (
          <button
            onClick={() => {
              const newOp = { id: Date.now(), name: "New Operation" };
              setMachineData({
                ...machineData,
                operations: [...machineData.operations, newOp],
              });
            }}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Add Operation
          </button>
        )}
      </div>

      {/* Back Button */}
      <div className="flex justify-end">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Machines
        </button>
      </div>
    </motion.div>
  );
};

export default ViewMachine;
