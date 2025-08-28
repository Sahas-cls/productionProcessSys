import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
// import AdminPanel from "./pages/admin/AdminPanel";
import { UserProvider } from "./contexts/userContext";
import FactoryPage from "./pages/FactoryPage";
import CustomerPage from "./pages/CustomerPage";
import SeasonPage from "./pages/SeasonPage";
import StylePage from "./pages/StylePage";
import MachinePage from "./pages/MachinePage";
import AddOperationBulletingPage from "./pages/AddOperationBulletingPage";
import ViewOperationBulletingPage from "./pages/ViewOperationBulletingPage";
import ViewOperation from "./components/ViewOperation";
import ViewMachinePage from "./pages/ViewMachinePage";
import ViewHelperOperation from "./pages/ViewHelperOperation";
import EditMainOperation from "./components/admin/EditMainOperation";
import EditSubOperationPage from "./pages/admin/EditSubOperationPage";
import AddLayoutPage from "./pages/AddLayoutPage";
import ViewLayoutPage from "./pages/ViewLayoutPage";
import ViewWorkstationPage from "./pages/ViewWorkstationPage";
import EditWorkstation from "./components/EditWorkstation";
import AddMediaPage from "./pages/AddMediaPage";
import CameraOrBrowse from "./components/CameraOrBrowse";
import { useAuth } from "./hooks/useAuth";
import Reports from "./components/ReportsPage";
import WatchVideos from "./components/WatchVideos";

const App = () => {
  const { user, loading } = useAuth(); // ✅ use inside component

  // alert(user?.userRole);

  if (loading) {
    return <div>Loading...</div>; // simple loading UI
  }

  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          {/* <Route path="/admin-panel" element={<AdminPanel />} /> */}
          <Route path="/factory" element={<FactoryPage />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/season" element={<SeasonPage />} />
          <Route path="/style" element={<StylePage />} />
          <Route path="/machine" element={<MachinePage />} />
          <Route path="/open-camera" element={<CameraOrBrowse />} />
          <Route path="/user/registration" element={<Register />} />

          <Route
            path="/operation-bulletin/add"
            element={<AddOperationBulletingPage />}
          />
          <Route
            path="/operation-bulletin/list"
            element={<ViewOperationBulletingPage />}
          />
          <Route
            path="/operation-bulletin/operation-details"
            element={<ViewOperation />}
          />
          <Route
            path="/operation-bulletin/helper-operation-details"
            element={<ViewHelperOperation />}
          />
          <Route path="/view-machine" element={<ViewMachinePage />} />

          {/* edit main operation */}
          <Route path="/operations/edit/:id" element={<EditMainOperation />} />

          {/* edit sub operation */}
          <Route
            path="/operations/edit-sub-operation"
            element={<EditSubOperationPage />}
          />

          {/* to create new layout */}
          <Route
            path="/layout/create-new-layout"
            element={<AddLayoutPage userRole={user?.userRole} />}
          />

          {/* to display all layouts */}
          <Route path="/layout/list-view" element={<ViewLayoutPage />} />

          {/* to display workstations */}
          <Route
            path="/workstation/list-view"
            element={<ViewWorkstationPage userRole={user?.userRole} />}
          />

          {/* to edit workstation */}
          <Route path="/workstation/edit" element={<EditWorkstation />} />

          {/* to upload medias */}
          <Route path="/sub-Operation/add-media" element={<AddMediaPage />} />

          {/* for display reports */}
          <Route path="/reports" element={<Reports />} />

          {/* to watch videos on component */}
          <Route path="/sub-operation/videos" element={<WatchVideos />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
};

export default App;
