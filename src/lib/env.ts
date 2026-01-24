import { z } from "zod";

// Environment variables schema
export const envSchema = z.object({
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

    // OpenAI
    OPENAI_API_KEY: z.string().min(1),

    // LINE (optional for single-tenant mode, required for multi-tenant)
    LINE_CHANNEL_ID: z.string().min(1).optional(),
    LINE_CHANNEL_SECRET: z.string().min(1).optional(),
    LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1).optional(),

    // Encryption key for sensitive data
    ENCRYPTION_KEY: z.string().min(32).optional(),

    // Slack (optional)
    SLACK_BOT_TOKEN: z.string().min(1).optional(),
    SLACK_SIGNING_SECRET: z.string().min(1).optional(),
    SLACK_APP_TOKEN: z.string().min(1).optional(),

    // Node environment
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

// Cached validation result
let cachedEnv: Env | null = null;

// Validate environment variables at runtime
export function validateEnv(): Env {
    if (cachedEnv) {
        return cachedEnv;
    }

    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        console.error("Invalid environment variables:");
        Object.entries(errors).forEach(([key, messages]) => {
            console.error(`  ${key}: ${messages?.join(", ")}`);
        });

        // In production, throw error; in development, warn but continue
        if (process.env.NODE_ENV === "production") {
            throw new Error("Invalid environment variables");
        }

        console.warn("Continuing with partial environment in development mode");
    }

    cachedEnv = result.data ?? (process.env as unknown as Env);
    return cachedEnv;
}

// Get environment variable with type safety
export function getEnv<K extends keyof Env>(key: K): Env[K] {
    return process.env[key] as Env[K];
}

// Check if LINE is configured (either globally or per-tenant)
export function isLineConfigured(): boolean {
    return !!(
        process.env.LINE_CHANNEL_SECRET &&
        process.env.LINE_CHANNEL_ACCESS_TOKEN
    );
}

// Get LINE credentials from environment
export function getLineCredentials() {
    return {
        channelId: process.env.LINE_CHANNEL_ID,
        channelSecret: process.env.LINE_CHANNEL_SECRET,
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    };
}
