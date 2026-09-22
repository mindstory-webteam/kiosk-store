import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("admin@kiosk.com");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-teal-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-teal-800 bg-teal-900 p-8 shadow-xl"
      >
        <p className="text-xs uppercase tracking-widest text-amber-500">Kiosk Stores</p>
        <h1 className="mb-6 text-2xl font-bold text-cloud">Admin login</h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
        )}

        <label className="mb-1 block text-xs font-medium text-cloud/70">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 w-full rounded-md border border-teal-700 bg-teal-950 px-3 py-2 text-cloud outline-none focus:border-amber-500"
        />

        <label className="mb-1 block text-xs font-medium text-cloud/70">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-6 w-full rounded-md border border-teal-700 bg-teal-950 px-3 py-2 text-cloud outline-none focus:border-amber-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-amber-500 px-4 py-2.5 font-semibold text-teal-950 transition hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="mt-4 text-center text-xs text-cloud/50">
          Default seed account: admin@kiosk.com / Admin@123
        </p>
      </form>
    </div>
  );
};

export default Login;
