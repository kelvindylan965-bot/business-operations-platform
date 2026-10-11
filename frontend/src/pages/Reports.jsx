import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:3000/api";
const money = (value) => `KSh ${Number(value || 0).toLocaleString()}`;

export default function Reports() {
  const token = localStorage.getItem("token");
  const [data, setData] = useState({ orders: [], payments: [], expenses: [], inventory: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const headers = { Authorization: `Bearer ${token}` };
      const responses = await Promise.all([
        fetch(`${API}/orders`, { headers }),
        fetch(`${API}/payments`, { headers }),
        fetch(`${API}/expenses`, { headers }),
        fetch(`${API}/inventory`, { headers }),
      ]);
      if (responses.some((response) => response.status === 401)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.reload();
        return;
      }
      if (responses.some((response) => !response.ok)) throw new Error("Unable to load report data.");
      const [orders, payments, expenses, inventory] = await Promise.all(responses.map((response) => response.json()));
      setData({ orders, payments, expenses, inventory });
    } catch (err) {
      setError(err.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { Promise.resolve().then(() => loadReports()); }, [loadReports]);

  const completedRevenue = data.payments
    .filter((payment) => String(payment.status).toLowerCase() === "completed")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalExpenses = data.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const lowStock = data.inventory.filter((item) => Number(item.quantity) <= Number(item.reorder_level));
  const orderStatuses = data.orders.reduce((counts, order) => {
    const status = String(order.status || "unknown").toLowerCase();
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  return (
    <section className="finance-page">
      <section className="panel">
        <div className="panel-header"><h3>Business summary</h3><button className="text-button" type="button" onClick={loadReports}>Refresh report</button></div>
        <p>Figures are calculated from records currently stored in the platform.</p>
        {error && <p className="login-error">{error}</p>}
        {loading ? <p>Loading reports...</p> : (
          <>
            <div className="finance-report-grid">
              <article className="stat-card"><p>Completed payments</p><strong>{money(completedRevenue)}</strong><span className="stat-note">Verified revenue only</span></article>
              <article className="stat-card"><p>Recorded expenses</p><strong>{money(totalExpenses)}</strong><span className="stat-note">{data.expenses.length} expense records</span></article>
              <article className="stat-card"><p>Orders</p><strong>{data.orders.length}</strong><span className="stat-note">All order statuses</span></article>
              <article className="stat-card"><p>Low-stock items</p><strong>{lowStock.length}</strong><span className="stat-note">At or below reorder level</span></article>
            </div>
            <section className="panel finance-subpanel">
              <div className="panel-header"><h3>Order status breakdown</h3></div>
              {Object.keys(orderStatuses).length === 0 ? <p>No orders recorded.</p> : (
                <div className="finance-table-wrap"><table className="finance-table">
                  <thead><tr><th>Status</th><th>Orders</th></tr></thead>
                  <tbody>{Object.entries(orderStatuses).map(([status, count]) => <tr key={status}><td>{status}</td><td>{count}</td></tr>)}</tbody>
                </table></div>
              )}
            </section>
            <p className="finance-notice">Estimated balance: {money(completedRevenue - totalExpenses)} (completed payments minus recorded expenses; excludes other income and costs).</p>
          </>
        )}
      </section>
    </section>
  );
}
