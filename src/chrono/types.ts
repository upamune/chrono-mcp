/**
 * Input schema for chrono_parse tool
 */
export interface ChronoParseInput {
  /** Text to parse for date/time expressions */
  text: string;

  /** Reference date/time as ISO 8601 string. Defaults to current time */
  reference?: string;

  /** Timezone offset in minutes from UTC (e.g., 540 for JST, -300 for EST). Defaults to 0 (UTC) */
  timezone_offset?: number;

  /** Prefer future dates when ambiguous (default: true) */
  forwardOnly?: boolean;

  /** Parse mode: "first" (default) or "all" */
  mode?: "first" | "all";
}

/**
 * Parsed date/time component
 */
export interface ParsedDateTime {
  /** ISO 8601 string in output timezone */
  iso: string;

  /** Unix timestamp in milliseconds */
  unix: number;

  /** Timezone offset in minutes (from input) */
  timezoneOffset: number | null;

  /** Components that were explicitly provided in the input */
  certain: string[];

  /** Components that were implied/filled-in by the parser */
  implied: string[];
}

/**
 * Single parse result
 */
export interface ParseResult {
  /** Original matched text */
  text: string;

  /** Whether this is a date range */
  isRange: boolean;

  /** Start date/time */
  start: ParsedDateTime;

  /** End date/time (only for ranges) */
  end?: ParsedDateTime;
}

/**
 * Output schema for chrono_parse tool
 */
export interface ChronoParseOutput {
  /** Array of parsed results */
  results: ParseResult[];

  /** Brief summary of the parse results */
  summary: string;
}

/**
 * Error codes for chrono parsing
 */
export enum ChronoErrorCode {
  BAD_REQUEST = "BAD_REQUEST",
  UNPARSABLE = "UNPARSABLE",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
