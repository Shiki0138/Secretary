import { NextRequest, NextResponse } from "next/server";

// Supabase fetch helper
async function supabaseFetch(path: string, options: RequestInit = {}) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase configuration missing");
    }

    const res = await fetch(`${supabaseUrl}/rest/v1${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: options.method === "POST" || options.method === "PATCH"
                ? "return=representation"
                : "return=minimal",
            ...options.headers,
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase error: ${res.status} ${text}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

// GET: 承認待ち従業員一覧を取得
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get("orgId");
        const status = searchParams.get("status") || "pending";

        if (!orgId) {
            return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
        }

        const registrations = await supabaseFetch(
            `/pending_registrations?org_id=eq.${orgId}&status=eq.${status}&order=created_at.desc`
        );

        return NextResponse.json({ registrations: registrations || [] });
    } catch (error) {
        console.error("Error fetching pending registrations:", error);
        return NextResponse.json(
            { error: "Failed to fetch pending registrations" },
            { status: 500 }
        );
    }
}

// POST: 従業員登録を承認または拒否
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { registrationId, action, processedBy, rejectionReason } = body;

        if (!registrationId || !action) {
            return NextResponse.json(
                { error: "Registration ID and action are required" },
                { status: 400 }
            );
        }

        if (!["approve", "reject"].includes(action)) {
            return NextResponse.json(
                { error: "Action must be 'approve' or 'reject'" },
                { status: 400 }
            );
        }

        // 承認待ち登録を取得
        const registrations = await supabaseFetch(
            `/pending_registrations?id=eq.${registrationId}&select=*`
        );

        if (!registrations || registrations.length === 0) {
            return NextResponse.json(
                { error: "Registration not found" },
                { status: 404 }
            );
        }

        const registration = registrations[0];

        if (registration.status !== "pending") {
            return NextResponse.json(
                { error: "Registration already processed" },
                { status: 400 }
            );
        }

        // ステータス更新
        const newStatus = action === "approve" ? "approved" : "rejected";
        await supabaseFetch(`/pending_registrations?id=eq.${registrationId}`, {
            method: "PATCH",
            body: JSON.stringify({
                status: newStatus,
                processed_at: new Date().toISOString(),
                processed_by: processedBy || null,
                rejection_reason: action === "reject" ? rejectionReason : null,
            }),
        });

        // 承認の場合、ユーザーを作成
        if (action === "approve") {
            await supabaseFetch("/users", {
                method: "POST",
                body: JSON.stringify({
                    org_id: registration.org_id,
                    line_user_id: registration.line_user_id,
                    display_name: registration.line_display_name || "従業員",
                    role: "staff",
                    is_active: true,
                }),
            });

            // TODO: LINEで従業員に通知（登録完了メッセージ）
        }

        return NextResponse.json({
            success: true,
            action,
            registrationId,
        });
    } catch (error) {
        console.error("Error processing registration:", error);
        return NextResponse.json(
            { error: "Failed to process registration" },
            { status: 500 }
        );
    }
}
