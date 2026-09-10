#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.CHIRAK_API_KEY;
const API_BASE_URL = (process.env.CHIRAK_API_BASE_URL || "https://chirak.app/api/v1").replace(/\/$/, "");

if (!API_KEY) {
  console.error("Error: CHIRAK_API_KEY environment variable is required to run chirak-mcp.");
  console.error("Please configure your API key in Claude Desktop or pass it via environment variables.");
  process.exit(1);
}

// HTTP Helper
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const headers: Record<string, string> = {
    "X-API-Key": API_KEY as string,
    "Authorization": `ApiKey ${API_KEY}`,
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {})
  };

  const response = await fetch(url, { ...options, headers });
  const data: any = await response.json();

  if (!response.ok) {
    const errorMsg = data.message || data.error || `HTTP ${response.status} error`;
    throw new Error(`Chirak API Error: ${errorMsg}`);
  }

  return data;
}

// MCP Tools Definitions
const TOOLS: Tool[] = [
  {
    name: "get_chirak_help",
    description: "Returns a complete operational guide to Chirak store capabilities, operational cheat-sheet, active store context, and example AI prompt patterns. Call this whenever the user or agent needs help, guidance, or wants to explore store features.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Optional specific topic to focus on: 'products', 'sales', 'customers', 'reports', or 'general'."
        }
      }
    }
  },
  {
    name: "help",
    description: "Quick operational guide and cheat-sheet for Chirak store capabilities, active metrics, and recommended prompts.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Optional specific topic: 'products', 'sales', 'customers', 'reports', or 'general'."
        }
      }
    }
  },
  {
    name: "get_inventory",
    description: "Fetch current inventory products from Chirak, with options to filter by category or find critical low stock items.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional category name to filter products (e.g. 'Coffee', 'Clothing', 'General')."
        },
        low_stock_only: {
          type: "boolean",
          description: "If true, only returns products whose stock quantity is at or below the minimum threshold."
        },
        limit: {
          type: "number",
          description: "Maximum number of products to return (default: 50, max: 100)."
        }
      }
    }
  },
  {
    name: "search_product",
    description: "Search for products in Chirak by name, SKU code, or barcode.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query (product name, barcode, or SKU)."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "add_product",
    description: "Add a new product to Chirak inventory. Use this when the user asks to add items, parse wholesale invoices, or register products.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Full product title/name (required)."
        },
        sellingPrice: {
          type: "number",
          description: "Retail selling price for the product (e.g. 150.0)."
        },
        costPrice: {
          type: "number",
          description: "Purchase or wholesale cost price (optional, default: 0)."
        },
        stockQuantity: {
          type: "number",
          description: "Initial physical stock quantity (default: 0)."
        },
        minimumStock: {
          type: "number",
          description: "Low stock alert threshold (default: 5)."
        },
        category: {
          type: "string",
          description: "Product category name (e.g. 'General', 'Giyim', 'Kahve')."
        },
        sku: {
          type: "string",
          description: "Stock Keeping Unit code (e.g. 'GMLK-01')."
        },
        barcode: {
          type: "string",
          description: "EAN-13, QR, or other barcode string."
        },
        unit: {
          type: "string",
          description: "Unit type: 'Adet', 'Kg', 'Gram', 'Kutu', 'Çift', 'Libre', 'Ons'."
        },
        currency: {
          type: "string",
          description: "ISO currency code (e.g. 'TRY', 'USD', 'EUR')."
        }
      },
      required: ["name", "sellingPrice"]
    }
  },
  {
    name: "update_product",
    description: "Update details of an existing product in Chirak, such as selling price, cost, physical stock quantity, name, category, SKU, or barcode.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Product UUID (required)."
        },
        name: { type: "string", description: "Updated product name." },
        sellingPrice: { type: "number", description: "Updated retail selling price." },
        costPrice: { type: "number", description: "Updated wholesale cost price." },
        stockQuantity: { type: "number", description: "Updated stock quantity." },
        minimumStock: { type: "number", description: "Updated minimum stock threshold." },
        category: { type: "string", description: "Updated category name." },
        sku: { type: "string", description: "Updated SKU code." },
        barcode: { type: "string", description: "Updated barcode string." },
        unit: { type: "string", description: "Updated unit type (e.g. 'Adet', 'Kg')." }
      },
      required: ["id"]
    }
  },
  {
    name: "adjust_stock",
    description: "Adjust physical stock quantity for a product (+/- change) with an audit reason (e.g. 'purchase', 'damage', 'adjustment', 'return'). Automatically records a stock movement.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Product UUID (required)."
        },
        quantityChange: {
          type: "number",
          description: "Quantity change (e.g. +10 to add stock, -3 for damaged goods)."
        },
        reason: {
          type: "string",
          description: "Reason: 'purchase', 'sale', 'adjustment', 'damage', 'return'."
        },
        note: {
          type: "string",
          description: "Optional audit note for the stock adjustment."
        }
      },
      required: ["id", "quantityChange"]
    }
  },
  {
    name: "delete_product",
    description: "Permanently delete or remove a product from the Chirak inventory catalog.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Product UUID to delete (required)."
        }
      },
      required: ["id"]
    }
  },
  {
    name: "record_sale",
    description: "Record a sale order and automatically deduct the corresponding product stocks in Chirak.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "List of items in the order.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Product name (or SKU if name not available)" },
              sku: { type: "string", description: "Product SKU" },
              productId: { type: "string", description: "Product UUID (if known)" },
              quantity: { type: "number", description: "Quantity sold (minimum 1)" },
              unitPrice: { type: "number", description: "Unit price (optional, uses product selling price if omitted)" }
            },
            required: ["quantity"]
          }
        },
        customerName: {
          type: "string",
          description: "Customer full name (optional)."
        },
        customerPhone: {
          type: "string",
          description: "Customer phone number (optional)."
        },
        channel: {
          type: "string",
          description: "Sale channel: 'WhatsApp', 'Instagram', 'Fiziki Mağaza', 'Web Sitesi', 'Telefon Siparişi', 'Diğer'."
        },
        paymentStatus: {
          type: "string",
          description: "Payment status: 'Ödendi', 'Ödenmedi', 'Kısmi Ödeme'."
        },
        notes: {
          type: "string",
          description: "Order notes or special delivery instructions."
        }
      },
      required: ["items"]
    }
  },
  {
    name: "cancel_sale",
    description: "Cancel a sale order and automatically restore the ordered item quantities back into the physical store inventory.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Sale order UUID to cancel (required)."
        }
      },
      required: ["id"]
    }
  },
  {
    name: "get_sales_report",
    description: "Retrieve a summary report of revenue, total sales orders, units sold, and low-stock alerts.",
    inputSchema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "this_week", "this_month"],
          description: "Time range for the sales report (default: 'today')."
        }
      }
    }
  },
  {
    name: "list_customers",
    description: "Retrieve customer contact directory and their lifetime spending metrics from Chirak.",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Search customer by name, phone or email."
        },
        limit: {
          type: "number",
          description: "Max customers to return (default: 50)."
        }
      }
    }
  },
  {
    name: "add_customer",
    description: "Add a new customer to the Chirak store contacts directory.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer full name (required)." },
        phone: { type: "string", description: "Customer phone number." },
        email: { type: "string", description: "Customer email address." },
        address: { type: "string", description: "Customer delivery / billing address." },
        channel: { type: "string", description: "Primary channel: 'WhatsApp', 'Instagram', 'Mağaza / Telefon', 'Telegram', 'TikTok', 'Diğer'." },
        socialHandle: { type: "string", description: "Social media username (e.g. '@selin')." },
        notes: { type: "string", description: "VIP notes or customer preferences." }
      },
      required: ["name"]
    }
  },
  {
    name: "update_customer",
    description: "Update contact details, delivery address, or notes of an existing customer in Chirak.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Customer UUID (required)." },
        name: { type: "string", description: "Updated full name." },
        phone: { type: "string", description: "Updated phone number." },
        email: { type: "string", description: "Updated email address." },
        address: { type: "string", description: "Updated address." },
        channel: { type: "string", description: "Updated channel." },
        socialHandle: { type: "string", description: "Updated social handle." },
        notes: { type: "string", description: "Updated notes." }
      },
      required: ["id"]
    }
  },
  {
    name: "delete_customer",
    description: "Delete a customer from the Chirak store directory.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Customer UUID to delete (required)." }
      },
      required: ["id"]
    }
  }
];

