import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const linkClass = ({ isActive }) =>
  `relative block py-2.5 pl-5 pr-4 text-[14px] transition-colors ${
    isActive
      ? "bg-porcelain/10 text-porcelain"
      : "text-porcelain/55 hover:bg-porcelain/5 hover:text-porcelain"
  }`;

// A rule in the margin marks the current page — quieter than a filled pill,
// and it leaves the label itself undecorated.
const Marker = ({ isActive }) =>
  isActive ? (
    <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-celadon" />
  ) : null;

const Sidebar = () => {
  const { user, logout } = useAuth();

  const items = [
    { to: "/", end: true, label: "Dashboard" },
    { to: "/products", end: false, label: "Products" },
    { to: "/products/new", end: false, label: "Add product" },
  ];

  return (
    // h-full, not h-screen: the parent frame owns the viewport height, so the
    // sidebar fills it exactly and never scrolls with the content.
    <aside className="flex h-full w-60 shrink-0 flex-col bg-ink">
      <div className="shrink-0 border-b border-porcelain/10 px-5 py-6">
        <p className="font-display text-[19px] leading-none text-porcelain">Kiosk Stores</p>
        <p className="mt-1.5 text-[12px] text-porcelain/40">Stock and catalogue</p>
      </div>

      {/* takes the slack, so the account block stays pinned to the bottom */}
      <nav className="flex-1 overflow-y-auto py-3">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            {({ isActive }) => (
              <>
                <Marker isActive={isActive} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-porcelain/10 px-5 py-5">
        <p className="truncate text-[14px] text-porcelain">{user?.name}</p>
        <p className="truncate text-[12px] text-porcelain/40">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-4 text-[13px] text-porcelain/55 underline-offset-[5px] transition-colors hover:text-porcelain hover:underline"
        >
          Log out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;