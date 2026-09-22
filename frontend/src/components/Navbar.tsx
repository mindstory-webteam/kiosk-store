"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-teal-700/10 bg-cloud/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-1">
          <span className="text-lg font-extrabold tracking-tight text-teal-950">Kiosk</span>
          <span className="text-lg font-extrabold tracking-tight text-amber-600">Stores</span>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span className="text-teal-900/70">Hi, {user.name.split(" ")[0]}</span>
              <button
                onClick={logout}
                className="rounded-md border border-teal-700/30 px-3 py-1.5 font-medium text-teal-900 hover:bg-teal-900 hover:text-cloud"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-teal-950 px-4 py-1.5 font-medium text-cloud hover:bg-teal-800"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
