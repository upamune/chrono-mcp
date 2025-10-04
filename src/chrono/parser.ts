import * as chrono from "chrono-node";
import type {
  ChronoParseInput,
  ChronoParseOutput,
  ParseResult,
  ParsedDateTime,
} from "./types.ts";

/**
 * Convert reference to Date object
 */
function normalizeReference(ref: string | undefined): Date {
  if (!ref || ref.trim() === "") {
    return new Date();
  }

  const parsed = new Date(ref);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid reference date: ${ref}`);
  }
  return parsed;
}

/**
 * Extract certain and implied components from ParsedComponents
 */
function extractComponents(components: chrono.ParsedComponents): {
  certain: string[];
  implied: string[];
} {
  const allKeys = [
    "year",
    "month",
    "day",
    "hour",
    "minute",
    "second",
    "millisecond",
    "timezoneOffset",
  ] as const;

  const certain: string[] = [];
  const implied: string[] = [];

  for (const key of allKeys) {
    if (components.isCertain(key)) {
      certain.push(key);
    } else if (components.get(key) !== null) {
      implied.push(key);
    }
  }

  return { certain, implied };
}

/**
 * Convert Date to ISO string with specific timezone offset
 */
function toISOWithOffset(date: Date, offsetMinutes: number): string {
  // Calculate UTC time
  const utcTime = date.getTime();

  // Apply output timezone offset
  const localTime = new Date(utcTime + offsetMinutes * 60 * 1000);

  const year = localTime.getUTCFullYear();
  const month = String(localTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(localTime.getUTCDate()).padStart(2, "0");
  const hour = String(localTime.getUTCHours()).padStart(2, "0");
  const minute = String(localTime.getUTCMinutes()).padStart(2, "0");
  const second = String(localTime.getUTCSeconds()).padStart(2, "0");
  const ms = String(localTime.getUTCMilliseconds()).padStart(3, "0");

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetMins = String(absOffset % 60).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}${sign}${offsetHours}:${offsetMins}`;
}

/**
 * Convert ParsedResult to ParsedDateTime
 */
function convertParsedComponent(
  component: chrono.ParsedComponents,
  outputOffset: number
): ParsedDateTime {
  const date = component.date();
  const { certain, implied } = extractComponents(component);

  return {
    iso: toISOWithOffset(date, outputOffset),
    unix: date.getTime(),
    timezoneOffset: component.get("timezoneOffset"),
    certain,
    implied,
  };
}

/**
 * Parse natural language date/time expressions using chrono-node
 */
export function parseDateTime(input: ChronoParseInput): ChronoParseOutput {
  // Validate input
  if (!input.text || typeof input.text !== "string") {
    throw new Error("text is required and must be a string");
  }

  // Normalize inputs
  const refDate = normalizeReference(input.reference);
  const timezoneOffset = input.timezone_offset ?? 0;
  const forwardDate = input.forwardOnly ?? true;

  // Parse with chrono
  const reference: chrono.ParsingReference = {
    instant: refDate,
    timezone: timezoneOffset,
  };

  const options: chrono.ParsingOption = {
    forwardDate,
  };

  const parseResults =
    input.mode === "all"
      ? chrono.parse(input.text, reference, options)
      : chrono.parse(input.text, reference, options).slice(0, 1);

  if (parseResults.length === 0) {
    return {
      results: [],
      summary: "No date/time expressions found",
    };
  }

  // Convert results
  const results: ParseResult[] = parseResults.map((result) => {
    const isRange = !!result.end;

    const parsedResult: ParseResult = {
      text: result.text,
      isRange,
      start: convertParsedComponent(result.start, timezoneOffset),
    };

    if (result.end) {
      parsedResult.end = convertParsedComponent(result.end, timezoneOffset);
    }

    return parsedResult;
  });

  // Generate summary
  const summary =
    results.length === 1
      ? results[0].isRange
        ? `Parsed range: ${results[0].start.iso} to ${results[0].end?.iso}`
        : `Parsed: ${results[0].start.iso}`
      : `Parsed ${results.length} date/time expressions`;

  return {
    results,
    summary,
  };
}
