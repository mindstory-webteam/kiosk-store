"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { user, login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // Already logged in? Go straight to the products.
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) router.push("/"); // show the products right after logging in
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-teal-700/15 bg-white p-8 shadow-sm">
        <p className="mb-1 text-xs uppercase tracking-widest text-amber-600">Kiosk Stores</p>
        <h1 className="mb-6 text-2xl font-bold text-teal-950">Log in</h1>

        {error && <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>}

        <label className="mb-1 block text-xs font-medium text-teal-900/70">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 w-full rounded-md border border-teal-700/30 px-3 py-2 outline-none focus:border-amber-500"
        />

        <label className="mb-1 block text-xs font-medium text-teal-900/70">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-6 w-full rounded-md border border-teal-700/30 px-3 py-2 outline-none focus:border-amber-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-amber-500 px-4 py-2.5 font-semibold text-teal-950 hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
