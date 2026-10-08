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

// Runtime API key validation is handled in apiRequest to allow introspection (tools/list) without prior config

// HTTP Helper
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const currentKey = process.env.CHIRAK_API_KEY || API_KEY;
  if (!currentKey) {
    throw new Error(
      "CHIRAK_API_KEY is not configured. Please supply your Chirak API key (starting with chk_live_) via environment variables or client settings."
    );
  }
  const currentBaseUrl = (process.env.CHIRAK_API_BASE_URL || API_BASE_URL).replace(/\/$/, "");
  const url = `${currentBaseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const headers: Record<string, string> = {
    "X-API-Key": currentKey,
    "Authorization": `ApiKey ${currentKey}`,
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
    },
    annotations: {
      readOnlyHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
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
    },
    annotations: {
      readOnlyHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
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
    },
    annotations: {
      readOnlyHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
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
    },
    annotations: {
      readOnlyHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
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
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: false
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
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
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
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
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: false
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
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
    },
    annotations: {
      destructiveHint: true,
      readOnlyHint: false
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
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
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: false
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
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
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
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
    },
    annotations: {
      readOnlyHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
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
    },
    annotations: {
      readOnlyHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
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
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: false
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
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
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
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
    },
    annotations: {
      destructiveHint: true,
      readOnlyHint: false
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
    }
  },
  {
    name: "list_documents",
    description: "Retrieve invoices, receipts, return invoices, and quote documents from Chirak store with optional filtering by type or status.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Optional filter by document type: 'invoice', 'receipt', 'return_invoice', 'proforma', or 'quote'."
        },
        status: {
          type: "string",
          description: "Optional filter by status: 'draft', 'issued', 'completed', or 'cancelled'."
        },
        sale_number: {
          type: "string",
          description: "Optional filter by associated order number (e.g. 'ORD-1004')."
        },
        limit: {
          type: "number",
          description: "Number of documents to return (default 50, max 100)."
        }
      }
    },
    annotations: {
      readOnlyHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
    }
  },
  {
    name: "get_document",
    description: "Fetch full details of an invoice or receipt including itemized rows, customer name, tax/VAT breakdown, and total amounts.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Document UUID or Document Number (e.g. '#INV-1001', '#FIS-1540')."
        }
      },
      required: ["id"]
    },
    annotations: {
      readOnlyHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
    }
  },
  {
    name: "create_document",
    description: "Create and issue a formal invoice, sales receipt, or quote in Chirak with itemized products, customer details, tax rates, and currency.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Document type: 'invoice' (Fatura), 'receipt' (Fiş), 'quote' (Teklif), 'proforma' (Proforma). Default is 'receipt'."
        },
        customer_name: {
          type: "string",
          description: "Customer or company title on the document."
        },
        items: {
          type: "array",
          description: "List of itemized products or services.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Product or item name." },
              quantity: { type: "number", description: "Quantity sold/billed." },
              price: { type: "number", description: "Unit price." },
              unit: { type: "string", description: "Optional unit (e.g. 'pcs', 'kg')." }
            },
            required: ["name", "quantity", "price"]
          }
        },
        tax_rate: {
          type: "number",
          description: "VAT / Tax percentage rate (e.g. 20 for 20%)."
        },
        tax_included: {
          type: "boolean",
          description: "Whether document prices/items include tax (default true for receipts, false for invoices)."
        },
        subtotal: {
          type: "number",
          description: "Optional subtotal before tax. Computed automatically if omitted."
        },
        tax_amount: {
          type: "number",
          description: "Optional tax amount. Computed automatically if omitted."
        },
        grand_total: {
          type: "number",
          description: "Total amount payable including tax."
        },
        currency: {
          type: "string",
          description: "Currency code (default 'USD', e.g. 'TRY', 'EUR')."
        },
        notes: {
          type: "string",
          description: "Optional notes, terms, or bank payment reference."
        },
        sale_number: {
          type: "string",
          description: "Optional linked order number (e.g. 'ORD-1004')."
        },
        status: {
          type: "string",
          description: "Status: 'completed', 'draft', or 'issued'. Default is 'completed'."
        }
      },
      required: ["items"]
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
    }
  },
  {
    name: "delete_document",
    description: "Permanently delete an invoice or receipt document from Chirak store.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Document UUID to delete."
        }
      },
      required: ["id"]
    },
    annotations: {
      destructiveHint: true,
      readOnlyHint: false
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
    }
  },
  {
    name: "export_document_text",
    description: "Render a clean, formatted ASCII text/thermal receipt layout of an invoice or receipt ready for display, printing, or sending as text.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Document UUID or Document Number."
        }
      },
      required: ["id"]
    },
    annotations: {
      readOnlyHint: true
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean", description: "Status of the tool execution." },
        data: { type: "object", description: "Result data payload from Chirak API." }
      }
    }
  }
];

// Initialize Server
const server = new Server(
  {
    name: "chirak-mcp-server",
    version: "1.2.1"
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
            documents: {
              list_documents: "Query invoice and receipt documents with filters.",
              get_document: "Fetch full itemized document details and VAT/tax totals.",
              create_document: "Create a new invoice, receipt, or quote document.",
              delete_document: "Remove a document from store records.",
              export_document_text: "Render a formatted text receipt ticket for display or printing."
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
            "Ahmet Bey için 2 adet Takım Elbise faturası kes ve fiş çıktısını ver",
            "Son kesilen faturanın detaylarını getir",
            "Selin Yılmaz'a 2 adet İtalyan Keten Gömlek satışı gir (WhatsApp)",
            "İtalyan Keten Gömlek satış fiyatını 95 USD yap ve stoğa 10 adet ekle"
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

      case "list_documents": {
        const queryParams = new URLSearchParams();
        if (toolArgs.type) queryParams.set("type", String(toolArgs.type));
        if (toolArgs.status) queryParams.set("status", String(toolArgs.status));
        if (toolArgs.sale_number) queryParams.set("saleNumber", String(toolArgs.sale_number));
        if (toolArgs.limit) queryParams.set("limit", String(toolArgs.limit));

        const result = await apiRequest(`/documents?${queryParams.toString()}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "get_document": {
        const docId = String(toolArgs.id || "");
        const result = await apiRequest(`/documents/${encodeURIComponent(docId)}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case "create_document": {
        const payload = {
          type: toolArgs.type || "receipt",
          customerName: toolArgs.customer_name || "Walk-in Customer",
          items: toolArgs.items || [],
          taxRate: toolArgs.tax_rate,
          taxIncluded: toolArgs.tax_included !== undefined ? Boolean(toolArgs.tax_included) : undefined,
          taxAmount: toolArgs.tax_amount,
          subtotal: toolArgs.subtotal,
          grandTotal: toolArgs.grand_total,
          currency: toolArgs.currency || "USD",
          notes: toolArgs.notes || "",
          saleNumber: toolArgs.sale_number,
          status: toolArgs.status || "completed"
        };
        const result = await apiRequest("/documents", {
          method: "POST",
          body: JSON.stringify(payload)
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

      case "delete_document": {
        const docId = String(toolArgs.id || "");
        const result = await apiRequest(`/documents/${encodeURIComponent(docId)}`, {
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

      case "export_document_text": {
        const docId = String(toolArgs.id || "");
        const result = await apiRequest(`/documents/${encodeURIComponent(docId)}`);
        const doc = result.document;
        if (!doc) {
          throw new Error(`Document '${docId}' not found.`);
        }

        const divider = "------------------------------------------";
        const doubleDivider = "==========================================";
        const itemsText = (doc.items || []).map((it: any) => {
          const qty = it.quantity || 1;
          const price = Number(it.price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });
          const total = (qty * Number(it.price || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 });
          return `${String(it.name || "Item").padEnd(24)} ${String(qty).padStart(3)} x ${price.padStart(6)} = ${total.padStart(8)}`;
        }).join("\n");

        const receiptText = [
          doubleDivider,
          `           CHIRAK STORE DOCUMENT`,
          `         ${String(doc.type || "RECEIPT").toUpperCase()}`,
          doubleDivider,
          `Document No : ${doc.documentNumber}`,
          `Order No    : ${doc.saleNumber || "N/A"}`,
          `Customer    : ${doc.customerName || "Walk-in Customer"}`,
          `Date        : ${new Date(doc.issueDate || doc.createdAt).toLocaleString()}`,
          `Status      : ${doc.status || "Completed"}`,
          divider,
          `Item                     Qty      Price     Total`,
          divider,
          itemsText,
          divider,
          `Subtotal    : ${Number(doc.subtotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${doc.currency}`,
          `Tax/VAT     : ${Number(doc.taxAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${doc.currency} (${doc.taxRate || 0}%)`,
          `GRAND TOTAL : ${Number(doc.grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${doc.currency}`,
          doubleDivider,
          doc.notes ? `Notes: ${doc.notes}\n${divider}` : "",
          `       Thank you for your business!`,
          doubleDivider
        ].filter(Boolean).join("\n");

        return {
          content: [
            {
              type: "text",
              text: receiptText
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
