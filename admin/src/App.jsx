import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProductList from "./pages/ProductList.jsx";
import AddProduct from "./pages/AddProduct.jsx";
import EditProduct from "./pages/EditProduct.jsx";

/**
 * The frame is pinned to the viewport and only the content column scrolls.
 *
 * Previously the whole page scrolled while the sidebar was `h-screen`, so as
 * soon as a page ran past one screen the sidebar scrolled away and left the
 * page background showing beside the content.
 */
const Layout = ({ children }) => (
  <div className="flex h-screen overflow-hidden bg-kaolin">
    <Sidebar />
    {/* min-w-0 lets the table inside shrink instead of forcing the page wide */}
    <main className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-9 xl:px-10">{children}</div>
    </main>
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