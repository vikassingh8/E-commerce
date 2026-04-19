import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>🛒 E-Commerce Store</h1>
      </header>
      <main className="main">
        <div className="products-grid">
          {products.map((p) => (
            <div key={p.id} className="product-card">
              <h3>{p.name}</h3>
              <p className="price">₹{p.price}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
