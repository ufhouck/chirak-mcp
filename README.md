# Chirak MCP Server (`chirak-mcp`)

Official **Model Context Protocol (MCP)** server for **Chirak** — The modern Sales, Inventory & Order Management platform.

Connect your retail store, boutique, or multi-channel business directly to leading AI assistants like **Claude Desktop**, **Cursor**, **Windsurf**, **Claude Code**, and **Gemini**.

- 🌐 **Website:** [chirak.app](https://chirak.app)
- 📖 **Documentation:** [chirak.app/docs](https://chirak.app/docs)
- 📱 **App Store:** [Download Chirak on iOS & iPadOS](https://apps.apple.com/app/chirak-sales-inventory/id6801464820)

---

## Features

- 📦 **Live Inventory Queries:** Query real-time product quantities, low-stock warnings, and category stock lists.
- 🏷️ **Product Management:** Add new products, update selling/buying prices, and barcodes.
- ⚡ **Wholesale Invoice Parsing:** Let your AI vision models read supplier invoices and bulk-add inventory.
- 🧾 **Order & Sales Recording:** Register walk-in sales, WhatsApp/Instagram orders, and delivery statuses.
- 📊 **Executive Analytics:** Get instant daily/weekly summaries on revenue, net profit, and top-selling items.
- 👥 **Customer Directory:** Query customer balances, contact details, and transaction history.
- 🔒 **End-to-End Security:** API keys are hashed via SHA-256 with tenant-level isolation and strict permission scopes.

---

## Quickstart

### 1. Generate Your API Key
In the Chirak iOS/iPadOS app, open **More** (Daha Fazla) → **Integrations & AI** (Entegrasyonlar & AI) → tap **Create API Key**.

### 2. Configure Claude Desktop
Add the following to your `claude_desktop_config.json` file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "chirak": {
      "command": "npx",
      "args": ["-y", "chirak-mcp"],
      "env": {
        "CHIRAK_API_KEY": "chk_live_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### 3. Configure Cursor AI / Windsurf
In **Cursor Settings** → **Features** → **MCP** → **Add New MCP Server**:
- **Name:** `chirak`
- **Type:** `command`
- **Command:** `npx -y chirak-mcp`
- **Environment Variables:** `CHIRAK_API_KEY=chk_live_YOUR_API_KEY_HERE`

---

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `get_products` | Retrieve products with optional filters (category, low stock, search). |
| `add_product` | Add a new product to inventory with prices, stock, and barcode. |
| `update_stock` | Adjust stock quantity with movement reasons (in, out, count, loss). |
| `update_product` | Update product details (name, price, category, unit). |
| `delete_product` | Delete a product from inventory (requires full access). |
| `get_sales` | Retrieve recent sales and orders with customer details. |
| `record_sale` | Record a new sale with line items, payments, and customer link. |
| `cancel_sale` | Cancel a sale and automatically restore stock levels. |
| `get_daily_summary`| Fetch daily turnover, profit, transaction count, and top items. |
| `get_customers` | List customers with contact info and outstanding debt. |
| `add_customer` | Create a new customer record. |
| `update_customer` | Update existing customer details. |
| `delete_customer` | Remove a customer record. |

---

## Security & Privacy

- All communication between `chirak-mcp` and Chirak's Cloud API is encrypted via **HTTPS/TLS**.
- API keys are authenticated server-side using cryptographic SHA-256 hashes.
- Your store data is strictly isolated to your authenticated tenant account.
- For more details, visit our [Privacy Policy](https://chirak.app/privacy) and [Terms of Service](https://chirak.app/terms).

---

## License

MIT License © 2026 Ufuk AYDIN
