import React, { useState } from "react";
import { FaUserPlus } from "react-icons/fa";
import { useFormik } from "formik";
import * as yup from "yup";
import { motion, AnimatePresence } from "framer-motion";

const Register = () => {
  const factories = ["Factory A", "Factory B", "Factory C", "Factory D"];
  const departments = [
    "Production",
    "Quality Control",
    "Design",
    "Management",
    "Shipping",
  ];
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
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
      },
    },
  };

  // Shake effect for errors
  const errorVariants = {
    hidden: { x: 0, opacity: 0 },
    visible: {
      x: [0, -10, 10, -10, 10, 0], // Shake pattern
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeInOut",
      },
    },
    exit: { opacity: 0 },
  };

  // Field shake effect when invalid after submit
  const fieldErrorVariants = {
    shake: {
      x: [0, -5, 5, -5, 5, 0], // Subtler shake for fields
      transition: {
        duration: 0.4,
      },
    },
  };

  // Validation schema
  const validationSchema = yup.object({
    userName: yup
      .string()
      .required("Username is required")
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be 20 characters or less"),
    userEmail: yup
      .string()
      .required("Email is required")
      .email("Invalid email format"),
    userFactory: yup.string().required("Factory selection is required"),
    userDepartment: yup.string().required("Department selection is required"),
    userPassword: yup
      .string()
      .required("Password is required")
      .min(8, "Password must be at least 8 characters")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Password must contain at least one uppercase, one lowercase, one number and one special character"
      ),
    confirmPassword: yup
      .string()
      .required("Please confirm your password")
      .oneOf([yup.ref("userPassword"), null], "Passwords must match"),
    userCategory: yup.string().required("Select user category"),
  });

  // Formik configuration
  const formik = useFormik({
    initialValues: {
      userName: "",
      userEmail: "",
      userFactory: "",
      userDepartment: "",
      userPassword: "",
      confirmPassword: "",
      userCategory: "",
    },
    validationSchema,
    onSubmit: (values) => {
      console.log("Form submitted:", values);
      // Handle registration logic here
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    formik.handleSubmit(e);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.section
          className="w-full p-8 md:p-12 lg:p-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="flex flex-col items-center mb-4"
            variants={itemVariants}
          >
            <FaUserPlus className="text-6xl text-teal-500 mb-2" />
            <h1 className="text-3xl font-bold text-gray-800 uppercase tracking-wide">
              User Registration
            </h1>
          </motion.div>

          <form onSubmit={handleSubmit}>
            {/* Username Field */}
            <motion.div className="flex flex-col mb-6" variants={itemVariants}>
              <label htmlFor="userName" className="text-gray-700 mb-1">
                Username:
              </label>
              <motion.div
                animate={
                  submitAttempted && formik.errors.userName ? "shake" : ""
                }
                variants={fieldErrorVariants}
              >
                <input
                  type="text"
                  id="userName"
                  name="userName"
                  value={formik.values.userName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`border-b-2 px-2 py-2 w-full focus:outline-none transition-colors ${
                    formik.errors.userName &&
                    (formik.touched.userName || submitAttempted)
                      ? "border-red-600"
                      : "border-gray-300 focus:border-teal-500"
                  }`}
                  placeholder="Enter your username"
                />
              </motion.div>
              <AnimatePresence>
                {formik.errors.userName &&
                  (formik.touched.userName || submitAttempted) && (
                    <motion.p
                      className="text-red-600 text-sm mt-1"
                      variants={errorVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      key="username-error"
                    >
                      {formik.errors.userName}
                    </motion.p>
                  )}
              </AnimatePresence>
            </motion.div>

            {/* email and user category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Email Field */}
              <motion.div
                className="flex flex-col mb-6"
                variants={itemVariants}
              >
                <label htmlFor="userEmail" className="text-gray-700 mb-1">
                  Email:
                </label>
                <motion.div
                  animate={
                    submitAttempted && formik.errors.userEmail ? "shake" : ""
                  }
                  variants={fieldErrorVariants}
                >
                  <input
                    type="text"
                    id="userEmail"
                    name="userEmail"
                    value={formik.values.userEmail}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`border-b-2 px-2 py-2 w-full focus:outline-none transition-colors ${
                      formik.errors.userEmail &&
                      (formik.touched.userEmail || submitAttempted)
                        ? "border-red-600"
                        : "border-gray-300 focus:border-teal-500"
                    }`}
                    placeholder="Enter your email"
                  />
                </motion.div>
                <AnimatePresence>
                  {formik.errors.userEmail &&
                    (formik.touched.userEmail || submitAttempted) && (
                      <motion.p
                        className="text-red-600 text-sm mt-1"
                        variants={errorVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        key="email-error"
                      >
                        {formik.errors.userEmail}
                      </motion.p>
                    )}
                </AnimatePresence>
              </motion.div>
              {/* User category Field */}
              <motion.div
                className="flex flex-col mb-6"
                variants={itemVariants}
              >
                <label htmlFor="userCategory" className="text-gray-700 mb-1">
                  User Category:
                </label>
                <motion.div
                  animate={
                    submitAttempted && formik.errors.userEmail ? "shake" : ""
                  }
                  variants={fieldErrorVariants}
                >
                  <input
                    type="text"
                    id="userCategory"
                    name="userCategory"
                    value={formik.values.userCategory}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`border-b-2 px-2 py-2 w-full focus:outline-none transition-colors ${
                      formik.errors.userCategory &&
                      (formik.touched.userCategory || submitAttempted)
                        ? "border-red-600"
                        : "border-gray-300 focus:border-teal-500"
                    }`}
                    placeholder="Select your category"
                  />
                </motion.div>
                <AnimatePresence>
                  {formik.errors.userCategory &&
                    (formik.touched.userCategory || submitAttempted) && (
                      <motion.p
                        className="text-red-600 text-sm mt-1"
                        variants={errorVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        key="email-error"
                      >
                        {formik.errors.userCategory}
                      </motion.p>
                    )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Factory and Department Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Factory Field */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="userFactory"
                  className="text-gray-700 mb-1 block"
                >
                  Factory:
                </label>
                <motion.div
                  animate={
                    submitAttempted && formik.errors.userFactory ? "shake" : ""
                  }
                  variants={fieldErrorVariants}
                >
                  <select
                    id="userFactory"
                    name="userFactory"
                    value={formik.values.userFactory}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full border-b-2 px-2 py-2 focus:outline-none transition-colors ${
                      formik.errors.userFactory &&
                      (formik.touched.userFactory || submitAttempted)
                        ? "border-red-600"
                        : "border-gray-300 focus:border-teal-500"
                    }`}
                  >
                    <option value="">Select Factory</option>
                    {factories.map((factory, index) => (
                      <option key={index} value={factory}>
                        {factory}
                      </option>
                    ))}
                  </select>
                </motion.div>
                <AnimatePresence>
                  {formik.errors.userFactory &&
                    (formik.touched.userFactory || submitAttempted) && (
                      <motion.p
                        className="text-red-600 text-sm mt-1"
                        variants={errorVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        key="factory-error"
                      >
                        {formik.errors.userFactory}
                      </motion.p>
                    )}
                </AnimatePresence>
              </motion.div>

              {/* Department Field */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="userDepartment"
                  className="text-gray-700 mb-1 block"
                >
                  Department:
                </label>
                <motion.div
                  animate={
                    submitAttempted && formik.errors.userDepartment
                      ? "shake"
                      : ""
                  }
                  variants={fieldErrorVariants}
                >
                  <select
                    id="userDepartment"
                    name="userDepartment"
                    value={formik.values.userDepartment}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full border-b-2 px-2 py-2 focus:outline-none transition-colors ${
                      formik.errors.userDepartment &&
                      (formik.touched.userDepartment || submitAttempted)
                        ? "border-red-600"
                        : "border-gray-300 focus:border-teal-500"
                    }`}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept, index) => (
                      <option key={index} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </motion.div>
                <AnimatePresence>
                  {formik.errors.userDepartment &&
                    (formik.touched.userDepartment || submitAttempted) && (
                      <motion.p
                        className="text-red-600 text-sm mt-1"
                        variants={errorVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        key="department-error"
                      >
                        {formik.errors.userDepartment}
                      </motion.p>
                    )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Password Field */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="userPassword"
                  className="text-gray-700 mb-1 block"
                >
                  Password:
                </label>
                <motion.div
                  animate={
                    submitAttempted && formik.errors.userPassword ? "shake" : ""
                  }
                  variants={fieldErrorVariants}
                >
                  <input
                    type="password"
                    id="userPassword"
                    name="userPassword"
                    value={formik.values.userPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`border-b-2 px-2 py-2 w-full focus:outline-none transition-colors ${
                      formik.errors.userPassword &&
                      (formik.touched.userPassword || submitAttempted)
                        ? "border-red-600"
                        : "border-gray-300 focus:border-teal-500"
                    }`}
                    placeholder="Create password"
                  />
                </motion.div>
                <AnimatePresence>
                  {formik.errors.userPassword &&
                    (formik.touched.userPassword || submitAttempted) && (
                      <motion.p
                        className="text-red-600 text-sm mt-1"
                        variants={errorVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        key="password-error"
                      >
                        {formik.errors.userPassword}
                      </motion.p>
                    )}
                </AnimatePresence>
              </motion.div>

              {/* Confirm Password Field */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="confirmPassword"
                  className="text-gray-700 mb-1 block"
                >
                  Confirm Password:
                </label>
                <motion.div
                  animate={
                    submitAttempted && formik.errors.confirmPassword
                      ? "shake"
                      : ""
                  }
                  variants={fieldErrorVariants}
                >
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formik.values.confirmPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`border-b-2 px-2 py-2 focus:outline-none w-full transition-colors ${
                      formik.errors.confirmPassword &&
                      (formik.touched.confirmPassword || submitAttempted)
                        ? "border-red-600"
                        : "border-gray-300 focus:border-teal-500"
                    }`}
                    placeholder="Confirm password"
                  />
                </motion.div>
                <AnimatePresence>
                  {formik.errors.confirmPassword &&
                    (formik.touched.confirmPassword || submitAttempted) && (
                      <motion.p
                        className="text-red-600 text-sm mt-1"
                        variants={errorVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        key="confirm-password-error"
                      >
                        {formik.errors.confirmPassword}
                      </motion.p>
                    )}
                </AnimatePresence>
              </motion.div>
            </div>

            <motion.div
              className="flex flex-col space-y-4 md:mt-12"
              variants={itemVariants}
            >
              <motion.button
                type="submit"
                className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                whileHover={{ scale: 1.02, backgroundColor: "#0d9488" }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                Register
              </motion.button>

              <div className="text-center text-gray-600">
                Already have an account?{" "}
                <motion.a
                  href="/"
                  className="text-teal-600 font-medium hover:text-teal-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  Login here
                </motion.a>
              </div>
            </motion.div>
          </form>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default Register;
