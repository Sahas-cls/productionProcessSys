import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoSearchSharp, IoCloudUploadOutline, IoClose } from "react-icons/io5";
import { MdModeEditOutline, MdDeleteForever } from "react-icons/md";
import useFactories from "../../hooks/useFactories";
import useCustomer from "../../hooks/useCustomer";
import useSeasons from "../../hooks/useSeasons";
import { useFormik } from "formik";
import * as yup from "yup";
import axios from "axios";
import { useUser } from "../../contexts/userContext.jsx";
import useStyles from "../../hooks/useStyles.js";
import swal from "sweetalert2";

const AddStyle = () => {
  const { user } = useUser();
  // State management
  const { factories } = useFactories();
  const { customerList } = useCustomer();
  const { seasonsList } = useSeasons();
  const [isAddStyle, setIsAddStyle] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [filteredSeasons, setFilteredSeasons] = useState([]);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [errorStyles, setErrorStyles] = useState(null);
  const [editingStyle, setEditingStyle] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const { stylesList, isLoading, refresh } = useStyles();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Memoized filtered styles based on search term
  const filteredStyles = useMemo(() => {
    if (!searchTerm) return stylesList;

    return stylesList.filter(
      (style) =>
        style.style_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        style.style_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        style.factory?.factory_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        style.customer?.customer_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        style.season?.season
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        style.style_description
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
  }, [stylesList, searchTerm]);

  // Improved search function with debounce
  const handleSearch = (e) => {
    const value = e.target.value;

    // Clear previous timeout if exists
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout
    setSearchTimeout(
      setTimeout(() => {
        setSearchTerm(value);
      }, 300) // 300ms debounce delay
    );
  };

  // Clean up timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Toggle add/edit form
  const handleIsAddingStyle = () => {
    setIsAddStyle(!isAddStyle);
    setEditingStyle(null);
    setIsSubmitting(false);
    if (!isAddStyle) {
      formik.resetForm();
      setFiles([]);
      setPreviews([]);
    }
  };

  // Handle style edit
  const handleEditStyle = (style) => {
    setEditingStyle(style);
    setIsAddStyle(true);
    setIsSubmitting(false);
    formik.setValues({
      styleId: style.style_id,
      styleFactory: style.factory_id,
      styleCustomer: style.customer_id,
      styleSeason: style.season_id,
      styleNo: style.style_no,
      styleName: style.style_name,
      styleDescription: style.style_description || "",
      poNumber: style.po_number || "",
    });
    setCurrentCustomer(style.customer_id);

    // If editing, set the existing images as previews
    if (style.images && style.images.length > 0) {
      setPreviews(style.images.map((img) => `${apiUrl}/${img.image_path}`));
    }
  };

  // Handle style deletion
  const handleDeleteStyle = async (styleId) => {
    const result = await swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "After deleting style you can't recorver it again.",
      confirmButtonText: "Delete",
      showCancelButton: true,
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const respons = await axios.delete(
        `${apiUrl}/api/styles/deleteStyle/${styleId}`,
        { withCredentials: true }
      );
      refresh();
      swal.fire({
        icon: "success",
        title: "Success",
        text: "Style delete success",
        confirmButtonText: "Ok",
      });
    } catch (err) {
      console.error("Error deleting style:", err);
      alert("Failed to delete style");
    }
  };

  // Handle removing an image
  const handleRemoveImage = (index) => {
    const newFiles = [...files];
    const newPreviews = [...previews];

    // Remove the file if it exists in the files array
    if (index < newFiles.length) {
      newFiles.splice(index, 1);
      setFiles(newFiles);
    }

    // Remove the preview
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);

    // Revoke the object URL if it's a newly uploaded file
    if (previews[index].startsWith("blob:")) {
      URL.revokeObjectURL(previews[index]);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren",
      },
    },
    exit: {
      opacity: 0,
      transition: {
        when: "afterChildren",
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10,
      },
    },
    exit: {
      y: -20,
      opacity: 0,
      transition: {
        duration: 0.1,
      },
    },
  };

  const formVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 15,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      y: -50,
      scale: 0.95,
      transition: {
        duration: 0.1,
        ease: "easeInOut",
      },
    },
  };

  const buttonVariants = {
    hover: { scale: 1.03, boxShadow: "0px 5px 15px rgba(0,0,0,0.1)" },
    tap: { scale: 0.98 },
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  // Form validation schema
  const validationSchema = yup.object({
    styleFactory: yup.string().required("Factory is required"),
    styleCustomer: yup.string().required("Customer is required"),
    styleSeason: yup.string().required("Season is required"),
    styleNo: yup
      .string()
      .required("Style no is required")
      .matches(
        /^[A-Za-z0-9- /]+$/,
        "Style number can only contain letters and numbers"
      ),
    styleName: yup
      .string()
      .required("Style name is required")
      .matches(
        /^[A-Za-z0-9- /]+$/,
        "Style number can only contain letters and numbers"
      ),
  });

  // Formik form handling
  const formik = useFormik({
    initialValues: {
      styleFactory: "",
      styleCustomer: "",
      styleSeason: "",
      styleNo: "",
      poNumber: "",
      styleName: "",
      styleDescription: "",
      userId: localStorage.getItem("userId"),
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        const formData = new FormData();

        // Append all form values with correct field names
        formData.append("styleFactory", values.styleFactory);
        formData.append("styleCustomer", values.styleCustomer);
        formData.append("styleSeason", values.styleSeason);
        formData.append("styleNo", values.styleNo);
        formData.append("poNumber", values.poNumber);
        formData.append("styleName", values.styleName);
        formData.append("styleDescription", values.styleDescription);
        formData.append("userId", values.userId);

        // Append all files to formData
        files.forEach((file) => {
          formData.append("images", file);
        });

        // Debug: Log FormData contents
        console.log("FormData contents:");
        for (const [key, value] of formData.entries()) {
          console.log(key, value);
        }

        let response;
        if (editingStyle) {
          // For editing, include existing images
          formData.append(
            "existingImages",
            JSON.stringify(
              previews
                .filter((preview) => !preview.startsWith("blob:"))
                .map((preview) => preview.replace(`${apiUrl}/`, ""))
            )
          );

          response = await axios.put(
            `${apiUrl}/api/styles/editStyle/${editingStyle.style_id}`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
              withCredentials: true,
            }
          );
        } else {
          console.log("values: ", formData);
          response = await axios.post(
            `${apiUrl}/api/styles/addStyle`,
            formData,
            {
              withCredentials: true,
            }
          );
        }

        const handleExcelDownload = async () => {
          // clg
          try {
            const response = await axios.get(`${apiUrl}/api/styles/getExcel`, {
              withCredentials: true,
            });
          } catch (error) {
            console.error(error);
          }
        };

        formik.resetForm();
        setFiles([]);
        setPreviews([]);
        setCurrentCustomer(null);

        swal.fire({
          icon: "success",
          title: "Success",
          text: `Style ${editingStyle ? "updated" : "created"} successfully!`,
          confirmButtonText: "Ok",
        });

        setIsAddStyle(false);
        setEditingStyle(null);
        refresh();
      } catch (err) {
        console.error("Error:", err);
        swal.fire({
          icon: "error",
          title: "Error",
          text: `Failed to ${editingStyle ? "update" : "create"} style! ${
            err.response?.data?.message || err.message
          }`,
          confirmButtonText: "Ok",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    validateOnBlur: true,
    validateOnChange: true,
  });

  // Filter seasons based on selected customer
  useEffect(() => {
    if (currentCustomer && seasonsList) {
      const seasons = seasonsList.filter(
        (season) => season.customer_id == currentCustomer
      );
      setFilteredSeasons(seasons);
    } else {
      setFilteredSeasons([]);
    }
  }, [currentCustomer, seasonsList]);

  // Handle file upload
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);

    const newPreviews = [...previews];
    selectedFiles.forEach((file) => {
      newPreviews.push(URL.createObjectURL(file));
    });
    setPreviews(newPreviews);
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      previews.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previews]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto bg-gray-200 md:pt-8 pb-8 md:px-8 px-4 min-h-screen"
    >
      {/* Header Section */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pt-6"
        variants={itemVariants}
      >
        <motion.div
          className="relative w-full md:w-96"
          whileHover={{ scale: 1.01 }}
        >
          <input
            type="text"
            placeholder="Search styles..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            onChange={handleSearch}
          />
          <IoSearchSharp className="absolute left-3 top-3 text-gray-400" />
        </motion.div>

        <div className="flex gap-4 w-full md:w-auto">
          <motion.button
            type="button"
            className="bg-green-600 py-2 px-6 rounded-md text-white flex-1 md:flex-none"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleExcelDownload()}
          >
            Download
          </motion.button>
          <motion.button
            type="button"
            className="bg-blue-600 py-2 px-6 rounded-md text-white flex-1 md:flex-none"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleIsAddingStyle}
          >
            {isAddStyle ? "Close Form" : "Add Style"}
          </motion.button>
        </div>
      </motion.div>

      {/* Form Section */}
      <AnimatePresence>
        {isAddStyle && (
          <motion.form
            onSubmit={formik.handleSubmit}
            className="bg-white p-4 md:p-16 rounded-md shadow-md mb-6"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            key="add-style-form"
          >
            <div className="">
              <motion.h1
                className="text-xl font-medium text-center md:text-center mb-4 md:mb-10 md:tracking-wider mt-2 md:text-2xl md:-mt-9"
                variants={itemVariants}
              >
                {editingStyle ? "Edit Style" : "Add New Style"}
              </motion.h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mb-4">
              {/* Factory */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Factory
                </label>
                <select
                  name="styleFactory"
                  onChange={formik.handleChange}
                  value={formik.values.styleFactory}
                  onBlur={formik.handleBlur}
                  className="form-input-base w-full"
                >
                  <option value="">Select factory</option>
                  {factories?.map((f) => (
                    <option key={f.factory_id} value={f.factory_id}>
                      {f.factory_name}
                    </option>
                  ))}
                </select>
                {formik.touched.styleFactory && formik.errors.styleFactory && (
                  <motion.div
                    className="text-red-500 text-xs mt-1"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {formik.errors.styleFactory}
                  </motion.div>
                )}
              </motion.div>

              {/* Customer */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer
                </label>
                <select
                  name="styleCustomer"
                  onChange={(e) => {
                    formik.handleChange(e);
                    setCurrentCustomer(e.target.value);
                  }}
                  value={formik.values.styleCustomer}
                  onBlur={formik.handleBlur}
                  className="form-input-base w-full"
                >
                  <option value="">Select customer</option>
                  {customerList?.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.customer_name}
                    </option>
                  ))}
                </select>
                {formik.touched.styleCustomer &&
                  formik.errors.styleCustomer && (
                    <motion.div
                      className="text-red-500 text-xs mt-1"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {formik.errors.styleCustomer}
                    </motion.div>
                  )}
              </motion.div>

              {/* Season */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Season
                </label>
                <select
                  name="styleSeason"
                  onChange={formik.handleChange}
                  value={formik.values.styleSeason}
                  onBlur={formik.handleBlur}
                  disabled={!currentCustomer}
                  className="form-input-base w-full"
                >
                  <option value="">Select season</option>
                  {filteredSeasons.map((s) => (
                    <option key={s.season_id} value={s.season_id}>
                      {s.season}
                    </option>
                  ))}
                </select>
                {formik.touched.styleSeason && formik.errors.styleSeason && (
                  <motion.div
                    className="text-red-500 text-xs mt-1"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {formik.errors.styleSeason}
                  </motion.div>
                )}
              </motion.div>

              {/* Style No */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Style Number
                </label>
                <input
                  type="text"
                  name="styleNo"
                  value={formik.values.styleNo}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="form-input-base w-full"
                  placeholder="ST-2023-001"
                />
                {formik.touched.styleNo && formik.errors.styleNo && (
                  <motion.div
                    className="text-red-500 text-xs mt-1"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {formik.errors.styleNo}
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Style Name */}
            <motion.div variants={itemVariants} className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Style Name
              </label>
              <input
                type="text"
                name="styleName"
                value={formik.values.styleName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="form-input-base w-full"
                placeholder="T-Shirt"
              />
              {formik.touched.styleName && formik.errors.styleName && (
                <motion.div
                  className="text-red-500 text-xs mt-1"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {formik.errors.styleName}
                </motion.div>
              )}
            </motion.div>

            {/* po number */}
            <motion.div variants={itemVariants} className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Number
              </label>
              <input
                type="text"
                name="poNumber"
                value={formik.values.poNumber}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="form-input-base w-full"
                placeholder="PO No"
              />
              {formik.touched.poNumber && formik.errors.poNumber && (
                <motion.div
                  className="text-red-500 text-xs mt-1"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {formik.errors.poNumber}
                </motion.div>
              )}
            </motion.div>

            {/* Description */}
            <motion.div variants={itemVariants} className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="styleDescription"
                rows={3}
                placeholder="Enter style description..."
                className="form-input-base w-full"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.styleDescription}
              />
            </motion.div>

            {/* File Upload */}
            <motion.div variants={itemVariants} className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Style Images
              </label>
              <motion.label
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
              >
                <IoCloudUploadOutline className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-1">
                  <span className="font-semibold text-blue-600">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </motion.label>

              {/* Image Previews */}
              <AnimatePresence>
                {previews.length > 0 && (
                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    {previews.map((src, idx) => (
                      <motion.div
                        key={idx}
                        className="relative group"
                        whileHover={{ scale: 1.03 }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <img
                          src={src}
                          alt={`preview-${idx}`}
                          className="w-full h-32 object-cover rounded-md shadow"
                        />
                        <motion.button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemoveImage(idx);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <IoClose className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Form Actions */}
            <motion.div
              className="flex flex-col sm:flex-row justify-end gap-4"
              variants={itemVariants}
            >
              <motion.button
                type="button"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleIsAddingStyle}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className="px-6 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-700 disabled:bg-blue-400"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
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
                    {editingStyle ? "Updating..." : "Creating..."}
                  </span>
                ) : editingStyle ? (
                  "Update Style"
                ) : (
                  "Create Style"
                )}
              </motion.button>
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Styles Table */}
      <motion.div
        className="bg-white rounded-xl shadow-md max-h-[32rem] overflow-y-auto w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-500 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Factory
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Season
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Style No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Style Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(filteredStyles) && filteredStyles.length > 0 ? (
              filteredStyles.map((style) => (
                <motion.tr
                  key={style.style_id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {style.factory?.factory_name || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {style.customer?.customer_name || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {style.season?.season || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600">
                      {style.style_no || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {style.style_name || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 max-w-xs truncate">
                      {style.style_description || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-4">
                      <motion.button
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEditStyle(style)}
                      >
                        <MdModeEditOutline className="text-2xl" />
                      </motion.button>
                      <motion.button
                        className="text-red-600 hover:text-red-800 transition-colors duration-200"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteStyle(style.style_id)}
                      >
                        <MdDeleteForever className="text-2xl" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))
            ) : (
              <motion.tr>
                <td colSpan={7} className="py-4 text-center text-gray-400">
                  {searchTerm
                    ? "No matching styles found"
                    : "No styles available"}
                </td>
              </motion.tr>
            )}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
};

export default AddStyle;
