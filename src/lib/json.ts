import { z } from "zod";

/**
 * Safe JSON Parsing Utilities
 *
 * Provides type-safe JSON parsing with Zod validation
 * and error handling
 */

export interface ParseResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Safely parse JSON string with Zod schema validation
 * Returns a result object instead of throwing
 */
export function safeJsonParse<T>(
    jsonString: string | null | undefined,
    schema: z.ZodType<T>
): ParseResult<T> {
    if (!jsonString) {
        return {
            success: false,
            error: "Empty or null input",
        };
    }

    try {
        const parsed = JSON.parse(jsonString);
        const validated = schema.parse(parsed);
        return {
            success: true,
            data: validated,
        };
    } catch (error) {
        if (error instanceof SyntaxError) {
            return {
                success: false,
                error: `Invalid JSON: ${error.message}`,
            };
        }
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
            };
        }
        return {
            success: false,
            error: "Unknown parsing error",
        };
    }
}

/**
 * Parse JSON with schema validation, returning default on failure
 */
export function parseJsonOrDefault<T>(
    jsonString: string | null | undefined,
    schema: z.ZodType<T>,
    defaultValue: T
): T {
    const result = safeJsonParse(jsonString, schema);
    return result.success ? result.data! : defaultValue;
}

/**
 * Parse JSON without schema, with error logging
 * Returns null on failure
 */
export function parseJsonSafe<T = unknown>(
    jsonString: string | null | undefined,
    logErrors = true
): T | null {
    if (!jsonString) {
        return null;
    }

    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        if (logErrors) {
            console.error("JSON parse error:", error);
        }
        return null;
    }
}

/**
 * Parse OpenAI response content as JSON with schema validation
 * Handles common OpenAI response edge cases
 */
export function parseOpenAIResponse<T>(
    content: string | null | undefined,
    schema: z.ZodType<T>
): ParseResult<T> {
    if (!content) {
        return {
            success: false,
            error: "Empty response content from OpenAI",
        };
    }

    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : content;

    return safeJsonParse(jsonString, schema);
}

/**
 * Parse JSON with fallback values for required fields
 * Useful when API might return partial data
 */
export function parseJsonWithDefaults<T extends object>(
    jsonString: string | null | undefined,
    defaults: T
): T {
    if (!jsonString) {
        return defaults;
    }

    try {
        const parsed = JSON.parse(jsonString);
        return { ...defaults, ...parsed };
    } catch {
        return defaults;
    }
}
