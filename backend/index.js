import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const products = [
  { id: 1, name: "Laptop", price: 80000 },
  { id: 2, name: "Phone", price: 30000 },
];

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});
