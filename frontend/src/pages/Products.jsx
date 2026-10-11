import { useCallback, useEffect, useRef, useState } from "react";

function Products() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const formRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
  });

  const loadProducts = useCallback(async function loadProducts() {
    try {
      const response = await fetch("http://localhost:3000/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Unable to load products.");

      setProducts(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    Promise.resolve().then(() => loadProducts());
  }, [loadProducts]);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function startEditing(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
    });
    setError("");
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm({ name: "", description: "", price: "" });
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!user?.business_id) {
      setError("Business information is missing. Please sign in again.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        editingId
          ? `http://localhost:3000/api/products/${editingId}`
          : "http://localhost:3000/api/products",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...form,
            price: Number(form.price),
            business_id: user.business_id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to add product.");
      }

      if (editingId) {
        setProducts((current) =>
          current.map((product) => product.id === editingId ? data : product)
        );
      } else {
        setProducts((current) => [data, ...current]);
      }

      setEditingId(null);
      setForm({ name: "", description: "", price: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(product) {
    setDeletingProduct(product);
  }

  async function confirmDelete() {
    if (!deletingProduct) return;

    const product = deletingProduct;
    setError("");
    setDeleting(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/products/${product.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete product.");
      }

      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );

      if (editingId === product.id) {
        cancelEditing();
      }

      setDeletingProduct(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="dashboard">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">PRODUCT MANAGEMENT</p>
            <h3>Products</h3>
          </div>
          <strong>{products.length} products</strong>
        </div>

        {error && <p className="login-error">{error}</p>}

        <form ref={formRef} onSubmit={handleSubmit} className="customer-form">
          <h4>{editingId ? "Edit Product" : "Add Product"}</h4>

          <input
            name="name"
            placeholder="Product name *"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
          />

          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="Price in KSh *"
            value={form.price}
            onChange={handleChange}
            required
          />

          <div className="product-form-actions">
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Product"}
            </button>
            {editingId && (
              <button type="button" className="secondary-button" onClick={cancelEditing} disabled={saving}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <h4>Product List</h4>

        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p>No products yet. Add your first product above.</p>
        ) : (
          <div className="order-list">
            {products.map((product) => (
              <div className="order-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.description || "No description provided"}</span>
                </div>
                <div>
                  <strong>
                    KSh {Number(product.price).toLocaleString()}
                  </strong>
                  <button
                    type="button"
                    onClick={() => startEditing(product)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deletingProduct && (
        <div
          className="modal-backdrop"
          onClick={() => { if (!deleting) setDeletingProduct(null); }}
        >
          <section
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="delete-modal-icon" aria-hidden="true">
              🗑
            </div>

            <h3 id="delete-modal-title">Delete product?</h3>
            <p className="delete-modal-warning">
              This action cannot be undone.
            </p>

            <div className="delete-product-summary">
              <strong>{deletingProduct.name}</strong>
              <span>
                KSh {Number(deletingProduct.price).toLocaleString()}
              </span>
            </div>

            <p className="delete-modal-message">
              Are you sure you want to remove this product from your catalog?
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="cancel-delete-button"
                onClick={() => { if (!deleting) setDeletingProduct(null); }}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-delete-button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete product"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default Products;
