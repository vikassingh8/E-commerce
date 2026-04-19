import { useEffect, useState } from "react";

function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  return (
    <div>
      <h1>🛒 E-commerce</h1>
      {products.map((p) => (
        <div key={p.id}>
          {p.name} - ₹{p.price}
        </div>
      ))}
    </div>
  );
}

export default App;
