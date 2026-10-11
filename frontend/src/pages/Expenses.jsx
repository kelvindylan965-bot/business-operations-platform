import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:3000/api";
const blankForm = { description: "", category: "", amount: "", expense_date: new Date().toISOString().slice(0, 10) };

export default function Expenses() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API}/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.reload();
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load expenses.");
      setExpenses(data);
    } catch (err) {
      setError(err.message || "Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { Promise.resolve().then(() => loadExpenses()); }, [loadExpenses]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function saveExpense(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.description.trim() || !form.category.trim() || Number(form.amount) <= 0) {
      setError("Enter a description, category, and positive amount.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API}/expenses${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save expense.");
      setForm(blankForm);
      setEditingId(null);
      setNotice(editingId ? "Expense updated." : "Expense added.");
      await loadExpenses();
    } catch (err) {
      setError(err.message || "Unable to save expense.");
    } finally {
      setSaving(false);
    }
  }

  function editExpense(expense) {
    setEditingId(expense.id);
    setForm({
      description: expense.description || "",
      category: expense.category || "",
      amount: String(expense.amount ?? ""),
      expense_date: String(expense.expense_date || "").slice(0, 10),
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExpense(id) {
    if (!window.confirm(`Delete expense #${id}?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API}/expenses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to delete expense.");
      setNotice("Expense deleted.");
      await loadExpenses();
    } catch (err) {
      setError(err.message || "Unable to delete expense.");
    }
  }

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return (
    <section className="finance-page">
      <section className="panel">
        <div className="panel-header"><h3>{editingId ? "Edit expense" : "Add an expense"}</h3></div>
        <form className="finance-form" onSubmit={saveExpense}>
          <label>Description<input name="description" value={form.description} onChange={updateField} required /></label>
          <label>Category<input name="category" value={form.category} onChange={updateField} placeholder="e.g. Transport, Rent" required /></label>
          <label>Amount (KSh)<input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={updateField} required /></label>
          <label>Date<input name="expense_date" type="date" value={form.expense_date} onChange={updateField} required /></label>
          <div className="finance-actions">
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Add expense"}</button>
            {editingId && <button className="text-button" type="button" onClick={() => { setEditingId(null); setForm(blankForm); }}>Cancel edit</button>}
          </div>
        </form>
        {error && <p className="login-error">{error}</p>}
        {notice && <p className="finance-notice">{notice}</p>}
      </section>

      <section className="panel">
        <div className="panel-header"><h3>Expense history</h3><strong>KSh {total.toLocaleString()}</strong></div>
        {loading ? <p>Loading expenses...</p> : expenses.length === 0 ? (
          <div className="empty-state"><h4>No expenses recorded</h4><p>Add an expense to begin tracking business costs.</p></div>
        ) : (
          <div className="finance-table-wrap"><table className="finance-table">
            <thead><tr><th>Description</th><th>Category</th><th>Date</th><th>Amount</th><th>Actions</th></tr></thead>
            <tbody>{expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.description}</td><td>{expense.category}</td>
                <td>{String(expense.expense_date || "").slice(0, 10)}</td>
                <td>KSh {Number(expense.amount).toLocaleString()}</td>
                <td><div className="finance-actions">
                  <button className="text-button" type="button" onClick={() => editExpense(expense)}>Edit</button>
                  {user?.role === "admin" && <button className="text-button" type="button" onClick={() => deleteExpense(expense.id)}>Delete</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </section>
  );
}
