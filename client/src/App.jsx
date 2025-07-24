import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import AdminPanel from "./pages/admin/AdminPanel";
import { UserProvider } from "./contexts/userContext";
import FactoryPage from "./pages/FactoryPage";
import CustomerPage from "./pages/CustomerPage";
import SeasonPage from "./pages/SeasonPage";
import StylePage from "./pages/StylePage";
import MachinePage from "./pages/MachinePage";
import OperationBulleting from "./components/OperationBulleting";
import AddOperationBulleting from "./pages/AddOperationBulletingPage";
import AddOperationBulletingPage from "./pages/AddOperationBulletingPage";
import ViewOperationBulletin from "./components/ViewOperationBulleting";
import ViewOperationBulletingPage from "./pages/ViewOperationBulletingPage";
import ViewOperation from "./components/ViewOperation";
import ViewMachinePage from "./pages/ViewMachinePage";
import ViewHelperOperation from "./pages/ViewHelperOperation";
import EditMainOperation from "./components/admin/EditMainOperation";
import EditSubOperationPage from "./pages/admin/EditSubOperationPage";
import AddLayoutPage from "./pages/AddLayoutPage";
// import StylePage from "./pages/StylePage";
// import ViewMachine from "./pages/ViewMachine";

const App = () => (
  <UserProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin-panel" element={<AdminPanel />} />
        <Route path="/user/registration" element={<Register />} />
        <Route path="/factory" element={<FactoryPage />} />
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/season" element={<SeasonPage />} />
        <Route path="/style" element={<StylePage />} />
        <Route path="/machine" element={<MachinePage />} />
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
        {/* <Route path="/view/machine" element={<ViewMachine />} /> */}
        {/* <Route path="/view/machine" element={<ViewMachine />} /> */}

        {/* to create new layout */}
        <Route path="/layout/create-new-layout" element={<AddLayoutPage />} />
      </Routes>
    </BrowserRouter>
  </UserProvider>
);

export default App;
