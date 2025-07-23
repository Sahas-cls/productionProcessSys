import React, { useState, useEffect } from "react";
import Sidebar from "../Sidebar";
import Header from "../Header";
import { motion, AnimatePresence } from "framer-motion";
import AddCustomer from "../admin/AddCustomer";
import AddSeason from "../admin/AddSeason";
import AddStyle from "../admin/AddStyle";
import { Formik, Form, Field, ErrorMessage } from "formik";

const EditMainOperation = () => {
  const [toggleSidebar, setToggleSidebar] = useState(false);
  return (
    <div className="flex overflow-x-hidden min-h-screen h-full">
      <Sidebar
        toggleSidebar={toggleSidebar}
        setToggleSidebar={setToggleSidebar}
      />
      <div className="w-full h-full">
        <Header
          toggleSidebar={toggleSidebar}
          setToggleSidebar={setToggleSidebar}
        />

        <AnimatePresence mode="wait">
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-200 w-full min-h-screen"
          >
            {/* edit style form */}
            <Formik initialValues={{}} validationSchema={{}}>
              <div className="">
                <label htmlFor="">Operation Name: </label>
                <Field name="operationName" />
              </div>
            </Formik>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EditMainOperation;