// Initialize Server
const server = new Server(
  {
    name: "chirak-mcp-server",
    version: "1.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register List Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Register Call Tool Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const toolArgs = args || {};

  try {
    switch (name) {
      case "get_chirak_help":
      case "help": {
        let activeSummary: any = null;
        try {
          activeSummary = await apiRequest("/reports/summary?period=today");
        } catch (_) {}

        const mascotBanner = [
          "      (\\_/)",
          "      (•.•)",
          "     / >✨  CHIRAK",
          "    o(\")(\")"
        ].join("\n");

        const helpGuide = {
          mascot: mascotBanner,
          service: "Chirak MCP & REST Engine",
          description: "Real-time AI Assistant and Automation Bridge for Chirak iOS/iPadOS Retail Stores.",
          bidirectionalSync: "All actions taken via this MCP server automatically sync to the store owner's iPhone & iPad in real-time (<100ms).",
          activeStoreContext: activeSummary ? {
            todayRevenue: activeSummary.metrics?.totalRevenue,
            todayOrders: activeSummary.metrics?.orderCount,
            criticalStockAlerts: activeSummary.criticalStockAlerts?.length || 0
          } : "Store connected",
          availableTools: {
            help: "get_chirak_help - View this complete capabilities cheat-sheet and prompt patterns.",
            products: {
              get_inventory: "Fetch stock catalog with category and low-stock filters.",
              search_product: "Search products by name, barcode, or SKU code.",
              add_product: "Register new products (supports wholesale invoice parsing).",
              update_product: "Update prices, names, categories, or barcodes.",
              adjust_stock: "Atomically increment/decrement stock quantity with business reason.",
              delete_product: "Permanently delete or remove products from catalog."
            },
            sales: {
              record_sale: "Record customer orders and atomically deduct physical stock.",
              cancel_sale: "Cancel a sale order and automatically restore products to inventory.",
              get_sales_report: "Get daily, weekly, or monthly revenue, order volume, and low stock."
            },
            customers: {
              list_customers: "Search customer contacts and lifetime spend metrics.",
              add_customer: "Create new customer cards with phone, email, channel, and address.",
              update_customer: "Update customer address, phone, notes, or social handle.",
              delete_customer: "Delete a customer from the store directory."
            }
          },
          recommendedAIPrompts: [
            "Bugün ne kadar ciro yaptık ve hangi ürünler azaldı?",
            "Yeni gelen faturadaki 5 ürünü stoğa ekle",
            "Selin Yılmaz'a 2 adet İtalyan Keten Gömlek satışı gir (WhatsApp)",
            "İtalyan Keten Gömlek satış fiyatını 95 USD yap ve stoğa 10 adet ekle",
            "Müşteriler arasında Selin'i ara ve telefon numarasını güncelle"
          ]
        };

        return {
          content: [
            {
              type: "text",
              text: `${mascotBanner}\n\n${JSON.stringify(helpGuide, null, 2)}`
            }
          ]
        };
      }

      case "get_inventory": {
        const queryParams = new URLSearchParams();
        if (toolArgs.category) queryParams.set("category", String(toolArgs.category));
        if (toolArgs.low_stock_only) queryParams.set("lowStockOnly", "true");
        if (toolArgs.limit) queryParams.set("limit", String(toolArgs.limit));

        const result = await apiRequest(`/products?${queryParams.toString()}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "search_product": {
        const query = String(toolArgs.query || "");
        const result = await apiRequest(`/products?search=${encodeURIComponent(query)}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "add_product": {
        const result = await apiRequest("/products", {
          method: "POST",
          body: JSON.stringify(toolArgs)
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "update_product": {
        const { id, ...updates } = toolArgs;
        if (!id) throw new Error("Product 'id' is required to update.");
        const result = await apiRequest(`/products/${encodeURIComponent(String(id))}`, {
          method: "PATCH",
          body: JSON.stringify(updates)
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "adjust_stock": {
        const { id, quantityChange, reason, note } = toolArgs;
        if (!id) throw new Error("Product 'id' is required.");
        const result = await apiRequest(`/products/${encodeURIComponent(String(id))}/stock`, {
          method: "PATCH",
          body: JSON.stringify({ quantityChange, reason, note })
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "delete_product": {
        const { id } = toolArgs;
        if (!id) throw new Error("Product 'id' is required to delete.");
        const result = await apiRequest(`/products/${encodeURIComponent(String(id))}`, {
          method: "DELETE"
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "record_sale": {
        const result = await apiRequest("/sales", {
          method: "POST",
          body: JSON.stringify(toolArgs)
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "cancel_sale": {
        const { id } = toolArgs;
        if (!id) throw new Error("Sale order 'id' is required to cancel.");
        const result = await apiRequest(`/sales/${encodeURIComponent(String(id))}/cancel`, {
          method: "POST"
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "get_sales_report": {
        const period = String(toolArgs.period || "today");
        const result = await apiRequest(`/reports/summary?period=${encodeURIComponent(period)}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "list_customers": {
        const queryParams = new URLSearchParams();
        if (toolArgs.search) queryParams.set("search", String(toolArgs.search));
        if (toolArgs.limit) queryParams.set("limit", String(toolArgs.limit));

        const result = await apiRequest(`/customers?${queryParams.toString()}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "add_customer": {
        const result = await apiRequest("/customers", {
          method: "POST",
          body: JSON.stringify(toolArgs)
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "update_customer": {
        const { id, ...updates } = toolArgs;
        if (!id) throw new Error("Customer 'id' is required to update.");
        const result = await apiRequest(`/customers/${encodeURIComponent(String(id))}`, {
          method: "PATCH",
          body: JSON.stringify(updates)
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "delete_customer": {
        const { id } = toolArgs;
        if (!id) throw new Error("Customer 'id' is required to delete.");
        const result = await apiRequest(`/customers/${encodeURIComponent(String(id))}`, {
          method: "DELETE"
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool name: '${name}'`
            }
          ],
          isError: true
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool '${name}': ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start Stdio Transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Chirak MCP Server running on stdio.");
}

main().catch((error) => {
  console.error("Fatal error starting Chirak MCP Server:", error);
  process.exit(1);
});
