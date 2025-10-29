import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const EditWorkstation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;
  console.log("workstation: ", state);
  const apiUrl = import.meta.env.VITE_API_URL;

  //   to fetch workstation details
  const [workstation, setWorkstation] = useState(null);
  const fetchWorkstation = async () => {
    //
    // alert("fetcing data");
    try {
      const response = await axios.get(
        `${apiUrl}/api/workstations/getWorkstation/${state}`
      );

      if (response.status === 200) {
        console.log("response data: ", response.data.data);
        setWorkstation(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchWorkstation();
  }, [state]);

  return <div>EditWorkstation {state}</div>;
};

export default EditWorkstation;
