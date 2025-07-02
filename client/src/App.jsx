import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import AdminPanel from "./pages/admin/AdminPanel";
import { UserProvider } from "./contexts/userContext";

const App = () => (
  <UserProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminPanel />} />
        <Route path="/login" element={<Login />} />
        <Route path="/user/registration" element={<Register />} />
      </Routes>
    </BrowserRouter>
  </UserProvider>
);

export default App;
