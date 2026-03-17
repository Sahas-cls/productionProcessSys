import React from "react";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";

const EditLayout = () => {
  return (
    <div>
      <div className="">
        <Formik>
          {({}) => (
            <Form className="grid grid-cols-3">
              <div className="">
                <label htmlFor="">Style No</label>
                <Field className="form-input" />
              </div>
              <div className="">
                <label htmlFor="">Style Description</label>
                <Field className="form-input" />
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default EditLayout;
