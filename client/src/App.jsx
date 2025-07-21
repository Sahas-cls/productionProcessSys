import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import AdminPanel from "./pages/admin/AdminPanel";
import { UserProvider } from "./contexts/userContext";
// import ViewMachine from "./pages/ViewMachine";

const App = () => (
  <UserProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin-panel" element={<AdminPanel />} />
        <Route path="/user/registration" element={<Register />} />
        {/* <Route path="/view/machine" element={<ViewMachine />} /> */}
        {/* <Route path="/view/machine" element={<ViewMachine />} /> */}
      </Routes>
    </BrowserRouter>
  </UserProvider>
);

export default App;
