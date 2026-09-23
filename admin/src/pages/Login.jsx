import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { btnPrimary, field, label } from "../Ui.js";

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
    <div className="flex min-h-screen items-center justify-center bg-kaolin px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <p className="font-display text-[26px] leading-tight text-ink">Kiosk Stores</p>
        <p className="mt-1 text-[14px] text-ink/50">Sign in to manage stock and the catalogue.</p>

        <div className="mt-8 rounded-panel border border-rule bg-porcelain p-7">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-panel border border-clay/30 bg-clay/5 px-3 py-2 text-[13px] text-clay"
            >
              {error}
            </div>
          )}

          <label htmlFor="email" className={label}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className={`${field} mb-5`}
          />

          <label htmlFor="password" className={label}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={`${field} mb-7`}
          />

          <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-3`}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>

        <p className="mt-5 text-center text-[12px] text-ink/40">
          Seed account: admin@kiosk.com / Admin@123
        </p>
      </form>
    </div>
  );
};

export default Login;