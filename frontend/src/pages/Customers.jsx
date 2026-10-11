import { useEffect, useState } from "react";

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  address: "",
};

function Customers() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);


  useEffect(() => {
    let active = true;

    async function fetchCustomers() {
      try {
        const response = await fetch("http://localhost:3000/api/customers", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Unable to load customers.");

        const data = await response.json();
        if (active) setCustomers(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchCustomers();
    return () => {
      active = false;
    };
  }, [token]);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function startEditing(customer) {
    setEditingId(customer.id);
    setForm({
      full_name: customer.full_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      setSaving(true);
      const editing = editingId !== null;
      const response = await fetch(
        `http://localhost:3000/api/customers${editing ? `/${editingId}` : ""}`,
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to save customer.");
      }

      setCustomers((current) =>
        editing
          ? current.map((customer) => customer.id === editingId ? data : customer)
          : [data, ...current]
      );
      cancelEditing();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer) {
    if (!window.confirm(`Delete customer "${customer.full_name}"?`)) return;
    setError("");

    try {
      const response = await fetch(
        `http://localhost:3000/api/customers/${customer.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to delete customer.");
      }

      setCustomers((current) =>
        current.filter((item) => item.id !== customer.id)
      );
      if (editingId === customer.id) cancelEditing();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="dashboard">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">CUSTOMER MANAGEMENT</p>
            <h3>Customers</h3>
          </div>
          <strong>{customers.length} customers</strong>
        </div>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleSubmit} className="customer-form">
          <h4>{editingId !== null ? "Edit Customer" : "Add Customer"}</h4>

          <input
            name="full_name"
            placeholder="Full name *"
            value={form.full_name}
            onChange={handleChange}
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
          />
          <input
            name="phone"
            placeholder="Phone number"
            value={form.phone}
            onChange={handleChange}
          />
          <input
            name="address"
            placeholder="Address"
            value={form.address}
            onChange={handleChange}
          />

          <button type="submit" className="primary-button" disabled={saving}>
            {saving
              ? "Saving..."
              : editingId !== null
                ? "Save Changes"
                : "Add Customer"}
          </button>

          {editingId !== null && (
            <button type="button" onClick={cancelEditing} disabled={saving}>
              Cancel
            </button>
          )}
        </form>

        <h4>Customer List</h4>

        {loading ? (
          <p>Loading customers...</p>
        ) : customers.length === 0 ? (
          <p>No customers yet. Add your first customer above.</p>
        ) : (
          <div className="order-list">
            {customers.map((customer) => (
              <div className="order-row" key={customer.id}>
                <div>
                  <strong>{customer.full_name}</strong>
                  <span>{customer.email || "No email provided"}</span>
                </div>
                <div>
                  <span>{customer.phone || "No phone provided"}</span>
                  <span>{customer.address || "No address provided"}</span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => startEditing(customer)}
                  >
                    Edit
                  </button>
                  {user?.role === "admin" && (
                    <button
                      type="button"
                      onClick={() => handleDelete(customer)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Customers;
