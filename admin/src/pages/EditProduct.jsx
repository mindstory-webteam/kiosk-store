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

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="h-8 w-56 animate-pulse rounded bg-porcelain" />
        <div className="h-64 w-full animate-pulse rounded-panel bg-porcelain" />
        <div className="h-40 w-full animate-pulse rounded-panel bg-porcelain" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-9">
        <h2 className="font-display text-[28px] leading-tight text-ink">{product.name}</h2>
        <p className="mt-1 text-[14px] text-ink/50">{product.handle}</p>
      </div>
      <ProductForm initial={product} onSubmit={handleUpdate} submitLabel="Save changes" />
    </div>
  );
};

export default EditProduct;