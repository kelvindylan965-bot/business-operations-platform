import { useEffect, useState } from "react";
import "../App.css";
import Customers from "./Customers";
import Products from "./Products";
import Inventory from "./Inventory";
import Orders from "./Orders";
import Payments from "./Payments";
import Expenses from "./Expenses";
import Reports from "./Reports";
import Staff from "./Staff";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState(
    () => localStorage.getItem("activeSection") || "Dashboard"
  );

  const lowStockItems = inventory.filter(
    (item) => Number(item.quantity) <= Number(item.reorder_level)
  );

  const navigateTo = (section) => {
    localStorage.setItem("activeSection", section);
    setActiveSection(section);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [customersResponse, productsResponse, ordersResponse, paymentsResponse, inventoryResponse] =
          await Promise.all([
            fetch("http://localhost:3000/api/customers", { headers }),
            fetch("http://localhost:3000/api/products", { headers }),
            fetch("http://localhost:3000/api/orders", { headers }),
            fetch("http://localhost:3000/api/payments", { headers }),
            fetch("http://localhost:3000/api/inventory", { headers }),
          ]);

        const responses = [
          customersResponse,
          productsResponse,
          ordersResponse,
          paymentsResponse,
          inventoryResponse,
        ];

        if (responses.some((response) => response.status === 401)) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.reload();
          return;
        }

        if (responses.some((response) => !response.ok)) {
          throw new Error("Unable to load dashboard data");
        }

        const [
          customersData,
          productsData,
          ordersData,
          paymentsData,
          inventoryData,
        ] = await Promise.all([
          customersResponse.json(),
          productsResponse.json(),
          ordersResponse.json(),
          paymentsResponse.json(),
          inventoryResponse.json(),
        ]);

        setCustomers(customersData);
        setProducts(productsData);
        setOrders(ordersData);
        setPayments(paymentsData);
        setInventory(inventoryData);
      } catch {
        setError("Unable to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const totalRevenue = payments
    .filter((payment) => payment.status === "completed")
    .reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0
    );

  const recentOrders = orders.slice(0, 5);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeSection");
    window.location.reload();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">KB</div>

          <div>
            <h1>Kelvin Business</h1>
            <p>Operations Platform</p>
          </div>
        </div>

        <nav className="navigation">
          <p className="nav-label">MAIN</p>

          <button className={`nav-item ${activeSection === "Dashboard" ? "active" : ""}`} onClick={() => navigateTo("Dashboard")}>
            <span>▦</span>
            Dashboard
          </button>

          <button className={`nav-item ${activeSection === "Customers" ? "active" : ""}`} onClick={() => navigateTo("Customers")}>
            <span>◉</span>
            Customers
          </button>

          <button className={`nav-item ${activeSection === "Products" ? "active" : ""}`} onClick={() => navigateTo("Products")}>
            <span>□</span>
            Products
          </button>

          <button className={`nav-item ${activeSection === "Inventory" ? "active" : ""}`} onClick={() => navigateTo("Inventory")}>
            <span>▤</span>
            Inventory
          </button>

          <button className={`nav-item ${activeSection === "Orders" ? "active" : ""}`} onClick={() => navigateTo("Orders")}>
            <span>↗</span>
            Orders
          </button>

          <p className="nav-label">FINANCE</p>

          <button className={`nav-item ${activeSection === "Payments" ? "active" : ""}`} onClick={() => navigateTo("Payments")}>
            <span>◆</span>
            Payments
          </button>

          <button className={`nav-item ${activeSection === "Expenses" ? "active" : ""}`} onClick={() => navigateTo("Expenses")}>
            <span>◇</span>
            Expenses
          </button>

          <p className="nav-label">REPORTS</p>

          <button className={`nav-item ${activeSection === "Reports" ? "active" : ""}`} onClick={() => navigateTo("Reports")}>
            <span>▥</span>
            Reports
          </button>

          {user?.role === "admin" && (
            <button
              className={`nav-item ${activeSection === "Staff" ? "active" : ""}`}
              onClick={() => navigateTo("Staff")}
            >
              <span>♙</span>
              Staff Management
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <p>Created by</p>
          <strong>Kelvin Kiptoo Ngetich</strong>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">BUSINESS OPERATIONS</p>
            <h2>{activeSection}</h2>
          </div>

          <div className="user-area">
            <div className="avatar">
              {user?.full_name?.charAt(0) || "K"}
            </div>

            <div>
              <strong>{user?.full_name || "User"}</strong>
              <span>{user?.role || "Staff"}</span>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {activeSection === "Customers" ? (
          <Customers />
        ) : activeSection === "Products" ? (
          <Products />
        ) : activeSection === "Inventory" ? (
          <Inventory />
        ) : activeSection === "Orders" ? (
          <Orders />
        ) : activeSection === "Payments" ? (
          <Payments />
        ) : activeSection === "Expenses" ? (
          <Expenses />
        ) : activeSection === "Reports" ? (
          <Reports />
        ) : activeSection === "Staff" && user?.role === "admin" ? (
          <Staff />
        ) : (
        <section className="dashboard">
          <div className="welcome-card">
            <div>
              <p className="eyebrow">OVERVIEW</p>

              <h3>
                Welcome back, {user?.full_name?.split(" ")[0] || "User"}.
              </h3>

              <p>
                Manage your customers, products, inventory, orders and
                finances from one place.
              </p>
            </div>

            <div className="welcome-icon">▦</div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <div className="stats-grid">
            <article className="stat-card">
              <span className="stat-icon">◉</span>
              <p>Customers</p>
              <strong>{loading ? "..." : customers.length}</strong>
              <span className="stat-note">Total customers</span>
            </article>

            <article className="stat-card">
              <span className="stat-icon">□</span>
              <p>Products</p>
              <strong>{loading ? "..." : products.length}</strong>
              <span className="stat-note">Products in catalog</span>
            </article>

            <article className="stat-card low-stock-summary">
              <span className="stat-icon">!</span>
              <p>Low-stock products</p>
              <strong>{loading ? "..." : lowStockItems.length}</strong>
              <span className="stat-note">
                {lowStockItems.length === 1 ? "Product needs" : "Products need"} attention
              </span>
            </article>

            <article className="stat-card">
              <span className="stat-icon">↗</span>
              <p>Orders</p>
              <strong>{loading ? "..." : orders.length}</strong>
              <span className="stat-note">Orders recorded</span>
            </article>

            <article className="stat-card">
              <span className="stat-icon">◆</span>
              <p>Revenue</p>
              <strong>
                {loading ? "..." : `KSh ${totalRevenue.toLocaleString()}`}
              </strong>
              <span className="stat-note">Total payments</span>
            </article>
          </div>

          <div className="content-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">ACTIVITY</p>
                  <h3>Recent Orders</h3>
                </div>

                <button className="text-button" type="button" onClick={() => navigateTo("Orders")}>View all</button>
              </div>

              {loading ? (
                <div className="empty-state">
                  <h4>Loading orders...</h4>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">↗</div>
                  <h4>No recent orders</h4>
                  <p>
                    Orders created through the platform will appear here.
                  </p>
                </div>
              ) : (
                <div className="order-list">
                  {recentOrders.map((order) => (
                    <div className="order-row" key={order.id}>
                      <div>
                        <strong>Order #{order.id}</strong>
                        <span>
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div>
                        <strong>KSh {Number(order.total_amount).toLocaleString()}</strong>
                        <span className={`order-status ${order.status}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">INVENTORY</p>
                  <h3>Stock Overview</h3>
                </div>

                <button className="text-button" onClick={() => navigateTo("Inventory")}>View inventory</button>
              </div>

              {loading ? (
                <div className="empty-state">
                  <h4>Loading inventory...</h4>
                </div>
              ) : inventory.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">▤</div>
                  <h4>Inventory ready</h4>
                  <p>
                    Stock levels and low-stock products will appear here.
                  </p>
                </div>
              ) : (
                <div className="stock-list">
                  {inventory.slice(0, 5).map((item) => (
                    <div className="stock-row" key={item.id}>
                      <div>
                        <strong>{item.product_name || `Product #${item.product_id}`}</strong>
                        <span>Reorder level: {item.reorder_level}</span>
                        <span
                          className={`stock-status ${
                            Number(item.quantity) <= Number(item.reorder_level)
                              ? "stock-status-low"
                              : "stock-status-healthy"
                          }`}
                        >
                          {Number(item.quantity) <= Number(item.reorder_level)
                            ? "Low stock — reorder needed"
                            : "Stock level healthy"}
                        </span>
                      </div>

                      <strong>{item.quantity} units</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
