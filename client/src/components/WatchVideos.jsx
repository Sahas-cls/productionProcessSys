import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useSubOpVideos from "../hooks/useSubOpVideos";
import { FaArrowLeft, FaTrash, FaPlay } from "react-icons/fa";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
// Import React wrapper
import Plyr from "plyr-react";
// Import Plyr CSS for proper styling
import "plyr-react/plyr.css";
import Swal from "sweetalert2";

const WatchVideos = () => {
  const { user, loading } = useAuth();
  const userRole = user?.userRole;
  const location = useLocation();
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);

  const {
    isLoading: mediaLoading,
    videosList,
    refreshVideos,
  } = useSubOpVideos(location.state.subOpId);

  // Function to handle video deletion
  const handleDelete = async (so_media_id) => {
    if (!window.confirm("Are you sure you want to delete this video?")) {
      return;
    }

    setDeletingId(so_media_id);

    try {
      const response = await axios.delete(
        `${
          import.meta.env.VITE_API_URL
        }/api/subOperationMedia/deleteVideo/${so_media_id}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        refreshVideos();
        setTimeout(() => setDeletingId(null), 500);
      }
    } catch (error) {
      console.error("Delete error:", error);
      // alert("Failed to delete video. Please try again.");
      Swal.fire({
        title: "Failed to delete video. Please try again later.",
        icon: "error",
        showCancelButton: false,
      });
      setDeletingId(null);
    }
  };

  const formatSMV = (smv) => {
    return smv ? `${smv} minutes` : "N/A";
  };

  return (
    <div className="px-4 md:px-8 lg:px-16 xl:px-32 min-h-screen bg-gray-50 py-8">
      {mediaLoading ? (
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <BeatLoader color="#3b82f6" size={15} />
            <p className="mt-4 text-gray-600">Loading videos...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Page header */}
          <div className="mb-8 flex items-center justify-between">
            <button
              className="text-blue-600 font-medium flex items-center gap-2 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft />
              <span>Go back</span>
            </button>

            <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
              {videosList?.length || 0} video
              {videosList?.length !== 1 ? "s" : ""} found
            </div>
          </div>

          {/* Video grid */}
          {videosList && videosList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videosList.map((video) => (
                <div
                  key={video.so_media_id}
                  className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                >
                  {/* Video player with ReactPlayer */}
                  <div className="relative w-full aspect-video bg-black group">
                    <Plyr
                      source={{
                        type: "video",
                        title: video.sub_operation_name || "Video",
                        sources: [
                          {
                            src: `${import.meta.env.VITE_API_URL}/videos/${
                              video.media_url
                            }`,
                            type: "video/webm",
                          },
                        ],
                      }}
                      options={{
                        controls: [
                          "play-large", // Big play button in center
                          "play", // Play/pause button
                          "progress", // Progress bar (seeking)
                          "current-time", // Current time display
                          "duration", // Total duration display
                          "mute", // Mute/unmute
                          "volume", // Volume control
                          "settings", // Settings menu (speed, quality)
                          "pip", // Picture-in-picture
                          "fullscreen", // Fullscreen
                          "rewind", // Rewind button
                          "fast-forward", // Forward button
                        ],
                        ratio: "16:9",
                        clickToPlay: true,
                        tooltips: { controls: true, seek: true },
                        keyboard: { global: true }, // Allow keyboard shortcuts
                        seekTime: 10, // Amount of seconds to seek on rewind/forward
                        disableContextMenu: true, // Disable right-click menu
                      }}
                    />

                    {/* Play overlay indicator (hover only, doesn’t block clicks) */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20 pointer-events-none">
                      <FaPlay className="text-white text-3xl opacity-80" />
                    </div>

                    {/* Loading indicator for deletion */}
                    {deletingId === video.so_media_id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                        <BeatLoader color="#ffffff" size={10} />
                      </div>
                    )}
                  </div>

                  {/* Video details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                      {video.sub_operation_name || "Untitled Video"}
                    </h3>

                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">SMV:</span>
                        <span>{formatSMV(video.sub_operation?.smv)}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 flex justify-between items-center">
                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                        Uploaded:{" "}
                        {new Date(video.createdAt).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>

                      {userRole === "Admin" && (
                        <button
                          onClick={() => handleDelete(video.so_media_id)}
                          disabled={deletingId === video.so_media_id}
                          className="flex items-center gap-2 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {deletingId === video.so_media_id ? (
                            <BeatLoader color="#dc2626" size={5} />
                          ) : (
                            <>
                              <FaTrash size={14} />
                              Delete
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl shadow-sm">
              <div className="text-gray-400 mb-4 text-6xl">🎥</div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                No videos available
              </h3>
              <p className="text-gray-500 max-w-md">
                There are no videos uploaded for this sub-operation yet.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WatchVideos;
