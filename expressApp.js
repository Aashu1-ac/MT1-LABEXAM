import express from "express";

const app = express();
const PORT = 4000;

app.use(express.json());

// Part B data is intentionally stored in an in-memory JavaScript array.
let cartItems = [
  { id: 1, productName: "Wireless Mouse", price: 799, quantity: 2, category: "Electronics" },
  { id: 2, productName: "Mechanical Keyboard", price: 2499, quantity: 1, category: "Electronics" },
  { id: 3, productName: "Water Bottle", price: 499, quantity: 2, category: "Accessories" }
];

function validateProduct(body, requireId = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }
  if (requireId && (!Number.isInteger(Number(body.id)) || Number(body.id) <= 0)) {
    return "A positive integer id is required.";
  }
  if (body.productName !== undefined &&
      (typeof body.productName !== "string" || !body.productName.trim())) {
    return "productName must be a non-empty string.";
  }
  if (body.price !== undefined &&
      (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) {
    return "price must be a non-negative number.";
  }
  if (body.quantity !== undefined &&
      (!Number.isInteger(Number(body.quantity)) || Number(body.quantity) <= 0)) {
    return "quantity must be a positive integer.";
  }
  if (body.category !== undefined &&
      (typeof body.category !== "string" || !body.category.trim())) {
    return "category must be a non-empty string.";
  }
  if (requireId && (!body.productName || body.price === undefined || body.quantity === undefined)) {
    return "id, productName, price and quantity are required.";
  }
  return null;
}

function withTotal(item) {
  return { ...item, totalPrice: item.price * item.quantity };
}

// GET /cart - retrieve all products
app.get("/cart", (req, res) => {
  res.status(200).json({
    count: cartItems.length,
    cart: cartItems.map(withTotal)
  });
});

// GET /cart/:id - retrieve one product
app.get("/cart/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Product id must be an integer." });
  }
  const product = cartItems.find(item => item.id === id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  return res.status(200).json(withTotal(product));
});

// POST /cart - add a product
app.post("/cart", (req, res) => {
  const validationError = validateProduct(req.body, true);
  if (validationError) return res.status(400).json({ error: validationError });

  const id = Number(req.body.id);
  if (cartItems.some(item => item.id === id)) {
    return res.status(409).json({ error: `A product with id ${id} already exists.` });
  }

  const product = {
    id,
    productName: req.body.productName.trim(),
    price: Number(req.body.price),
    quantity: Number(req.body.quantity),
    category: typeof req.body.category === "string" && req.body.category.trim()
      ? req.body.category.trim()
      : "General"
  };
  cartItems.push(product);
  return res.status(201).json({
    message: "Product added successfully",
    product: withTotal(product)
  });
});

// PUT /cart/:id - update an existing product
app.put("/cart/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Product id must be an integer." });
  }
  const productIndex = cartItems.findIndex(item => item.id === id);
  if (productIndex === -1) return res.status(404).json({ error: "Product not found." });

  const validationError = validateProduct(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const allowedFields = ["productName", "price", "quantity", "category"];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = field === "productName" || field === "category"
        ? req.body[field].trim()
        : Number(req.body[field]);
    }
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Provide at least one field to update." });
  }

  cartItems[productIndex] = { ...cartItems[productIndex], ...updates };
  return res.status(200).json({
    message: "Product updated successfully",
    product: withTotal(cartItems[productIndex])
  });
});

// DELETE /cart/:id - remove a product
app.delete("/cart/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Product id must be an integer." });
  }
  const productIndex = cartItems.findIndex(item => item.id === id);
  if (productIndex === -1) return res.status(404).json({ error: "Product not found." });

  const [deletedProduct] = cartItems.splice(productIndex, 1);
  return res.status(200).json({
    message: "Product removed successfully",
    product: withTotal(deletedProduct)
  });
});

// Invalid JSON and unexpected errors are returned as JSON.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error." });
});

// Unknown endpoints
app.use((req, res) => {
  res.status(404).json({ error: "API route not found." });
});

app.listen(PORT, () => {
  console.log(`Express Server running at http://localhost:${PORT}`);
});
