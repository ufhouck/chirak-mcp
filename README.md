# Chirak MCP Server

[![Smithery](https://img.shields.io/badge/Smithery-ufhouck%2Fchirak-blue)](https://smithery.ai/servers/ufhouck/chirak)
[![npm version](https://img.shields.io/npm/v/chirak-mcp.svg)](https://www.npmjs.com/package/chirak-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.ufhouck%2Fchirak--mcp-purple)](https://registry.modelcontextprotocol.io)
[![Glama](https://img.shields.io/badge/Glama-Chirak-emerald)](https://glama.ai/mcp/servers)

A Model Context Protocol (MCP) server that connects AI clients (Claude Desktop, Cursor, Windsurf) to the Chirak Sales, Inventory, and Order Management API.

## Overview

The Chirak MCP server enables Large Language Model (LLM) interfaces to perform real-time inventory lookups, record sales transactions, manage product records, and query business analytics via standard Model Context Protocol tooling over STDIO.

## Prerequisites

- Node.js 18.0.0 or higher
- A Chirak API key (generated from the Chirak iOS/iPadOS application under Settings > Integrations & AI)

## Installation and Configuration

### Smithery (Automatic Installation)

To install Chirak for Claude Desktop automatically using Smithery:

```bash
npx -y smithery mcp add ufhouck/chirak
```

### Claude Desktop (Manual Configuration)

Add the following configuration to your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "chirak": {
      "command": "npx",
      "args": ["-y", "chirak-mcp"],
      "env": {
        "CHIRAK_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Cursor and Windsurf

Configure the MCP server within your editor's MCP settings:

- **Command:** `npx`
- **Arguments:** `-y chirak-mcp`
- **Environment Variables:**
  - `CHIRAK_API_KEY`: `your_api_key_here`

### Smithery

To install via Smithery CLI:

```bash
npx -y smithery mcp add ufhouck/chirak
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CHIRAK_API_KEY` | Yes | Authentication key for Chirak Cloud API (`chk_live_...`). |
| `CHIRAK_API_BASE_URL` | No | Target API endpoint (default: `https://chirak.app/api/v1`). |

## Tools

### Inventory and Products

| Tool | Description |
|---|---|
| `get_products` | List and search inventory items with optional filters by category, stock level, or query string. |
| `add_product` | Create a new product entry with SKU, name, prices, barcode, and initial stock. |
| `update_stock` | Adjust inventory counts with specified movement type (inbound, outbound, audit, loss). |
| `update_product` | Modify existing product attributes such as title, price, or category. |
| `delete_product` | Remove an inventory item record. |

### Sales and Orders

| Tool | Description |
|---|---|
| `get_sales` | Retrieve recent orders and sales records filtered by date or status. |
| `record_sale` | Create a sales transaction with line items, applied payment methods, and customer association. |
| `cancel_sale` | Void a sales transaction and automatically return items to inventory. |
| `get_daily_summary` | Retrieve daily aggregated metrics including total revenue, profit, transaction count, and top-selling products. |

### Customer Management

| Tool | Description |
|---|---|
| `get_customers` | Query customer records, outstanding balances, and purchase summaries. |
| `add_customer` | Create a new customer profile. |
| `update_customer` | Update contact information and customer notes. |
| `delete_customer` | Remove a customer record. |

### Documents & Invoices (Billing)

| Tool | Description |
|---|---|
| `list_documents` | Retrieve invoices, receipts, return invoices, and quotes with type/status filters. |
| `get_document` | Fetch full itemized document details, customer details, and tax/VAT calculations. |
| `create_document` | Create and issue formal invoices, sales receipts, or quotes with line items. |
| `delete_document` | Permanently remove an invoice or receipt record. |
| `export_document_text` | Render formatted ASCII thermal receipt / ticket layout suitable for printing or chat display. |

## Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/ufhouck/chirak-mcp.git
cd chirak-mcp
npm install
npm run build
```

To run locally using STDIO:

```bash
export CHIRAK_API_KEY="your_api_key_here"
node dist/index.js
```

## Security

- All API communications are conducted over TLS (HTTPS).
- API credentials are authenticated server-side using SHA-256 hash matching.
- Requests operate strictly within isolated tenant database partitions.

## Privacy Policy
 
Chirak values developer and user privacy. When interacting with this MCP server:
- All data transmission between AI clients and Chirak Cloud API is encrypted in transit using TLS.
- Store database partitions are strictly multi-tenant isolated by tenant ID.
- API keys are verified server-side using SHA-256 hashes and are never stored in plain text.
- Full Privacy Policy documentation: [https://chirak.app/privacy](https://chirak.app/privacy)

## License

MIT License. See [LICENSE](LICENSE) for details.

