import React, { useState, useEffect } from "react";
import { BsShieldLock } from "react-icons/bs";
import { motion, AnimatePresence } from "framer-motion";
import { loginData } from "../../data/loginData.js";
import { useFormik } from "formik";
import * as yup from "yup";
import axios from "axios";
import swal from "sweetalert2";
import { useUser } from "../../contexts/userContext.jsx";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverValidation, setServerValidation] = useState(false);
  const [serverMessages, setServerMessages] = useState(null);
  const { loginUser } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % loginData.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

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

  const slideVariants = {
    enter: { opacity: 0, x: 100 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
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
      .required("Name is required")
      .min(3, "Name should have at least 3 characters"),
    userPassword: yup
      .string()
      .required("Password is required")
      .min(3, "Password must be at least 6 characters"),
  });

  // Formik configuration
  const formik = useFormik({
    initialValues: {
      userName: "",
      userPassword: "",
      rememberMe: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      // console.log("Form submitted:", values);
      try {
        const result = await axios.post(`${apiUrl}/api/user/login`, values, {
          withCredentials: true,
        });
        // console.log(result);
        // console.log(result);
        if (result.status === 200) {
          setServerMessages({
            status: "success",
            message: "User Login success",
          });

          swal.fire({
            title: "User login success",
            icon: "success",
            confirmButtonText: "Ok",
            showCancelButton: false,
          });

          loginUser(result.data.user);

          const { userName, userId } = result.data?.user;
          localStorage.setItem("userName", userName);
          localStorage.setItem("userId", userId);
          // alert(userName);
          if (result.data?.user.userCategoryN === "Admin") {
            navigate("/dashboard");
          } else {
            navigate("/dashboard");
          }
        }
      } catch (error) {
        const res = error?.response;
        console.log(error);
        if (res?.status === 422 && res.data?.errors) {
          const serverErrors = res.data.errors;
          const formattedErrors = {};
          serverErrors.forEach((err) => {
            formattedErrors[err.field] = err.message;
          });
          formik.setErrors(formattedErrors);
        } else {
          setServerMessages({
            status: "error",
            message:
              res?.data?.message || "Something went wrong. Please try again.",
          });
        }
      }
      // Handle login logic here
    },
  });
  // console.log("server message", serverMessages);
  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   setSubmitAttempted(true);
  //   formik.handleSubmit(e);
  // };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-6xl bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Login Form Section */}
        <motion.section
          className="w-full md:w-1/2 p-8 md:p-12 lg:p-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="flex flex-col items-center"
            variants={itemVariants}
          >
            <BsShieldLock className="text-6xl text-teal-500 mb-2" />
            <h1 className="text-3xl font-bold mb-6 text-gray-800 uppercase tracking-wide">
              User Login
            </h1>
          </motion.div>

          <form onSubmit={formik.handleSubmit}>
            {/* Email Field */}
            <motion.div className="flex flex-col mb-6" variants={itemVariants}>
              <label htmlFor="userName" className="text-gray-700 mb-1">
                User Name:
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
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.userName}
                  className={`border-b-2 px-2 py-2 w-full focus:outline-none transition-colors placeholder:text-teal-500/70 ${
                    formik.errors.userName &&
                    (formik.touched.userName || submitAttempted)
                      ? "border-red-500"
                      : "border-gray-300 focus:border-teal-500"
                  }`}
                  placeholder="Enter your user name"
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
                      key="email-error"
                    >
                      {formik.errors.userName}
                    </motion.p>
                  )}
              </AnimatePresence>
            </motion.div>

            {/* Password Field */}
            <motion.div className="flex flex-col mb-6" variants={itemVariants}>
              <label htmlFor="userPassword" className="text-gray-700 mb-1">
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
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.userPassword}
                  className={`border-b-2 px-2 py-2 w-full focus:outline-none transition-colors placeholder:text-teal-500/70 ${
                    formik.errors.userPassword &&
                    (formik.touched.userPassword || submitAttempted)
                      ? "border-red-500"
                      : "border-gray-300 focus:border-teal-500"
                  }`}
                  placeholder="Enter your password"
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

            {/* Remember Me */}
            <motion.div
              className="flex justify-between items-center mb-8"
              variants={itemVariants}
            >
              <div className="flex items-center">
                {/* <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formik.values.rememberMe}
                  onChange={formik.handleChange}
                  className="mr-2 h-4 w-4 text-teal-500 focus:ring-teal-400 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="text-gray-700">
                  Remember me
                </label> */}
              </div>

              <motion.a
                href="#"
                className="text-teal-600 font-medium hover:text-teal-700 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                {/* Forgot password? */}
              </motion.a>
            </motion.div>

            <motion.div className="text-center" variants={itemVariants}>
              {serverMessages && serverMessages.message && (
                <div
                  className={`text-center mb-4 ${
                    serverMessages.status === "error"
                      ? "bg-red-200"
                      : "bg-green-200"
                  }`}
                >
                  <p
                    className={`${
                      serverMessages.status === "error"
                        ? "text-red-600"
                        : "text-green-600"
                    } py-2`}
                  >
                    {serverMessages.message}
                  </p>
                </div>
              )}
              <motion.button
                type="submit"
                className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all mb-4"
                whileHover={{ scale: 1.02, backgroundColor: "#0d9488" }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                Login
              </motion.button>

              <motion.a
                href="/user/registration"
                style={{ color: "#60a5fa" }}
                className="text-center mt-4 font-semibold tracking-wide"
                whileHover={{ color: "green" }}
                transition={{ duration: 0.5 }}
              >
                Register from here
              </motion.a>
            </motion.div>
          </form>
        </motion.section>

        {/* Image Carousel Section */}
        <section className="w-full md:w-1/2 bg-gradient-to-br from-teal-400 to-blue-500 relative overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key={currentSlide}
              className="absolute inset-0 flex items-center justify-center p-8 md:p-12 lg:p-16 bg-white/10 backdrop-blur-sm"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
            >
              <div className="text-center text-white w-full">
                <motion.img
                  src={loginData[currentSlide].img}
                  alt="Feature"
                  className="md:w-60 md:h-60 object-cover rounded-3xl opacity-80 mx-auto mb-6 shadow-xl shadow-black/40 border-white border-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: "150" }}
                />
                <motion.h3
                  className="text-xl md:text-2xl lg:text-2xl text-left mb-4 font-winky text-white/90 md:pt-4"
                  initial={{ scale: 0.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: "150" }}
                >
                  {loginData[currentSlide].body}
                </motion.h3>
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      </motion.div>
    </div>
  );
};

export default Login;
