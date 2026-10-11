import { useCallback, useEffect, useState } from "react";

function Inventory() {
  const token = localStorage.getItem("token");

  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [newStock, setNewStock] = useState({
    product_id: "",
    quantity: "0",
    reorder_level: "5",
  });

  const loadInventory = useCallback(async function loadInventory() {
      try {
        setLoading(true);
        setError("");

        const headers = { Authorization: `Bearer ${token}` };

        const [inventoryResponse, productsResponse] = await Promise.all([
          fetch("http://localhost:3000/api/inventory", { headers }),
          fetch("http://localhost:3000/api/products", { headers }),
        ]);

        if (!inventoryResponse.ok || !productsResponse.ok) {
          throw new Error("Unable to load inventory or products.");
        }

        const [inventoryData, productsData] = await Promise.all([
          inventoryResponse.json(),
          productsResponse.json(),
        ]);

        setItems(inventoryData);
        setProducts(productsData);

        const initialQuantities = {};
        inventoryData.forEach((item) => {
          initialQuantities[item.product_id] = {
            quantity: String(item.quantity),
            reorder_level: String(item.reorder_level),
          };
        });

        setQuantities(initialQuantities);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
  }, [token]);

  useEffect(() => {
    const task = Promise.resolve().then(() => loadInventory());
    return () => { void task; };
  }, [loadInventory]);

  const availableProducts = products.filter(
    (product) =>
      !items.some((item) => Number(item.product_id) === Number(product.id))
  );

  function validWholeNumber(value) {
    return (
      String(value).trim() !== "" &&
      Number.isInteger(Number(value)) &&
      Number(value) >= 0
    );
  }

  async function addStock(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!newStock.product_id) {
      setError("Please select a product.");
      return;
    }

    if (
      !validWholeNumber(newStock.quantity) ||
      !validWholeNumber(newStock.reorder_level)
    ) {
      setError("Quantity and reorder level must be non-negative whole numbers.");
      return;
    }

    try {
      setAdding(true);

      const response = await fetch("http://localhost:3000/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: Number(newStock.product_id),
          quantity: Number(newStock.quantity),
          reorder_level: Number(newStock.reorder_level),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to add stock record.");
      }

      setNewStock({
        product_id: "",
        quantity: "0",
        reorder_level: "5",
      });

      setNotice("Stock record created successfully.");
      await loadInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function updateStock(item) {
    const values = quantities[item.product_id];

    if (
      !values ||
      !validWholeNumber(values.quantity) ||
      !validWholeNumber(values.reorder_level)
    ) {
      setError("Enter valid, non-negative whole numbers for stock and reorder level.");
      return;
    }

    try {
      setSavingId(item.product_id);
      setError("");
      setNotice("");

      const response = await fetch(
        `http://localhost:3000/api/inventory/product/${item.product_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantity: Number(values.quantity),
            reorder_level: Number(values.reorder_level),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update stock.");
      }

      setNotice("Stock updated successfully.");
      await loadInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  const lowStockCount = items.filter(
    (item) => Number(item.quantity) <= Number(item.reorder_level)
  ).length;

  if (loading) {
    return (
      <section className="dashboard">
        <div className="panel">
          <h3>Loading inventory...</h3>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard">
      <div className="welcome-card">
        <div>
          <p className="eyebrow">STOCK MANAGEMENT</p>
          <h3>Inventory</h3>
          <p>Monitor stock levels and update quantities before products run out.</p>
        </div>
        <div className="welcome-icon">▤</div>
      </div>

      {error && <p className="login-error">{error}</p>}
      {notice && <p className="inventory-notice">{notice}</p>}

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">□</span>
          <p>Products tracked</p>
          <strong>{items.length}</strong>
          <span className="stat-note">Products with inventory records</span>
        </article>

        <article className="stat-card">
          <span className="stat-icon">!</span>
          <p>Low-stock products</p>
          <strong>{lowStockCount}</strong>
          <span className="stat-note">At or below reorder level</span>
        </article>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">NEW STOCK</p>
            <h3>Add Stock Record</h3>
          </div>
        </div>

        {availableProducts.length === 0 ? (
          <p className="empty-state">
            Every existing product already has an inventory record, or no products have been added yet.
          </p>
        ) : (
          <form className="customer-form" onSubmit={addStock}>
            <label>
              Product
              <select
                value={newStock.product_id}
                onChange={(event) =>
                  setNewStock((current) => ({
                    ...current,
                    product_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select a product</option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Starting quantity
              <input
                type="number"
                min="0"
                step="1"
                value={newStock.quantity}
                onChange={(event) =>
                  setNewStock((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Reorder level
              <input
                type="number"
                min="0"
                step="1"
                value={newStock.reorder_level}
                onChange={(event) =>
                  setNewStock((current) => ({
                    ...current,
                    reorder_level: event.target.value,
                  }))
                }
                required
              />
            </label>

            <button className="primary-button" type="submit" disabled={adding}>
              {adding ? "Adding..." : "Add Stock"}
            </button>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">STOCK RECORDS</p>
            <h3>Inventory levels</h3>
          </div>
          <button className="text-button" onClick={loadInventory}>
            Refresh
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▤</div>
            <h4>No inventory records yet</h4>
            <p>Add a stock record using the form above.</p>
          </div>
        ) : (
          <div className="stock-list">
            {items.map((item) => {
              const lowStock =
                Number(item.quantity) <= Number(item.reorder_level);

              return (
                <div className="stock-row" key={item.product_id}>
                  <div>
                    <strong>
                      {item.product_name || `Product #${item.product_id}`}
                    </strong>
                    <span>Current stock: {item.quantity} units</span>
                    <span className={`stock-status ${lowStock ? "stock-status-low" : "stock-status-healthy"}`}>
                      {lowStock ? "Low stock — reorder needed" : "Stock level healthy"}
                    </span>
                  </div>

                  <div className="inventory-edit">
                    <label>
                      Quantity
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={quantities[item.product_id]?.quantity ?? ""}
                        onChange={(event) =>
                          setQuantities((current) => ({
                            ...current,
                            [item.product_id]: {
                              ...current[item.product_id],
                              quantity: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>

                    <label>
                      Reorder at
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={quantities[item.product_id]?.reorder_level ?? ""}
                        onChange={(event) =>
                          setQuantities((current) => ({
                            ...current,
                            [item.product_id]: {
                              ...current[item.product_id],
                              reorder_level: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>

                    <button
                      className="primary-button"
                      onClick={() => updateStock(item)}
                      disabled={savingId === item.product_id}
                    >
                      {savingId === item.product_id ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="sidebar-footer">
        <p>Created by</p>
        <strong>Kelvin Kiptoo Ngetich</strong>
      </div>
    </section>
  );
}

export default Inventory;
