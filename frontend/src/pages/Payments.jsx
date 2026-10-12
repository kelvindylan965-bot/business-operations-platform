import { useCallback, useEffect, useState } from "react";

const API = "/api";

export default function Payments() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const headers = { Authorization: `Bearer ${token}` };
      const [paymentsRes, ordersRes] = await Promise.all([
        fetch(`${API}/payments`, { headers }),
        fetch(`${API}/orders`, { headers }),
      ]);

      if ([paymentsRes, ordersRes].some((res) => res.status === 401)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.reload();
        return;
      }
      if (!paymentsRes.ok || !ordersRes.ok) {
        throw new Error("Unable to load payments and orders.");
      }

      const [paymentData, orderData] = await Promise.all([
        paymentsRes.json(),
        ordersRes.json(),
      ]);
      setPayments(paymentData);
      setOrders(orderData);
    } catch (err) {
      setError(err.message || "Unable to load payments.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    Promise.resolve().then(() => loadData());
  }, [loadData]);

  async function createPayment(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!orderId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError("Select an order and enter an amount greater than zero.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: Number(orderId),
          amount: Number(amount),
          payment_method: method,
          reference: reference.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to record payment.");

      setAmount("");
      setReference("");
      setOrderId("");
      setNotice("Payment recorded as pending.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to record payment.");
    } finally {
      setSaving(false);
    }
  }

  async function verifyPayment(paymentId) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API}/payments/${paymentId}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to verify payment.");
      setNotice("Payment verified successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to verify payment.");
    }
  }

  return (
    <section className="finance-page">
      <section className="panel">
        <div className="panel-header"><h3>Record a payment</h3></div>
        <p>New payments are recorded as pending until verified.</p>
        <form className="finance-form" onSubmit={createPayment}>
          <label>Order
            <select value={orderId} onChange={(e) => setOrderId(e.target.value)} required>
              <option value="">Select an order</option>
              {orders.filter((order) => !["cancelled"].includes(String(order.status).toLowerCase())).map((order) => (
                <option key={order.id} value={order.id}>
                  Order #{order.id} — KSh {Number(order.total_amount || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <label>Amount (KSh)
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label>Payment method
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
          </label>
          <label>Reference (optional)
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt or transaction reference" />
          </label>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Record payment"}
          </button>
        </form>
        {error && <p className="login-error">{error}</p>}
        {notice && <p className="finance-notice">{notice}</p>}
      </section>

      <section className="panel">
        <div className="panel-header"><h3>Payment history</h3><button className="text-button" type="button" onClick={loadData}>Refresh</button></div>
        {loading ? <p>Loading payments...</p> : payments.length === 0 ? (
          <div className="empty-state"><h4>No payments yet</h4><p>Recorded payments will appear here.</p></div>
        ) : (
          <div className="finance-table-wrap"><table className="finance-table">
            <thead><tr><th>Payment</th><th>Order</th><th>Amount</th><th>Method</th><th>Status</th><th>Reference</th><th>Action</th></tr></thead>
            <tbody>{payments.map((payment) => (
              <tr key={payment.id}>
                <td>#{payment.id}</td><td>#{payment.order_id}</td>
                <td>KSh {Number(payment.amount).toLocaleString()}</td>
                <td>{String(payment.payment_method).replace("_", " ")}</td>
                <td><span className={`order-status ${String(payment.status).toLowerCase()}`}>{payment.status}</span></td>
                <td>{payment.reference || "—"}</td>
                <td>{user?.role === "admin" && String(payment.status).toLowerCase() === "pending" ? <button className="text-button" type="button" onClick={() => verifyPayment(payment.id)}>Verify payment</button> : "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </section>
  );
}
