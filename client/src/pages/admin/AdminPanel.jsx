import React from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import AddFactory from "../../components/admin/AddFactory";

const AdminPanel = () => {
  return (
    <div>
      <Header />
      <div className="flex">
        <Sidebar />
        <AddFactory />
      </div>
    </div>
  );
};

export default AdminPanel;
