import express from "express";
import cors from "cors";
import { products } from "./products.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/products", (req, res) => {
  const { category } = req.query;
  const list =
    category && category !== "All"
      ? products.filter((p) => p.category === category)
      : products;
  res.json(list);
});

app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
});

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});
