import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

// Part A data is intentionally stored in an in-memory JavaScript array.
const cartItems = [
  { id: 1, productName: "Wireless Mouse", price: 799, quantity: 2 },
  { id: 2, productName: "Keyboard", price: 1299, quantity: 1 },
  { id: 3, productName: "USB-C Cable", price: 299, quantity: 3 }
];

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}

function sendText(res, statusCode, message, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(message);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });
    req.on("error", reject);
  });
}

function validateProduct(product) {
  const { id, productName, price, quantity } = product ?? {};
  if (id === undefined || !Number.isInteger(Number(id)) || Number(id) <= 0) {
    return "A positive integer id is required.";
  }
  if (typeof productName !== "string" || !productName.trim()) {
    return "productName must be a non-empty string.";
  }
  if (price === undefined || !Number.isFinite(Number(price)) || Number(price) < 0) {
    return "price must be a non-negative number.";
  }
  if (quantity === undefined || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
    return "quantity must be a positive integer.";
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = requestUrl.pathname;

  if (req.method === "GET" && pathname === "/") {
    return sendText(
      res,
      200,
      `<!doctype html><html><head><meta charset="utf-8"><title>Shopping Cart</title></head>
      <body style="font-family:Arial,sans-serif;padding:40px">
      <h1>Welcome to Shopping Cart Management</h1>
      <p>Node.js HTTP server is running successfully.</p>
      <p>Try <a href="/cart">/cart</a>, <a href="/about">/about</a> or <a href="/home">/home</a>.</p>
      </body></html>`,
      "text/html; charset=utf-8"
    );
  }

  if (req.method === "GET" && pathname === "/cart") {
    return sendJson(res, 200, cartItems);
  }

  if (req.method === "POST" && pathname === "/add-to-cart") {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("application/json")) {
      return sendJson(res, 415, { error: "Content-Type must be application/json." });
    }
    try {
      const product = await readJsonBody(req);
      const validationError = validateProduct(product);
      if (validationError) return sendJson(res, 400, { error: validationError });

      const id = Number(product.id);
      if (cartItems.some(item => item.id === id)) {
        return sendJson(res, 409, { error: `A product with id ${id} already exists.` });
      }

      const newProduct = {
        id,
        productName: product.productName.trim(),
        price: Number(product.price),
        quantity: Number(product.quantity)
      };
      cartItems.push(newProduct);
      return sendJson(res, 201, {
        message: "Product added to cart successfully.",
        product: newProduct
      });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.method === "GET" && pathname === "/about") {
    return sendText(
      res,
      200,
      "<!doctype html><html><head><meta charset='utf-8'><title>About</title></head><body style='font-family:Arial;padding:40px'><h1>About this application</h1><p>A shopping cart demonstration built with the Node.js HTTP and FS modules. Data is stored in a JavaScript array; no database is used.</p><a href='/'>Back to home</a></body></html>",
      "text/html; charset=utf-8"
    );
  }

  if (req.method === "GET" && pathname === "/home") {
    const htmlPath = path.join(__dirname, "public", "index.html");
    return fs.readFile(htmlPath, "utf8", (error, html) => {
      if (error) {
        console.error("Unable to read public/index.html:", error);
        return sendJson(res, 500, { error: "Unable to load the home page." });
      }
      return sendText(res, 200, html, "text/html; charset=utf-8");
    });
  }

  // Known paths with unsupported methods return 405; all other paths return 404.
  const knownPaths = ["/", "/cart", "/add-to-cart", "/about", "/home"];
  if (knownPaths.includes(pathname)) {
    res.setHeader("Allow", pathname === "/add-to-cart" ? "POST" : "GET");
    return sendJson(res, 405, { error: "Method not allowed for this route." });
  }
  return sendJson(res, 404, { error: "Route not found." });
});

server.listen(PORT, () => {
  console.log(`HTTP Server running at http://localhost:${PORT}`);
});
