import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const linkClass = ({ isActive }) =>
  `block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive ? "bg-amber-500 text-teal-950" : "text-cloud/80 hover:bg-teal-800 hover:text-cloud"
  }`;

const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col justify-between bg-teal-950 px-4 py-6">
      <div>
        <div className="mb-8 px-2">
          <p className="text-xs uppercase tracking-widest text-amber-500">Kiosk Stores</p>
          <h1 className="text-lg font-bold text-cloud">Admin Panel</h1>
        </div>
        <nav className="space-y-1">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/products" className={linkClass}>
            Products
          </NavLink>
          <NavLink to="/products/new" className={linkClass}>
            Add Product
          </NavLink>
        </nav>
      </div>
      <div className="rounded-lg bg-teal-900 p-3">
        <p className="truncate text-sm font-medium text-cloud">{user?.name}</p>
        <p className="truncate text-xs text-cloud/60">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-3 w-full rounded-md bg-teal-800 px-3 py-1.5 text-xs font-semibold text-cloud hover:bg-teal-700"
        >
          Log out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
