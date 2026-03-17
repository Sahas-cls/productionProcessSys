import React, { useEffect, useState } from "react";

const VideoPage = () => {
  const {
    isLoading: videosLoading,
    videosList,
    refreshVideos,
  } = useSubOpVideos(location.state.subOpId);

  const [loadingStates, setLoadingStates] = useState({
    videos: false,
    images: false,
    techPacks: false,
    folders: false,
  });

  useEffect(() => {
    if (location.state?.subOpId) {
      fetchAllMedia();
    }
  }, [location.state?.subOpId]);
  return <div>VideoPage</div>;
};

export default VideoPage;
