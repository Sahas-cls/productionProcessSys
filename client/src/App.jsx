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
import UploadMaterial from "./components/UploadMaterial";
import ImageCaptureOrBrowse from "./components/ImageCaptureorBrows";
import TechPackUploader from "./components/TechPackUploader";
import FolderDocumentsUploader from "./components/FolderDocumentsUploader";
import UploadMachine from "./components/UploadMachine";
import DashboardPage from "./pages/DashboardPage";
import VideoPage from "./pages/VideoPage";
import VideoGallery from "./pages/VideoGallery";
import ImageGallery from "./pages/ImageGallery";
import TechPackGallery from "./pages/TechPackGallery";
import DocumentGallery from "./pages/DocumentGallery";
import NeedleThreatsPage from "./pages/NeedleThreatsPage";
import NotificationPage from "./pages/NotificationPage";
import ManageUsersPage from "./pages/admin/ManageUsersPage";
import AddTechnicalDataPage from "./pages/AddTechnicalDataPage";
import HelperWorkstationPage from "./pages/HelperWorkstationPage";
import HelperVideoGallery from "./pages/HelperVideoGallery";
import HelperImageGallery from "./pages/HelperImageGallery";
import TestUpload from "./pages/TestUpload";

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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/season" element={<SeasonPage />} />
          <Route path="/style" element={<StylePage />} />
          <Route path="/machine" element={<MachinePage />} />
          <Route path="/needleThreats" element={<NeedleThreatsPage />} />
          <Route path="/open-camera" element={<CameraOrBrowse />} />
          <Route path="/user/registration" element={<Register />} />
          <Route path="/test" element={<TestUpload />} />

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

          <Route path="/technical-data" element={<AddTechnicalDataPage />} />

          {/* edit main operation */}
          <Route path="/operations/edit/:id" element={<EditMainOperation />} />

          {/* edit sub operation */}
          <Route
            path="/operations/edit-sub-operation"
            element={<EditSubOperationPage />}
          />

          {/* to create new layout */}
          <Route
            path="/layout/create-new-layout/:styleId?"
            element={<AddLayoutPage userRole={user?.userRole} />}
          />

          {/* to display all layouts */}
          <Route path="/layout/list-view" element={<ViewLayoutPage />} />

          {/* to display workstations */}
          <Route
            path="/workstation/list-view/:layoutId/:styleId/:styleNo"
            element={<ViewWorkstationPage userRole={user?.userRole} />}
          />
          <Route
            path="/workstation/list-view"
            element={<ViewWorkstationPage userRole={user?.userRole} />}
          />

          {/* helper workstation list */}
          <Route
            path="/helper-workstation/:styId/:layoutId"
            element={<HelperWorkstationPage />}
          />

          {/* to edit workstation */}
          <Route path="/workstation/edit" element={<EditWorkstation />} />

          {/* to upload medias */}
          <Route path="/sub-Operation/add-media" element={<AddMediaPage />} />

          {/* for display reports */}
          <Route path="/reports" element={<Reports />} />

          {/* for manage users */}
          <Route path="/manage-users" element={<ManageUsersPage />} />

          {/* to watch videos on component */}
          <Route path="/sub-operation/allMedia" element={<WatchVideos />} />
          <Route path="/sub-operation/videos" element={<VideoGallery />} />
          <Route path="/sub-operation/images" element={<ImageGallery />} />
          <Route path="/style/tech-packs" element={<TechPackGallery />} />
          <Route
            path="/sub-operation/tech_packs"
            element={<TechPackGallery />}
          />
          {/* to watch helper operation videos and images */}
          <Route
            path="/helper/videos/:hOpId"
            element={<HelperVideoGallery />}
          />
          <Route
            path="/helper/images/:hOpId"
            element={<HelperImageGallery />}
          />
          <Route path="/style/documents" element={<DocumentGallery />} />

          <Route path="/user/notifications" element={<NotificationPage />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
};

export default App;
