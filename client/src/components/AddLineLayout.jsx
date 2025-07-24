import React from "react";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";
import * as yup from "yup";

const AddLineLayout = () => {
  const validationSchema = yup.object({
    styleNo: yup.string().required("Style number required"),
    styleDescription: yup.string().required("Description Requred"),
    style: yup.string().required("Style Requred"),
    season: yup.string().required("Season Requred"),
    workstationCount: yup.string().required("Workstation Count Required"),
  });
  return (
    <div className="p-4 md:p-8 flex justify-center md:justify-start ">
      <div className="p-4 md:p-8 md:w-9/12 bg-white rounded-xl shadow-xl">
        <Formik
          initialValues={{
            styleNo: "",
            styleDescription: "",
            style: "",
            season: "",
            workstationCount: "",
          }}
          validationSchema={validationSchema}
          onSubmit={async (values) => {
            console.log(values);
          }}
        >
          {({ values, resetForm }) => (
            <Form>
              <h1 className="text-center md:text-start font-semibold uppercase text-lg md:mb-8">Add New Layout</h1>
              <div className="md:grid md:grid-cols-2 md:gap-x-24">
                <div className="mt-4">
                  <label htmlFor="">Style No:</label>
                  <Field as="select" className="form-input" name="styleNo">
                    <option value="">Option 1</option>
                    <option value="1">Option 2</option>
                    <option value="2">Option 3</option>
                  </Field>
                  <ErrorMessage
                    name="styleNo"
                    component="div"
                    className="text-red-600 text-sm ml-4"
                  />
                </div>
                <div className="mt-4">
                  <label htmlFor="">Style Description:</label>
                  <Field className="form-input" name="styleDescription" />
                  <ErrorMessage
                    name="styleDescription"
                    component="div"
                    className="text-red-600 text-sm ml-4"
                  />
                </div>
                <div className="mt-4">
                  <label htmlFor="">Style:</label>
                  <Field className="form-input" name="style" />
                  <ErrorMessage
                    name="style"
                    component="div"
                    className="text-red-600 text-sm ml-4"
                  />
                </div>
                <div className="mt-4">
                  <label htmlFor="">Season:</label>
                  <Field className="form-input" name="season" as="select">
                    <option value="">Season 1</option>
                    <option value="1">Season 2</option>
                    <option value="2">Season 3</option>
                  </Field>
                  <ErrorMessage
                    name="season"
                    component="div"
                    className="text-red-600 text-sm ml-4"
                  />
                </div>
                <div className="mt-4">
                  <label htmlFor="">Workstation Count:</label>
                  <Field
                    className="form-input"
                    name="workstationCount"
                    type="number"
                  />
                  <ErrorMessage
                    name="workstationCount"
                    component="div"
                    className="text-red-600 text-sm ml-4"
                  />
                </div>
                <div className="mt-8 col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white ml-2 duration-150"
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white ml-2 duration-150"
                    onClick={() => resetForm()}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddLineLayout;
