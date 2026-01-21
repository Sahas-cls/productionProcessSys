import React, { useState, useEffect, useMemo } from "react";
import {
  MdGroups2,
  MdOutlineDashboard,
  MdOutlineRefresh,
  MdInfoOutline,
  MdCalendarToday,
  MdPeople,
  MdTrendingUp,
} from "react-icons/md";

import { FaTshirt, FaRegChartBar } from "react-icons/fa";
import { GiHanger } from "react-icons/gi";
import { GiSewingNeedle, GiSewingMachine } from "react-icons/gi";
import { CiVideoOn } from "react-icons/ci";
import { IoMdImages } from "react-icons/io";
import { PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import {
  FaRegFolderOpen,
  FaSearch,
  FaChartBar,
  FaFilter,
  FaChartPie,
  FaChartLine,
} from "react-icons/fa";
import CountUp from "react-countup";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  // State for all data
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New state for season data
  const [seasonData, setSeasonData] = useState({
    seasonWiseData: [],
    barChartData: [],
    pieChartData: [],
    stackedBarData: [],
    summary: {},
    loading: false,
  });

  const [customerDistribution, setCustomerDistribution] = useState({
    data: [],
    loading: false,
  });

  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [recentActivity, setRecentActivity] = useState({
    recentStyles: [],
    recentOperations: [],
    loading: false,
  });

  const [machineBreakdown, setMachineBreakdown] = useState({
    byType: [],
    byStatus: [],
    topBrands: [],
    charts: {
      pieChartData: [],
      donutChartData: [],
    },
    summary: {
      totalMachines: 0,
      totalTypes: 0,
      averageMachinesPerType: 0,
      mostCommonType: "None",
      topBrand: "Unknown",
    },
    loading: false,
  });

  const [productionInsights, setProductionInsights] = useState({
    data: null,
    loading: false,
  });

  // Enhanced color scheme
  const COLORS = {
    primary: "#3e42f2",
    secondary: "#8B5CF6",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6",
    dark: "#1F2937",
    light: "#F3F4F6",
  };

  // Gradient colors for charts
  const GRADIENTS = [
    ["#6366F1", "#8B5CF6"],
    ["#3B82F6", "#60A5FA"],
    ["#10B981", "#34D399"],
    ["#F59E0B", "#FBBF24"],
    ["#EF4444", "#F87171"],
    ["#8B5CF6", "#D946EF"],
    ["#06B6D4", "#0891B2"],
    ["#84CC16", "#65A30D"],
  ];

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
        style.style_no.toLowerCase().includes(searchInput.toLowerCase()),
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
        features: count.mainOp,
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

  // Fetch season-wise styles data
  const fetchSeasonWiseStyles = async () => {
    setSeasonData((prev) => ({ ...prev, loading: true }));
    try {
      const response = await axios.get(
        `${apiUrl}/api/dashboard/season-wise-styles`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setSeasonData({
          ...response.data.data.chartData,
          seasonWiseData: response.data.data.seasonWiseData,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching season-wise styles:", error);
      setSeasonData((prev) => ({ ...prev, loading: false }));
    }
  };

  // Fetch customer distribution
  const fetchCustomerDistribution = async () => {
    setCustomerDistribution((prev) => ({ ...prev, loading: true }));
    try {
      const response = await axios.get(
        `${apiUrl}/api/dashboard/customer-season-distribution`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setCustomerDistribution({
          data: response.data.data,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching customer distribution:", error);
      setCustomerDistribution((prev) => ({ ...prev, loading: false }));
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    setRecentActivity((prev) => ({ ...prev, loading: true }));
    try {
      const response = await axios.get(
        `${apiUrl}/api/dashboard/recent-activity?limit=5`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setRecentActivity({
          recentStyles: response.data.data.recentStyles,
          recentOperations: response.data.data.recentOperations,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      setRecentActivity((prev) => ({ ...prev, loading: false }));
    }
  };

  // Fetch production insights
  const fetchProductionInsights = async () => {
    setProductionInsights((prev) => ({ ...prev, loading: true }));
    try {
      const response = await axios.get(
        `${apiUrl}/api/dashboard/production-insights`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setProductionInsights({
          data: response.data.data,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching production insights:", error);
      setProductionInsights((prev) => ({ ...prev, loading: false }));
    }
  };

  // Fetch styles by season
  const fetchStylesBySeason = async (seasonId) => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/dashboard/season/${seasonId}`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setSelectedSeason(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching styles by season:", error);
    }
  };

  // machine fetch functions
  const fetchMachineBreakdown = async () => {
    setMachineBreakdown((prev) => ({ ...prev, loading: true }));
    try {
      const response = await axios.get(
        `${apiUrl}/api/dashboard/machine-breakdown`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setMachineBreakdown({
          ...response.data.data,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching machine breakdown:", error);
      setMachineBreakdown((prev) => ({ ...prev, loading: false }));
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
        `${apiUrl}/api/dashboard/countSub/${selectedStyle}`,
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

  const refreshAllData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        getStyles(),
        countBaseItems(),
        countSubItems(),
        fetchSeasonWiseStyles(),
        fetchCustomerDistribution(),
        fetchRecentActivity(),
        fetchProductionInsights(),
        fetchMachineBreakdown(), // Add this
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
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
    countSubItems();
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        getStyles(),
        countBaseItems(),
        countSubItems(),
        fetchSeasonWiseStyles(),
        fetchCustomerDistribution(),
        fetchRecentActivity(),
        fetchProductionInsights(),
        fetchMachineBreakdown(), // Add this
      ]);
    };
    loadData();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Chart data configurations
  const featuresVsOperationsData = [
    { name: "Features", value: subCounts.features, fill: GRADIENTS[0][0] },
    { name: "Operations", value: subCounts.operations, fill: GRADIENTS[1][0] },
  ];

  const assetsData = [
    { name: "Videos", value: subCounts.videos, fill: GRADIENTS[2][0] },
    { name: "Images", value: subCounts.images, fill: GRADIENTS[3][0] },
    { name: "Tech-packs", value: subCounts.techPacks, fill: GRADIENTS[4][0] },
    { name: "Folders", value: subCounts.folders, fill: GRADIENTS[5][0] },
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Season Tooltip Component
  const SeasonTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 min-w-[200px]">
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between mb-1">
              <span className="text-sm" style={{ color: entry.color }}>
                {entry.name}
              </span>
              <span className="font-semibold">{entry.value}</span>
            </div>
          ))}
          {payload[0]?.payload?.customer && (
            <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
              Customer: {payload[0].payload.customer}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // StatCard Component
  const StatCard = ({ title, value, icon: Icon, color, gradient, onClick }) => (
    <div
      onClick={onClick}
      className={`relative group overflow-hidden rounded-2xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${gradient} border border-gray-100 duration-300`}
    >
      <div
        className="absolute -top-6 -left-6 w-12 h-12 rounded-full group-hover:scale-150 duration-300 opacity-10"
        style={{ backgroundColor: color }}
      ></div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">
            <CountUp start={0} end={value} duration={2.5} separator="," />
          </p>
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon
            className="text-2xl group-hover:scale-150 duration-300"
            style={{ color: color }}
          />
        </div>
      </div>
      <div
        className="absolute -bottom-8 -right-8 w-16 h-16 rounded-full opacity-10 group-hover:scale-150 duration-700"
        style={{ backgroundColor: color }}
      ></div>
    </div>
  );

  // Season Card Component
  const SeasonCard = ({ season }) => (
    <div
      className="bg-white rounded-xl p-4 shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer hover:border-indigo-300"
      onClick={() => fetchStylesBySeason(season.season_id)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MdCalendarToday className="text-indigo-600" />
          <h4 className="font-bold text-gray-800">{season.season_name}</h4>
        </div>
        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-full">
          {season.total_styles} styles
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <MdPeople className="text-gray-400" />
        <span>{season.customer_name}</span>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Recent styles:</span>
          <span>{season.styles?.length || 0}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl text-indigo-600 font-bold flex items-center gap-2">
            <MdOutlineDashboard className="text-indigo-600" />
            Dashboard
          </h1>
          {/* <p className="text-gray-600 mt-1">
            Production analytics and insights
          </p> */}
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={refreshAllData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <MdOutlineRefresh
              className={`${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          {/* <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search seasons..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            />
          </div> */}
        </div>
      </div>
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Customers"
          value={baseCounts.customers}
          icon={MdGroups2}
          color={COLORS.primary}
          gradient="bg-gradient-to-br from-indigo-50 to-purple-50"
          onClick={() => {
            (setSelectedCustomer(null), navigate("/customer"));
          }}
        />
        <StatCard
          title="Total Machines"
          value={baseCounts.machines}
          icon={GiSewingMachine}
          color={COLORS.success}
          onClick={() => {
            navigate("/machine");
          }}
          gradient="bg-gradient-to-br from-emerald-50 to-teal-50"
        />
        <StatCard
          title="Total Styles"
          value={baseCounts.styles}
          icon={FaTshirt}
          color={COLORS.warning}
          gradient="bg-gradient-to-br from-amber-50 to-orange-50"
          onClick={() => {
            navigate("/style");
          }}
        />
      </div>
      {/* Search Filter Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaFilter className="text-purple-600" />
              Filter by Style
            </h2>
            <p className="text-gray-600 text-sm">
              Select a style to view specific metrics
            </p>
          </div>

          {selectedStyle && (
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Active Filter: {selectedStyle}
              </span>
              <button
                onClick={clearSearch}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Type style number..."
            className="w-full pl-12 pr-10 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          />

          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}

          {showSuggestions && filteredStyles.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
              {filteredStyles.map((style, index) => (
                <div
                  key={style.style_no}
                  onClick={() => handleStyleSelect(style)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors flex items-center justify-between"
                >
                  <span className="font-medium">{style.style_no}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Select
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="mt-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Loading data...</span>
          </div>
        )}
      </div>
      {/* Season Summary Section */}
      {/* Season Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Season Distribution Pie Chart */}

        {/* Season Styles Bar Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FaChartBar className="text-indigo-600" />
              Styles by Season
            </h3>
            <MdInfoOutline
              className="text-gray-400 cursor-help"
              title="Number of styles per season"
            />
          </div>
          <div className="h-64">
            {seasonData.loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonData.barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<SeasonTooltip />} />
                  <Bar
                    dataKey="styles"
                    name="Styles Count"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                  >
                    {seasonData.barChartData?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#barGradient-${index})`}
                      />
                    ))}
                  </Bar>
                  <defs>
                    {seasonData.barChartData?.map((entry, index) => (
                      <linearGradient
                        key={index}
                        id={`barGradient-${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                    ))}
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Customer Distribution */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <MdPeople className="text-blue-600" />
              Top Customers
            </h3>
            <MdInfoOutline
              className="text-gray-400 cursor-help"
              title="Styles distribution by customer"
            />
          </div>
          <div className="h-64">
            {customerDistribution.loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : customerDistribution.data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={customerDistribution.data.slice(0, 8)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="customer_name"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="total_styles"
                    name="Styles"
                    fill="#3B82F6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full text-gray-500">
                No customer data available
              </div>
            )}
          </div>
        </div>

        {/* Assets Distribution Pie Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaChartBar className="text-purple-600" />
            Assets Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {assetsData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={GRADIENTS[index][0]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Recent Activity and Production Insights */}
      {/* Selected Season Details */}
      {selectedSeason && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <MdCalendarToday className="text-indigo-600" />
                {selectedSeason.season_name}
              </h3>
              <p className="text-gray-600 text-sm">
                Customer: {selectedSeason.customer?.customer_name}
              </p>
            </div>
            <button
              onClick={() => setSelectedSeason(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg">
                <span className="font-bold">{selectedSeason.total_styles}</span>{" "}
                Styles
              </div>
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                <span className="font-bold">
                  {selectedSeason.styles?.length || 0}
                </span>{" "}
                Active
              </div>
            </div>
          </div>
          {selectedSeason.styles && selectedSeason.styles.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-700 mb-3">Style List</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {selectedSeason.styles.slice(0, 6).map((style) => (
                  <div
                    key={style.style_id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">
                        {style.style_no}
                      </span>
                      <span className="text-xs text-gray-500">
                        {style.factory?.factory_name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {style.style_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Operations & Assets Summary */}{" "}
      {/*!!!! please remove this section instead add machine breakdown instead */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operations Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <GiSewingNeedle className="text-indigo-600" />
            Operations Summary
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Main Operations</p>
              <p className="text-2xl font-bold text-indigo-700">
                {subCounts.features}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Sub Operations</p>
              <p className="text-2xl font-bold text-purple-700">
                {subCounts.operations}
              </p>
            </div>
          </div>
          {selectedStyle && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">
                Filtered by:{" "}
                <span className="font-semibold">{selectedStyle}</span>
              </p>
            </div>
          )}
        </div>

        {/* Assets Summary */}
        {/* Machine Breakdown Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <GiSewingMachine className="text-indigo-600" />
                Machine Breakdown
              </h2>
              {/* <p className="text-gray-600 text-sm">
                Distribution by type and status
              </p> */}
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                Total: {machineBreakdown.summary.totalMachines || 0}
              </div>
              <div className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                Types: {machineBreakdown.summary.totalTypes || 0}
              </div>
            </div>
          </div>

          {machineBreakdown.loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-1">
              {/* Donut Chart - Machines by Type */}
              <div>
                <div className="h-72">
                  {machineBreakdown.charts.pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={machineBreakdown.charts.pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={110}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(1)}%`
                          }
                        >
                          {machineBreakdown.charts.pieChartData.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [value, name]}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                        />
                        {/* <Legend /> */}
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full text-gray-500">
                      No machine data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
