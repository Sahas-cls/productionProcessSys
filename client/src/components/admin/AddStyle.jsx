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
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const AddStyle = ({ userRole }) => {
  const { user } = useUser();
  const navigate = useNavigate();
  // State management
  const { factories } = useFactories();
  const { customerList } = useCustomer();
  const { seasonsList } = useSeasons();
  const [isAddStyle, setIsAddStyle] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [filteredSeasons, setFilteredSeasons] = useState([]);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [errorStyles, setErrorStyles] = useState(null);
  const [editingStyle, setEditingStyle] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const { stylesList, isLoading: styleLoading, refresh } = useStyles();
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
          .includes(searchTerm.toLowerCase()),
    );
  }, [stylesList, searchTerm]);

  const excelDownload = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/styles/getExcel`, {
        withCredentials: true,
        responseType: "blob", // important for Excel/other files
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "styles.xlsx"); // filename
      document.body.appendChild(link);
      link.click();
      link.remove(); // cleanup
    } catch (error) {
      console.error("Excel download failed:", error);
    }
  };

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
      }, 300), // 300ms debounce delay
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
      setFrontImage(null);
      setBackImage(null);
      setFrontPreview(null);
      setBackPreview(null);
    }
  };

  // use state to store editing images
  const [eiditingImgs, setEditingImgs] = useState({
    frontImage: "",
    backImage: "",
  });

  // Handle style edit
  // Handle style edit
  const handleEditStyle = (style) => {
    // console.log("editing style: ", style);
    setEditingStyle(style);
    setIsAddStyle(true);
    setIsSubmitting(false);
    formik.setValues({
      styleFactory: style.factory_id,
      styleCustomer: style.customer_id,
      styleSeason: style.season_id,
      styleNo: style.style_no,
      styleName: style.style_name,
      styleDescription: style.style_description || "",
      poNumber: style.po_number || "",
      userId: localStorage.getItem("userId"),
    });
    setCurrentCustomer(style.customer_id);

    // Use the helper function here
    const mediaArray = style.style_medias || style.StyleMedia || [];

    if (mediaArray.length > 0) {
      mediaArray.forEach((media) => {
        const fullImageUrl = getImageUrl(media.media_url); // Using helper function

        if (media.media_type === "front") {
          setFrontPreview(fullImageUrl);
        } else if (media.media_type === "back") {
          setBackPreview(fullImageUrl);
        }
      });
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
        { withCredentials: true },
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
      if (err.response?.status === 401) {
        Swal.fire({
          title: "Unauthorized",
          text: "You don't have permission to perform this action please login again",
          icon: "error",
        }).then(() => navigate("./"));
      }
      alert("Failed to delete style");
    }
  };

  // Handle removing an image
  const handleRemoveImage = (type) => {
    if (type === "front") {
      if (frontPreview && frontPreview.startsWith("blob:")) {
        URL.revokeObjectURL(frontPreview);
      }
      setFrontImage(null);
      setFrontPreview(null);
    } else if (type === "back") {
      if (backPreview && backPreview.startsWith("blob:")) {
        URL.revokeObjectURL(backPreview);
      }
      setBackImage(null);
      setBackPreview(null);
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
        "Style number can only contain letters and numbers",
      ),
    styleName: yup
      .string()
      .required("Style name is required")
      .matches(
        /^[A-Za-z0-9- /]+$/,
        "Style number can only contain letters and numbers",
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
        Object.entries(values).forEach(([key, value]) => {
          formData.append(key, value);
        });

        // Append front image if exists
        if (frontImage) {
          formData.append("frontImage", frontImage);
        }

        // Append back image if exists
        if (backImage) {
          formData.append("backImage", backImage);
        }

        // For editing, include existing images
        if (editingStyle) {
          const existingImages = [];
          if (frontPreview && !frontPreview.startsWith("blob:")) {
            existingImages.push({
              path: frontPreview,
              type: "front",
            });
          }
          if (backPreview && !backPreview.startsWith("blob:")) {
            existingImages.push({
              path: backPreview,
              type: "back",
            });
          }

          formData.append("existingImages", JSON.stringify(existingImages));
        }

        // Create config with timeout to prevent premature termination
        const config = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
          timeout: 30000, // 30 second timeout
        };

        let response;
        if (editingStyle) {
          response = await axios.put(
            `${apiUrl}/api/styles/editStyle/${editingStyle.style_id}`,
            formData,
            config,
          );
        } else {
          response = await axios.post(
            `${apiUrl}/api/styles/addStyle`,
            formData,
            config,
          );
        }

        // Reset form and show success message
        formik.resetForm();
        setFrontImage(null);
        setBackImage(null);
        setFrontPreview(null);
        setBackPreview(null);
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
        if (err.response?.status === 401) {
          Swal.fire({
            title: "Unauthorized",
            text: "You don't have permission to perform this action please login again",
            icon: "error",
          }).then(() => navigate("/"));
        } else if (err.code === "ECONNABORTED") {
          swal.fire({
            icon: "error",
            title: "Timeout",
            text: "The request took too long. Please try again.",
            confirmButtonText: "Ok",
          });
        } else {
          swal.fire({
            icon: "error",
            title: "Error",
            text: `Failed to ${editingStyle ? "update" : "create"} style! ${
              err.response?.data?.message || err.message
            }`,
            confirmButtonText: "Ok",
          });
        }
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
        (season) => season.customer_id == currentCustomer,
      );
      setFilteredSeasons(seasons);
    } else {
      setFilteredSeasons([]);
    }
  }, [currentCustomer, seasonsList]);

  // Handle file upload for specific image type
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === "front") {
      setFrontImage(file);
      setFrontPreview(URL.createObjectURL(file));
    } else if (type === "back") {
      setBackImage(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (frontPreview && frontPreview.startsWith("blob:")) {
        URL.revokeObjectURL(frontPreview);
      }
      if (backPreview && backPreview.startsWith("blob:")) {
        URL.revokeObjectURL(backPreview);
      }
    };
  }, [frontPreview, backPreview]);

  const getImageUrl = (mediaUrl) => {
    if (!mediaUrl) return null;
    if (mediaUrl.startsWith("http")) return mediaUrl;
    return `${apiUrl}/api/b2-files/${mediaUrl}`;
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto bg-gray-200 md:pt-8 pb-8 md:px-8 px-4 min-h-screen"
    >
      {/* Header Section */}
      <motion.div
        className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6 pt-6"
        variants={itemVariants}
      >
        {/* Search Input - Full width on mobile, auto on desktop */}
        <motion.div
          className="relative w-full lg:w-auto lg:flex-1 max-w-2xl"
          whileHover={{ scale: 1.01 }}
          whileFocus={{ scale: 1.01 }}
        >
          <input
            type="text"
            placeholder="Search styles..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-base"
            onChange={handleSearch}
          />
          <IoSearchSharp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
        </motion.div>

        {/* Buttons Container - Stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <motion.button
            type="button"
            className="bg-green-600 py-3 px-6 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:bg-green-700 min-w-[120px]"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => excelDownload()}
          >
            Download
          </motion.button>

          {(userRole === "Admin" || userRole === "SuperAdmin") && (
            <motion.button
              type="button"
              className="bg-blue-600 py-3 px-6 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:bg-blue-700 min-w-[120px]"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleIsAddingStyle}
            >
              {isAddStyle ? "Close" : "Add Style"}
            </motion.button>
          )}
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
            {/* <motion.div variants={itemVariants} className="mb-6">
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
            </motion.div> */}

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

            {/* File Upload Section */}
            <motion.div variants={itemVariants} className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Style Images (Optional)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Front Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Front Image
                  </label>
                  <motion.label
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <IoCloudUploadOutline className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 mb-1">
                      <span className="font-semibold text-blue-600">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, GIF up to 5MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "front")}
                      className="hidden"
                    />
                  </motion.label>

                  {/* Front Image Preview */}
                  {/* Front Image Preview */}
                  <AnimatePresence>
                    {frontPreview && (
                      <motion.div
                        className="relative mt-4"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.1 }}
                      >
                        <div className="relative group">
                          <img
                            src={frontPreview}
                            alt="Front preview"
                            className="w-full h-40 object-contain rounded-md shadow"
                            onError={(e) => {
                              e.target.style.display = "none";
                              // You could show a placeholder image here
                            }}
                          />
                          <motion.button
                            type="button"
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage("front")}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <IoClose className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Back Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Back Image
                  </label>
                  <motion.label
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <IoCloudUploadOutline className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 mb-1">
                      <span className="font-semibold text-blue-600">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, GIF up to 5MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "back")}
                      className="hidden"
                    />
                  </motion.label>

                  {/* Back Image Preview */}
                  <AnimatePresence>
                    {backPreview && (
                      <motion.div
                        className="relative mt-4"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.1 }}
                      >
                        <div className="relative group">
                          <img
                            src={backPreview}
                            alt="Back preview"
                            className="w-full h-40 object-contain rounded-md shadow"
                          />
                          <motion.button
                            type="button"
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage("back")}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <IoClose className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Form Actions */}
            <motion.div
              className="flex flex-col sm:flex-row justify-end gap-4"
              variants={itemVariants}
            >
              <motion.button
                type="button"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm md:text-base"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleIsAddingStyle}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className="px-6 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-700 disabled:bg-blue-400 text-sm md:text-base"
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
                        d="M4 12a8 8 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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
        className="bg-white rounded-xl shadow-md max-h-[30rem] overflow-x-auto overflow-y-auto w-full block"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <table className="min-w-max divide-y w-full divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-500 sticky top-0 text-xs md:text-base">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-white uppercase tracking-wider">
                Factory
              </th>
              <th className="px-6 py-3 text-left font-medium text-white uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left font-medium text-white uppercase tracking-wider">
                Season
              </th>
              <th className="px-6 py-3 text-left font-medium text-white uppercase tracking-wider">
                Style No
              </th>
              <th className="px-6 py-3 text-left font-medium text-white uppercase tracking-wider">
                Style Name
              </th>
              <th className="px-6 py-3 text-left font-medium text-white uppercase tracking-wider">
                Description
              </th>
              {userRole === "Admin" || userRole === "SuperAdmin" ? (
                <th className="px-6 py-3 text-center font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              ) : (
                ""
              )}
            </tr>
          </thead>
          {styleLoading ? (
            <tbody className="bg-white divide-y divide-gray-200 text-xs md:text-base overflow-x-hidden">
              <tr className="overflow-x-hidden">
                <td colSpan={7} className="py-2">
                  <div className="flex flex-col items-center">
                    <div className="text-center border-2 border-blue-600 border-t-transparent border-b-transparent w-[50px] h-[50px] rounded-full animate-spin"></div>
                    <p className="">Styles Loading</p>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="bg-white divide-y divide-gray-200 text-xs md:text-base">
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
                      <div className="font-medium text-gray-900 flex items-center gap-x-6">
                        {style.style_medias?.[0]?.media_url && (
                          <img
                            // Use the new style-images endpoint instead of b2-files
                            src={`${apiUrl}/style-images/${style.style_medias[0].media_url.split("/").pop()}`}
                            alt="Style preview"
                            width={60}
                            height={60}
                            loading="lazy"
                            crossOrigin="anonymous"
                            className="object-cover rounded"
                            onError={(e) => {
                              console.error(
                                "Failed to load style image:",
                                e.target.src,
                              );
                              e.target.style.display = "none";
                              // Optional: Add fallback or show placeholder
                              const fallback = document.createElement("div");
                              fallback.className =
                                "w-[60px] h-[60px] bg-gray-200 rounded flex items-center justify-center";
                              fallback.innerHTML = `
        <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
        </svg>
      `;
                              e.target.parentNode.insertBefore(
                                fallback,
                                e.target,
                              );
                            }}
                            onLoad={(e) => {
                              console.log(
                                "✅ Style image loaded:",
                                e.target.src,
                              );
                            }}
                          />
                        )}
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
                    {userRole === "Admin" || userRole === "SuperAdmin" ? (
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
                    ) : (
                      ""
                    )}
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
          )}
        </table>
      </motion.div>
      {/* <div className="">
        <h1 className="text-3xl">img</h1>
        <img
          src={`${import.meta.env.VITE_API_URL}/media/STY-001-20_front.jpg`}
          alt="this is a style image"
        />
      </div> */}
    </motion.div>
  );
};

export default AddStyle;
