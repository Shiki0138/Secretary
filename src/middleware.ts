import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js Middleware for Authentication
 *
 * Protects API routes and pages requiring authentication.
 * Bypasses LINE webhook (has its own signature verification).
 */

// Paths that don't require authentication
const PUBLIC_PATHS = [
    "/",
    "/login",
    "/signup",
    "/api/line/webhook", // LINE webhook uses signature verification
    "/api/health",
];

// Development mode check
const isDevelopment = process.env.NODE_ENV === "development";

// API paths that require authentication
const PROTECTED_API_PATHS = [
    "/api/translate",
    "/api/analyze",
    "/api/announcements",
    "/api/shifts",
    "/api/documents",
    "/api/conversations",
    "/api/users",
];

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
}

function isProtectedApiPath(pathname: string): boolean {
    return PROTECTED_API_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    // Create a response that we'll potentially modify
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    // Check if this is a protected API path
    if (isProtectedApiPath(pathname)) {
        if (error || !user) {
            return new NextResponse(
                JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }

    // Check if accessing dashboard or employee pages
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/employee")) {
        // Allow demo mode with ?demo=true query parameter
        const isDemo = request.nextUrl.searchParams.get("demo") === "true";
        if (isDemo) {
            return response;
        }

        if (error || !user) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public directory)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
