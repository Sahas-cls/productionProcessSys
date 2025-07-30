import React from "react";
import ClipLoader from "react-spinners/ClipLoader";
import useFetchLayout from "../hooks/useLineLayout";
import { FaArrowCircleRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const ViewLayout = () => {
  const { layoutList, isLoading, refresh } = useFetchLayout();
  const navigate = useNavigate();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">
            Production Layouts
          </h1>
          <button
            onClick={refresh}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Loader */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <ClipLoader size={50} color="#2563EB" />
          </div>
        ) : layoutList?.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-10 bg-gray-50 rounded-xl p-8 border border-gray-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-medium text-gray-700 mb-2">
              No Layouts Found
            </h2>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              There are currently no production layouts available. Try
              refreshing the data or create a new layout.
            </p>
            <button
              onClick={refresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-sm transition-all duration-200"
            >
              Refresh Data
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.isArray(layoutList) &&
              layoutList.map((layout) => (
                <div
                  key={layout.layout_id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex justify-center items-center mb-3">
                      <h2 className="text-lg font-bold text-gray-800 truncate text-center">
                        Layout {layout.layout_id}
                      </h2>
                      {/* <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Active
                    </span> */}
                    </div>

                    <div className="px-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Style ID
                        </p>
                        <p className="text-gray-700 font-medium">
                          {layout.style_id}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Season ID
                        </p>
                        <p className="text-gray-700 font-medium">
                          {layout.season_id}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Workstations count
                        </p>
                        <p className="text-gray-700 font-medium">
                          {layout.workstation_count}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-100/70 px-5 py-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 text-right flex justify-end gap-2">
                      Created:{" "}
                      <span className="font-medium">
                        {new Date(layout.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/workstation/list-view", {
                            state: layout.layout_id,
                          })
                        }
                      >
                        <FaArrowCircleRight className="text-xl text-blue-500 hover:scale-105 duration-150" />
                      </button>
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewLayout;
