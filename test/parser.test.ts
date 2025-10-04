import { describe, test, expect } from "bun:test";
import { parseDateTime } from "../src/chrono/parser.ts";

describe("chrono parser", () => {
  describe("basic parsing", () => {
    test("parses tomorrow with timezone offset", () => {
      const result = parseDateTime({
        text: "tomorrow at 5pm",
        reference: "2025-10-04T10:00:00+09:00",
        timezone_offset: 540, // JST
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].start.iso).toContain("2025-10-05T17:00:00");
    });

    test("parses absolute date", () => {
      const result = parseDateTime({
        text: "2025-03-15 14:30",
        timezone_offset: 0, // UTC
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].start.iso).toContain("2025-03-15T14:30:00");
      expect(result.results[0].isRange).toBe(false);
    });

    test("parses date range", () => {
      const result = parseDateTime({
        text: "Monday to Friday",
        reference: "2025-10-04T10:00:00Z",
        forwardOnly: true,
        timezone_offset: 0,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].isRange).toBe(true);
      expect(result.results[0].start).toBeDefined();
      expect(result.results[0].end).toBeDefined();
    });
  });

  describe("timezone handling", () => {
    test("handles timezone offset", () => {
      const result = parseDateTime({
        text: "next Friday 3pm",
        reference: "2025-10-04T10:00:00+09:00",
        timezone_offset: 540,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].start.iso).toContain("+09:00");
    });

    test("defaults to UTC when no offset specified", () => {
      const result = parseDateTime({
        text: "tomorrow noon",
        reference: "2025-10-04T10:00:00Z",
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].start.iso).toContain("+00:00");
    });

    test("handles negative offset (EST)", () => {
      const result = parseDateTime({
        text: "tomorrow 9am",
        reference: "2025-10-04T10:00:00-05:00",
        timezone_offset: -300, // EST
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].start.iso).toContain("-05:00");
    });

    test("handles half-hour offset (IST)", () => {
      const result = parseDateTime({
        text: "tomorrow 9am",
        reference: "2025-10-04T10:00:00+05:30",
        timezone_offset: 330, // IST
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].start.iso).toContain("+05:30");
    });
  });

  describe("parsing modes", () => {
    test("first mode returns only first match", () => {
      const result = parseDateTime({
        text: "Monday 10am and Wednesday 2pm",
        mode: "first",
        timezone_offset: 0,
      });

      expect(result.results).toHaveLength(1);
    });

    test("all mode returns all matches", () => {
      const result = parseDateTime({
        text: "Monday 10am and Wednesday 2pm",
        mode: "all",
        timezone_offset: 0,
      });

      expect(result.results.length).toBeGreaterThan(1);
    });
  });

  describe("component extraction", () => {
    test("identifies certain vs implied components", () => {
      const result = parseDateTime({
        text: "March 15",
        reference: "2025-01-01T00:00:00Z",
        timezone_offset: 0,
      });

      expect(result.results).toHaveLength(1);

      const { certain, implied } = result.results[0].start;

      // Month and day should be certain
      expect(certain).toContain("month");
      expect(certain).toContain("day");

      // Year, hour, minute, second should be implied
      expect(implied.length).toBeGreaterThan(0);
    });
  });

  describe("forward date preference", () => {
    test("forwardOnly=true prefers future dates", () => {
      const result = parseDateTime({
        text: "Friday",
        reference: "2025-10-04T10:00:00Z", // Saturday
        forwardOnly: true,
        timezone_offset: 0,
      });

      expect(result.results).toHaveLength(1);
      const parsed = new Date(result.results[0].start.iso);
      const ref = new Date("2025-10-04T10:00:00Z");
      expect(parsed.getTime()).toBeGreaterThan(ref.getTime());
    });
  });

  describe("error handling", () => {
    test("throws on missing text", () => {
      expect(() => {
        parseDateTime({ text: "" });
      }).toThrow();
    });

    test("returns empty results for unparseable text", () => {
      const result = parseDateTime({
        text: "xyz abc qwerty",
        timezone_offset: 0,
      });

      expect(result.results).toHaveLength(0);
      expect(result.summary).toContain("No date/time expressions found");
    });

    test("handles empty reference gracefully", () => {
      const result = parseDateTime({
        text: "tomorrow",
        reference: "",
      });

      expect(result.results).toHaveLength(1);
      // Should use current time as reference
    });
  });

  describe("output format", () => {
    test("includes ISO, unix, and timezone offset", () => {
      const result = parseDateTime({
        text: "2025-10-05 12:00:00",
        timezone_offset: 540, // JST
      });

      expect(result.results).toHaveLength(1);

      const { start } = result.results[0];
      expect(start.iso).toBeDefined();
      expect(typeof start.iso).toBe("string");
      expect(start.unix).toBeDefined();
      expect(typeof start.unix).toBe("number");
      expect(start.timezoneOffset).toBeDefined();
    });

    test("generates appropriate summary", () => {
      const singleResult = parseDateTime({
        text: "tomorrow",
        timezone_offset: 0,
      });
      expect(singleResult.summary).toContain("Parsed:");

      const rangeResult = parseDateTime({
        text: "Monday to Friday",
        timezone_offset: 0,
      });
      expect(rangeResult.summary).toContain("range:");
    });
  });
});
