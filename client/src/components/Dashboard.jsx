import React, { useState, useEffect, useMemo } from "react";
import { MdGroups2 } from "react-icons/md";
import { FaTshirt } from "react-icons/fa";
import { GiHanger } from "react-icons/gi";
import { GiSewingNeedle, GiSewingMachine } from "react-icons/gi";
import { CiVideoOn } from "react-icons/ci";
import { IoMdImages } from "react-icons/io";
import { PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { FaRegFolderOpen } from "react-icons/fa";
import CountUp from "react-countup";
import axios from "axios";
import { TiFilter } from "react-icons/ti";

const Dashboard = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [baseCounts, setBaseCounts] = useState({
    customers: 0,
    machines: 0,
    styles: 0,
  });
  const [subCounts, setSubCounts] = useState({
    features: 0,
    operations: 0,
    videos: 0,
    images: 0,
    techPacks: 0,
    folders: 0,
  });
  const [styleList, setStyleList] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all styles on component mount
  const getStyles = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/dashboard/getStyles/all`);
      if (response.data && response.data.styles) {
        setStyleList(response.data.styles);
      }
    } catch (error) {
      console.error("Error fetching styles:", error);
    }
  };

  // Filter styles based on search input
  const filteredStyles = useMemo(() => {
    if (!searchInput) return [];

    return styleList
      .filter((style) =>
        style.style_no.toLowerCase().includes(searchInput.toLowerCase())
      )
      .slice(0, 8);
  }, [searchInput, styleList]);

  const countBaseItems = async () => {
    try {
      const baseCount = await axios.get(`${apiUrl}/api/dashboard/countBase`, {
        withCredentials: true,
      });
      const count = baseCount.data;
      setBaseCounts({
        customers: count.customerCount,
        machines: count.machineCount,
        styles: count.styles,
      });
    } catch (error) {
      console.log("error fetching base counts: ", error);
    }
  };

  const countSubItems = async () => {
    try {
      const subCount = await axios.get(`${apiUrl}/api/dashboard/countSub`, {
        withCredentials: true,
      });
      const count = subCount.data;
      setSubCounts({
        features: 80,
        operations: count.subOp,
        videos: count.videos,
        images: count.images,
        techPacks: count.techPacks,
        folders: count.folders,
      });
    } catch (error) {
      console.log("error fetching base counts: ", error);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    setShowSuggestions(value.length > 0);
  };

  // Handle style selection from suggestions
  const handleStyleSelect = (style) => {
    setSelectedStyle(style.style_no);
    setSearchInput(style.style_no);
    setShowSuggestions(false);
  };

  const filterSubData = async () => {
    if (!selectedStyle) return;

    setIsLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/dashboard/countSub/${selectedStyle}`
      );
      const count = response.data;
      setSubCounts({
        features: count.mainOp || 0,
        operations: count.subOp || 0,
        videos: count.videos || 0,
        images: count.images || 0,
        techPacks: count.techPacks || 0,
        folders: count.folders || 0,
      });
    } catch (error) {
      console.error("Error filtering data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    filterSubData();
  }, [selectedStyle]);

  // Clear search
  const clearSearch = () => {
    setSearchInput("");
    setSelectedStyle("");
    setShowSuggestions(false);
    // Reset to original counts when clearing
    countSubItems();
  };

  useEffect(() => {
    getStyles();
    countBaseItems();
    countSubItems();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="w-full min-h-screen px-3 sm:px-4 py-4 bg-white">
      {/* Top Stats Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-center">
        {/* section - customers */}
        <section className="w-full h-[90px] sm:h-[100px] shadow-lg rounded-2xl p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-blue-200 to-indigo-50 border border-black/30 border-blue-100">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="text-2xl sm:text-3xl lg:text-4xl text-blue-600 bg-blue-100 p-2 rounded-xl">
              <MdGroups2 />
            </div>
            <h4 className="font-semibold text-sm sm:text-base text-blue-800">
              Total Customers
            </h4>
          </div>
          <p className="text-xl sm:text-2xl text-blue-700 font-bold">
            <CountUp start={0} end={baseCounts.customers} duration={2} />
          </p>
        </section>

        {/* section - machines */}
        <section className="w-full h-[90px] sm:h-[100px] shadow-lg rounded-2xl p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-green-200 to-emerald-50 border border-black/30 border-green-100">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="text-2xl sm:text-3xl lg:text-4xl text-green-600 bg-green-100 p-2 rounded-xl">
              <GiSewingMachine />
            </div>
            <h4 className="font-semibold text-sm sm:text-base text-green-800">
              Total Machines
            </h4>
          </div>
          <p className="text-xl sm:text-2xl text-green-700 font-bold">
            <CountUp start={0} end={baseCounts.machines} duration={2} />
          </p>
        </section>

        {/* section - total styles */}
        <section className="w-full h-[90px] sm:h-[100px] shadow-lg rounded-2xl p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-orange-100 to-amber-50 border border-black/30 border-orange-100">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="text-2xl sm:text-3xl lg:text-4xl text-orange-600 bg-orange-200 p-2 rounded-xl">
              <FaTshirt />
            </div>
            <h4 className="font-semibold text-sm sm:text-base text-orange-800">
              Total Styles
            </h4>
          </div>
          <p className="text-xl sm:text-2xl text-orange-700 font-bold">
            <CountUp start={0} end={baseCounts.styles} duration={2} />
          </p>
        </section>
      </div>

      {/* Search Section - Responsive */}
      <div className="border-2 border-purple-100 mt-6 mb-4 rounded-xl p-4 bg-gradient-to-r from-purple-50 to-pink-50 shadow-md">
        <legend className="px-2 font-bold text-lg mb-4 text-purple-800">
          Filter By Style
        </legend>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 w-full">
            <h4 className="font-medium mb-2 text-sm sm:text-base text-gray-700">
              Search with style number
            </h4>
            <div className="relative">
              <input
                type="text"
                className="w-full border-2 border-purple-300 py-2 px-3 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm sm:text-base transition-all"
                placeholder="Enter style number"
                value={searchInput}
                onChange={handleSearchChange}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSuggestions(searchInput.length > 0);
                }}
              />

              {/* Clear button */}
              {searchInput && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-purple-500 hover:text-purple-700 text-lg bg-purple-100 w-6 h-6 rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              )}

              {/* Suggestions dropdown */}
              {showSuggestions && filteredStyles.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-purple-200 rounded-lg shadow-xl max-h-48 sm:max-h-60 overflow-auto">
                  {filteredStyles.map((style, index) => (
                    <div
                      key={style.style_no}
                      className="px-3 py-2 cursor-pointer hover:bg-purple-100 transition-colors text-sm sm:text-base border-b border-purple-50 last:border-b-0"
                      onClick={() => handleStyleSelect(style)}
                    >
                      {style.style_no}
                    </div>
                  ))}
                </div>
              )}

              {/* No results message */}
              {showSuggestions &&
                searchInput &&
                filteredStyles.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-purple-200 rounded-lg shadow-xl">
                    <div className="px-3 py-2 text-purple-600 text-sm sm:text-base">
                      No styles found matching "{searchInput}"
                    </div>
                  </div>
                )}
            </div>
          </div>

          <button className="w-full sm:w-auto mt-2 sm:mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-6 rounded-lg border-0 shadow-md flex justify-center items-center group hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105">
            <TiFilter className="text-xl sm:text-2xl group-hover:scale-110 duration-200" />
            <p className="ml-2 text-sm sm:text-base font-medium">Filter</p>
          </button>
        </div>

        {/* Selected style display */}
        {selectedStyle && (
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-blue-800 text-sm sm:text-base font-medium">
                <span className="font-bold">Selected Style:</span>{" "}
                {selectedStyle}
              </p>
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Stats Grid - Responsive */}
      <div className="mt-6 sm:mt-8">
        <div className="border-2 border-gray-100 p-4 rounded-xl shadow-lg bg-gradient-to-br from-gray-50 to-white group">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* total features */}
            <section className="w-full h-[85px] sm:h-[100px] shadow-md rounded-xl p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-teal-50 to-cyan-100 border border-teal-100">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-2xl sm:text-3xl lg:text-4xl text-teal-600 bg-teal-100 p-2 rounded-lg">
                  <GiHanger />
                </div>
                <h4 className="font-semibold text-xs sm:text-sm text-teal-800">
                  Total Features
                </h4>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl text-teal-700 font-bold">
                <CountUp start={0} end={subCounts.features} duration={2} />
              </p>
            </section>

            {/* total operations */}
            <section className="w-full h-[85px] sm:h-[100px] shadow-md rounded-xl p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-100 border border-violet-100">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-2xl sm:text-3xl lg:text-4xl text-violet-600 bg-violet-100 p-2 rounded-lg">
                  <GiSewingNeedle />
                </div>
                <h4 className="font-semibold text-xs sm:text-sm text-violet-800">
                  Total Operations
                </h4>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl text-violet-700 font-bold">
                <CountUp start={0} end={subCounts.operations} duration={2} />
              </p>
            </section>

            {/* total videos */}
            <section className="w-full h-[85px] sm:h-[100px] shadow-md rounded-xl p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-red-50 to-rose-100 border border-red-100">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-2xl sm:text-3xl lg:text-4xl text-red-600 bg-red-100 p-2 rounded-lg">
                  <CiVideoOn />
                </div>
                <h4 className="font-semibold text-xs sm:text-sm text-red-800">
                  Total Videos
                </h4>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl text-red-700 font-bold">
                <CountUp start={0} end={subCounts.videos} duration={2} />
              </p>
            </section>

            {/* total images */}
            <section className="w-full h-[85px] sm:h-[100px] shadow-md rounded-xl p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-yellow-50 to-amber-100 border border-yellow-100">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-2xl sm:text-3xl lg:text-4xl text-yellow-600 bg-yellow-100 p-2 rounded-lg">
                  <IoMdImages />
                </div>
                <h4 className="font-semibold text-xs sm:text-sm text-yellow-800">
                  Total Images
                </h4>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl text-yellow-700 font-bold">
                <CountUp start={0} end={subCounts.images} duration={2} />
              </p>
            </section>

            {/* total tech packs */}
            <section className="w-full h-[85px] sm:h-[100px] shadow-md rounded-xl p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-100 border border-emerald-100">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-2xl sm:text-3xl lg:text-4xl text-emerald-600 bg-emerald-100 p-2 rounded-lg">
                  <PiMicrosoftExcelLogoDuotone />
                </div>
                <h4 className="font-semibold text-xs sm:text-sm text-emerald-800">
                  Total Tech-packs
                </h4>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl text-emerald-700 font-bold">
                <CountUp start={0} end={subCounts.techPacks} duration={2} />
              </p>
            </section>

            {/* total folders */}
            <section className="w-full h-[85px] sm:h-[100px] shadow-md rounded-xl p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-100 border border-indigo-100">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-2xl sm:text-3xl lg:text-4xl text-indigo-600 bg-indigo-100 p-2 rounded-lg">
                  <FaRegFolderOpen />
                </div>
                <h4 className="font-semibold text-xs sm:text-sm text-indigo-800">
                  Total Folders
                </h4>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl text-indigo-700 font-bold">
                <CountUp start={0} end={subCounts.folders} duration={2} />
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
