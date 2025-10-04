# chrono-mcp

MCP (Model Context Protocol) server for parsing natural language date/time expressions using chrono-node.

## Features

- 🌍 Timezone-aware parsing with simple offset values
- 📅 Supports relative dates, absolute dates, and date ranges
- 🔄 Configurable reference date and forward/backward preference
- 🎯 Returns both certain and implied components
- ⚡ Stateless HTTP transport for Cloudflare Workers

## Deployment

This server is designed to be deployed on Cloudflare Workers with Routes:

```bash
# Install dependencies
bun install

# Type check
bun run type-check

# Run tests
bun test

# Deploy to Cloudflare
bun run deploy
```

## MCP Tool: chrono_parse

### Query Parameters

You can set a default timezone offset for all requests using a query parameter:

```
POST https://mcp.srz.me/chrono?timezone_offset=540
```

**Benefits:**
- The default value will be used if `timezone_offset` is not specified in tool arguments
- Tool description and parameter hints are automatically updated to reflect the current default
- Example: When `?timezone_offset=540` is set, the tool description shows: "Default timezone: +09:00 (540 minutes from UTC)"

### Input Parameters

#### Required
- **`text`** (string): Text containing date/time expressions to parse

#### Optional
- **`reference`** (string): Reference date/time as ISO 8601 string
  - Example: `"2025-10-05T10:00:00Z"` or `"2025-10-05T10:00:00+09:00"`
  - Default: Current time

- **`timezone_offset`** (number): Timezone offset in minutes from UTC
  - Example: `540` for JST (+09:00), `-300` for EST (-05:00)
  - Default: Query parameter value, or `0` (UTC)

- **`forwardOnly`** (boolean): Prefer future dates when ambiguous
  - Default: `true`

- **`mode`** (enum: `"first"` | `"all"`): Parse mode
  - `"first"`: Return first match only (default)
  - `"all"`: Return all matches

### Output Schema

```typescript
{
  results: [
    {
      text: string              // Matched text
      isRange: boolean
      start: {
        iso: string             // ISO 8601 in specified timezone
        unix: number            // Unix timestamp (ms)
        timezoneOffset: number | null
        certain: string[]       // Explicit components
        implied: string[]       // Filled-in components
      }
      end?: { ... }             // For ranges
    }
  ]
  summary: string               // Brief description
}
```

### Example Usage

#### Basic parsing
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "chrono_parse",
    "arguments": {
      "text": "tomorrow at 3pm"
    }
  }
}
```

#### With timezone offset in arguments
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "chrono_parse",
    "arguments": {
      "text": "明日の17時",
      "reference": "2025-10-05T10:00:00+09:00",
      "timezone_offset": 540
    }
  }
}
```

#### With timezone offset in query parameter
```bash
# Set default timezone_offset via query parameter
POST https://mcp.srz.me/chrono?timezone_offset=540

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "chrono_parse",
    "arguments": {
      "text": "明日の17時"
      // timezone_offset not specified, uses query parameter default (540)
    }
  }
}
```

#### Parse all matches
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "chrono_parse",
    "arguments": {
      "text": "Meeting on Monday at 10am and deadline on Friday at 5pm",
      "mode": "all",
      "timezone_offset": 540
    }
  }
}
```

#### Date range
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "chrono_parse",
    "arguments": {
      "text": "from Monday to Friday",
      "timezone_offset": 0
    }
  }
}
```

## Timezone Offset Reference

| Region | Offset (minutes) | UTC Offset |
|--------|-----------------|------------|
| JST (Japan) | 540 | +09:00 |
| EST (US Eastern) | -300 | -05:00 |
| PST (US Pacific) | -480 | -08:00 |
| UTC | 0 | +00:00 |
| IST (India) | 330 | +05:30 |
| ACST (Australia Central) | 570 | +09:30 |

## Routes Configuration

The server is configured to run at `https://mcp.srz.me/chrono*` using Cloudflare Routes.

## License

MIT
