
import { useCallback, useEffect, useState } from "react";

const API = "/api";

function Orders() {
  const token = localStorage.getItem("token");

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const loadData = useCallback(async function loadData() {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      setLoading(true);
      setError("");

      const [ordersRes, customersRes, productsRes] = await Promise.all([
        fetch(`${API}/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/customers`, { headers }),
        fetch(`${API}/products`, { headers }),
      ]);

      if (
        [ordersRes, customersRes, productsRes].some(
          (res) => res.status === 401
        )
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.reload();
        return;
      }

      if ([ordersRes, customersRes, productsRes].some((res) => !res.ok)) {
        throw new Error("Unable to load orders, customers, or products.");
      }

      const [ordersData, customersData, productsData] = await Promise.all([
        ordersRes.json(),
        customersRes.json(),
        productsRes.json(),
      ]);

      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      setError(err.message || "Unable to load order data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    Promise.resolve().then(() => loadData());
  }, [loadData]);

  function addItem() {
    setError("");
    setNotice("");

    const product = products.find((item) => String(item.id) === productId);
    const amount = Number(quantity);

    if (!product) {
      setError("Please select a product.");
      return;
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    const existing = items.find(
      (item) => String(item.product_id) === String(product.id)
    );

    if (existing) {
      setItems((current) =>
        current.map((item) =>
          String(item.product_id) === String(product.id)
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
      );
    } else {
      setItems((current) => [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          quantity: amount,
          unit_price: Number(product.price),
        },
      ]);
    }

    setProductId("");
    setQuantity("1");
  }

  function removeItem(productIdToRemove) {
    setItems((current) =>
      current.filter(
        (item) => String(item.product_id) !== String(productIdToRemove)
      )
    );
  }

  async function createOrder(event) {
    event.preventDefault();
    const headers = { Authorization: `Bearer ${token}` };
    setError("");
    setNotice("");

    if (items.length === 0) {
      setError("Add at least one product before creating the order.");
      return;
    }

    try {
      setSaving(true);


      const orderResponse = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId || null,
          items: items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.message || "Unable to create order.");
      }

      setItems([]);
      setCustomerId("");
      setNotice(`Order #${orderData.id} created successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to create order.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function updateOrderStatus(orderId, action) {
    if (!["confirm", "complete", "cancel"].includes(action)) return;

    if (
      action === "cancel" &&
      !window.confirm(`Are you sure you want to cancel order #${orderId}?`)
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/orders/${orderId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${action} order`);
      }

      setNotice(data.message || `Order #${orderId} updated successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || `Failed to ${action} order`);
    }
  }

  function formatMoney(amount) {
    return `KSh ${Number(amount || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return (
    <section className="dashboard">
      <div className="panel orders-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">ORDER MANAGEMENT</p>
            <h3>Create an order</h3>
          </div>
          <strong>{orders.length} orders</strong>
        </div>

        {error && <p className="login-error">{error}</p>}
        {notice && <p className="inventory-notice">{notice}</p>}

        <form onSubmit={createOrder} className="orders-form">
          <label>
            Customer
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Walk-in / no customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>
          </label>

          <div className="orders-add-item">
            <label>
              Product
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {formatMoney(product.price)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Quantity
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="secondary-button"
              onClick={addItem}
            >
              Add item
            </button>
          </div>

          {items.length > 0 && (
            <div className="orders-draft">
              <h4>Order items</h4>

              {items.map((item) => (
                <div className="order-draft-row" key={item.product_id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.quantity} × {formatMoney(item.unit_price)}
                    </span>
                  </div>

                  <strong>
                    {formatMoney(item.quantity * item.unit_price)}
                  </strong>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => removeItem(item.product_id)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <div className="orders-total">
                <span>Order total</span>
                <strong>{formatMoney(total)}</strong>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={saving || items.length === 0}
          >
            {saving ? "Creating order..." : "Create pending order"}
          </button>
        </form>
      </div>

      <div className="panel orders-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">ORDER HISTORY</p>
            <h3>Orders</h3>
          </div>

          <button
            type="button"
            className="text-button"
            onClick={loadData}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <h4>Loading orders...</h4>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <h4>No orders yet</h4>
            <p>Your created orders will appear here.</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const customer = customers.find(
                (item) => String(item.id) === String(order.customer_id)
              );

              return (
                <article className="managed-order-row" key={order.id}>
                  <div>
                    <strong>Order #{order.id}</strong>
                    <span>{customer?.full_name || "Walk-in customer"}</span>
                    <span>
                      {new Date(order.created_at).toLocaleDateString("en-KE")}
                    </span>
                  </div>

                  <div className="managed-order-summary">
                    <strong>{formatMoney(order.total_amount)}</strong>

                    <span className={`order-status ${order.status}`}>
                      {order.status}
                    </span>

                    <div className="order-actions">
                      {order.status === "pending" && (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            updateOrderStatus(order.id, "confirm")
                          }
                        >
                          Confirm
                        </button>
                      )}

                      {order.status === "confirmed" && (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            updateOrderStatus(order.id, "complete")
                          }
                        >
                          Complete
                        </button>
                      )}

                      {["pending", "confirmed"].includes(order.status) && (
                        <button
                          type="button"
                          className="cancel-order-button"
                          onClick={() =>
                            updateOrderStatus(order.id, "cancel")
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default Orders;
