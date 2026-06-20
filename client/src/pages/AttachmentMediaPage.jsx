import React from "react";
import { useNavigate, useParams } from "react-router-dom";

const AttachmentMediaPage = () => {
  const { opId } = useParams();
  const navigate = useNavigate();
  console.log(opId);
  return <div>AttachmentMediaPage</div>;
};

export default AttachmentMediaPage;
