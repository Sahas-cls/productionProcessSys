import axios from "axios";
import { setStyle } from "framer-motion";
import { useEffect, useState } from "react";
const apiUrl = import.meta.env.VITE_API_URL;

function useSeasons() {
  const [seasonsList, setseasonsList] = useState(null);
  //   const [isLoading, setIsLoading] = useState(null);

  const fetchSeasons = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/seasons/getSeasons`);
      setseasonsList(response.data.data);
      //   alert("got the seasons");
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, [apiUrl]);

  return {
    seasonsList: seasonsList,
    seasonRefresh: fetchSeasons,
    setseasonsList: setseasonsList,
  };
}

export default useSeasons;
