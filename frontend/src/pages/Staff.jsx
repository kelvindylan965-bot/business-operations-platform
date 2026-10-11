import { useCallback, useEffect, useState } from "react";

function Staff() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdStaff, setCreatedStaff] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [listError, setListError] = useState("");

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    setListError("");

    try {
      const response = await fetch("http://localhost:3000/api/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load staff accounts.");
      }

      setStaff(data.users || []);
    } catch (err) {
      setListError(err.message || "Unable to connect to the server.");
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStaff();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadStaff]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setCreatedStaff(null);
    setSaving(true);

    try {
      const response = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create staff account.");
      }

      setCreatedStaff({
        full_name: data.user.full_name,
        email: data.user.email,
      });
      setForm({ full_name: "", email: "", password: "" });

      await loadStaff();
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="dashboard">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">ACCOUNT MANAGEMENT</p>
            <h3>Create Staff Account</h3>
          </div>
        </div>

        <p>Create a staff login for someone in your business.</p>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        {createdStaff && (
          <div
            role="status"
            style={{
              padding: "16px",
              margin: "16px 0",
              border: "1px solid #16a34a",
              borderRadius: "8px",
              backgroundColor: "#f0fdf4",
              color: "#166534",
            }}
          >
            <h4 style={{ margin: "0 0 8px" }}>
              ✓ Staff account created successfully!
            </h4>
            <p style={{ margin: "4px 0" }}>
              <strong>Name:</strong> {createdStaff.full_name}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Email:</strong> {createdStaff.email}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              This account has the Staff role, not Admin privileges.
            </p>
          </div>
        )}

        <form className="customer-form" onSubmit={handleSubmit}>
          <input
            name="full_name"
            placeholder="Full name"
            autoComplete="name"
            value={form.full_name}
            onChange={(event) =>
              setForm({ ...form, full_name: event.target.value })
            }
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Email address"
            autoComplete="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Temporary password (at least 8 characters)"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            required
          />

          <button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Staff Account"}
          </button>
        </form>

        <p>New accounts receive the Staff role, not Admin privileges.</p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">TEAM OVERVIEW</p>
            <h3>Staff Management</h3>
          </div>

          <button
            type="button"
            onClick={loadStaff}
            disabled={loadingStaff}
          >
            {loadingStaff ? "Loading..." : "Refresh"}
          </button>
        </div>

        <p>
          Staff accounts: <strong>{staff.length}</strong>
        </p>

        {listError && (
          <p className="login-error" role="alert">
            {listError}
          </p>
        )}

        {loadingStaff ? (
          <p>Loading staff accounts...</p>
        ) : listError ? (
          <p>Could not load the staff list. Select Refresh to try again.</p>
        ) : staff.length === 0 ? (
          <p>No staff accounts found. Create a staff account using the form above.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px", textAlign: "left" }}>ID</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Name</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Email</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Role</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td style={{ padding: "12px" }}>{member.id}</td>
                    <td style={{ padding: "12px" }}>{member.full_name}</td>
                    <td style={{ padding: "12px" }}>{member.email}</td>
                    <td style={{ padding: "12px" }}>{member.role}</td>
                    <td style={{ padding: "12px" }}>
                      {member.created_at
                        ? new Date(member.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default Staff;
