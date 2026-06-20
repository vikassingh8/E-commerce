import { useEffect, useMemo, useState } from "react";
import "./App.css";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Each product gets a stable gradient derived from its id, so the catalogue
// has visual rhythm even without product photography.
function swatch(id) {
  const hue = (id * 47 + 210) % 360;
  return `linear-gradient(135deg, hsl(${hue} 85% 60%), hsl(${(hue + 38) % 360} 78% 46%))`;
}

const sku = (id) => String(id).padStart(2, "0");

function stockBadge(stock) {
  if (stock === 0) return { text: "Sold out", tone: "out" };
  if (stock <= 5) return { text: `Only ${stock} left`, tone: "low" };
  return { text: "In stock", tone: "in" };
}

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="stars" aria-hidden="true">
      {"★★★★★".slice(0, full)}
      <span className="stars-empty">{"★★★★★".slice(full)}</span>
    </span>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [active, setActive] = useState("All");
  const [bag, setBag] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/products")
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data) => {
        if (!alive) return;
        setProducts(data);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((p) => p.category))],
    [products]
  );

  const visible = useMemo(
    () =>
      active === "All"
        ? products
        : products.filter((p) => p.category === active),
    [products, active]
  );

  return (
    <div className="shell">
      <header className="topbar">
        <a className="wordmark" href="/">
          volt<span>.</span>
        </a>
        <button className="bag" type="button" aria-label={`Bag, ${bag} items`}>
          Bag<span className="bag-count">{bag}</span>
        </button>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Electronics · sensibly priced</p>
          <h1 className="hero-line">
            The gear you actually use, without the showroom markup.
          </h1>
          <p className="hero-sub">
            A short, honest catalogue. Every price is the price you pay.
          </p>
        </section>

        <section className="catalogue" aria-labelledby="catalogue-heading">
          <div className="catalogue-head">
            <h2 id="catalogue-heading">Catalogue</h2>
            {status === "ready" && (
              <span className="count">
                {visible.length} of {products.length} items
              </span>
            )}
          </div>

          {status === "ready" && products.length > 0 && (
            <div className="filters" role="tablist" aria-label="Filter by category">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active === cat}
                  className={`chip${active === cat ? " chip--on" : ""}`}
                  onClick={() => setActive(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {status === "loading" && (
            <div className="grid" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card card--skeleton" />
              ))}
            </div>
          )}

          {status === "error" && (
            <p className="notice">
              Couldn’t load the catalogue. Refresh the page to try again.
            </p>
          )}

          {status === "ready" && visible.length === 0 && (
            <p className="notice">No products in this category yet.</p>
          )}

          {status === "ready" && visible.length > 0 && (
            <div className="grid">
              {visible.map((p, i) => {
                const stock = stockBadge(p.stock);
                return (
                  <article key={p.id} className="card" style={{ "--i": i }}>
                    <div
                      className="card-swatch"
                      style={{ backgroundImage: swatch(p.id) }}
                    >
                      <span className="card-glyph">{p.name.charAt(0)}</span>
                      <span className={`stock stock--${stock.tone}`}>
                        {stock.text}
                      </span>
                      <span className="card-sku">SKU {sku(p.id)}</span>
                    </div>

                    <div className="card-body">
                      <p className="card-cat">{p.category}</p>
                      <h3 className="card-name">{p.name}</h3>

                      <p className="card-rating">
                        <Stars rating={p.rating} />
                        <span className="card-rating-num">
                          {p.rating.toFixed(1)}
                        </span>
                        <span className="card-reviews">({p.reviews})</span>
                      </p>

                      <p className="card-desc">{p.description}</p>

                      <div className="card-foot">
                        <span className="card-price">{inr.format(p.price)}</span>
                        <button
                          className="add"
                          type="button"
                          disabled={p.stock === 0}
                          onClick={() => setBag((n) => n + 1)}
                        >
                          {p.stock === 0 ? "Sold out" : "Add to bag"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span className="wordmark wordmark--sm">
          volt<span>.</span>
        </span>
        <span>Free delivery across India · 7-day returns</span>
      </footer>
    </div>
  );
}

export default App;
