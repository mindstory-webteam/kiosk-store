import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { ProductForm } from "./AddProduct.jsx";

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    api.get(`/products/${id}`).then(({ data }) => setProduct(data));
  }, [id]);

  const handleUpdate = async (payload) => {
    await api.put(`/products/${id}`, payload);
    navigate("/products");
  };

  if (!product) return <p className="text-sm text-teal-900/60">Loading product...</p>;

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-teal-950">Edit product</h2>
      <ProductForm initial={product} onSubmit={handleUpdate} submitLabel="Save changes" />
    </div>
  );
};

export default EditProduct;
