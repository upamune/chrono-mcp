import { parseDateTime, ChronoErrorCode } from "../chrono/index.ts";

interface JSONRPCRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Cloudflare Workers fetch handler for MCP HTTP transport
 */
export default {
  async fetch(
    request: Request,
    _env: unknown,
    _ctx: ExecutionContext
  ): Promise<Response> {
    // Only handle POST requests to /chrono
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith("/chrono")) {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const body = (await request.json()) as JSONRPCRequest;

      // Validate JSON-RPC format
      if (body.jsonrpc !== "2.0") {
        return jsonrpcError(body.id, -32600, "Invalid Request");
      }

      // Extract timezone_offset from query parameter
      const timezoneOffsetParam = url.searchParams.get("timezone_offset");
      const defaultTimezoneOffset = timezoneOffsetParam
        ? parseInt(timezoneOffsetParam, 10)
        : undefined;

      const response = await handleMCPRequest(body, defaultTimezoneOffset);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error handling MCP request:", error);

      return jsonrpcError(
        undefined,
        -32603,
        error instanceof Error ? error.message : "Internal error"
      );
    }
  },
} satisfies ExportedHandler;

/**
 * Handle MCP JSON-RPC requests
 */
async function handleMCPRequest(
  request: JSONRPCRequest,
  defaultTimezoneOffset?: number
): Promise<JSONRPCResponse> {
  switch (request.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "chrono-mcp",
            version: "0.1.0",
          },
        },
      };

    case "tools/list": {
      // Build timezone offset description
      const timezoneOffsetDesc = defaultTimezoneOffset !== undefined
        ? `Timezone offset in minutes from UTC (e.g., 540 for JST/+09:00, -300 for EST/-05:00). Defaults to ${defaultTimezoneOffset} (from query parameter)`
        : "Timezone offset in minutes from UTC (e.g., 540 for JST/+09:00, -300 for EST/-05:00). Defaults to 0 (UTC)";

      // Build tool description
      let toolDescription = `Parse natural language date/time expressions into structured ISO/Unix timestamps.

Supports:
- Relative dates ("tomorrow", "next Friday", "in 3 days")
- Absolute dates ("March 15, 2024", "2024-03-15")
- Time expressions ("at 3pm", "15:30")
- Date ranges ("Monday to Friday", "Jan 1-15")

Returns certain (explicit) vs implied (filled-in) components to handle ambiguity.`;

      if (defaultTimezoneOffset !== undefined) {
        const offsetSign = defaultTimezoneOffset >= 0 ? "+" : "-";
        const absOffset = Math.abs(defaultTimezoneOffset);
        const hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        const mins = String(absOffset % 60).padStart(2, "0");
        toolDescription += `\n\nDefault timezone: ${offsetSign}${hours}:${mins} (${defaultTimezoneOffset} minutes from UTC)`;
      }

      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
            {
              name: "chrono_parse",
              description: toolDescription,
              inputSchema: {
                type: "object",
                properties: {
                  text: {
                    type: "string",
                    description: "Text containing date/time expressions to parse",
                  },
                  reference: {
                    type: "string",
                    description:
                      "Reference date/time as ISO 8601 string (e.g., '2025-10-05T10:00:00Z'). Defaults to current time",
                  },
                  timezone_offset: {
                    type: "number",
                    description: timezoneOffsetDesc,
                  },
                  forwardOnly: {
                    type: "boolean",
                    description:
                      "Prefer future dates when ambiguous. Defaults to true",
                  },
                  mode: {
                    type: "string",
                    enum: ["first", "all"],
                    description:
                      "Parse mode: 'first' for first match only, 'all' for all matches. Defaults to 'first'",
                  },
                },
                required: ["text"],
              },
            },
          ],
        },
      };
    }

    case "tools/call":
      if (!request.params || request.params.name !== "chrono_parse") {
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32602,
            message: "Unknown tool",
          },
        };
      }

      try {
        const args = request.params.arguments || {};

        // Apply default timezone_offset from query parameter if not specified in arguments
        if (args.timezone_offset === undefined && defaultTimezoneOffset !== undefined) {
          args.timezone_offset = defaultTimezoneOffset;
        }

        const result = parseDateTime(args);

        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";

        let code = -32603; // Internal error
        if (message.includes("required") || message.includes("Invalid")) {
          code = -32602; // Invalid params
        }

        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code,
            message,
          },
        };
      }

    case "notifications/initialized":
      // Acknowledgment, no response needed
      return {
        jsonrpc: "2.0",
        result: {},
      };

    default:
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32601,
          message: "Method not found",
        },
      };
  }
}

/**
 * Create a JSON-RPC error response
 */
function jsonrpcError(
  id: string | number | undefined,
  code: number,
  message: string
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
