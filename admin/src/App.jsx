import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProductList from "./pages/ProductList.jsx";
import AddProduct from "./pages/AddProduct.jsx";
import EditProduct from "./pages/EditProduct.jsx";

const Layout = ({ children }) => (
  <div className="flex min-h-screen">
    <Sidebar />
    <main className="flex-1 overflow-y-auto p-8">{children}</main>
  </div>
);

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/products"
      element={
        <ProtectedRoute>
          <Layout>
            <ProductList />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/products/new"
      element={
        <ProtectedRoute>
          <Layout>
            <AddProduct />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/products/:id/edit"
      element={
        <ProtectedRoute>
          <Layout>
            <EditProduct />
          </Layout>
        </ProtectedRoute>
      }
    />
  </Routes>
);

export default App;
