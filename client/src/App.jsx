import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import AdminPanel from "./pages/admin/AdminPanel";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<AdminPanel />} />
      <Route path="/login" element={<Login />} />
      <Route path="/user/registration" element={<Register />} />
    </Routes>
  </BrowserRouter>
);

export default App;
