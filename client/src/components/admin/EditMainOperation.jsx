import React from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";

const EditMainOperation = () => {
  return (
    <div>
      <Formik>
        <Form>
          <div className="px-8 mt-4">
            <div className="">
              <label htmlFor="">Style Number</label>
              <Field className="form-input" placeholder="Style number" />
            </div>
            <div className="mt-4">
              <label htmlFor="">Operation Name</label>
              <Field className="form-input" placeholder="Operation name" />
            </div>
          </div>
        </Form>
      </Formik>
    </div>
  );
};

export default EditMainOperation;
