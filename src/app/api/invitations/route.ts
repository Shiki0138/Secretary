import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

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
            Prefer: options.method === "POST" ? "return=representation" : "return=minimal",
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

// 8文字の招待コードを生成（暗号学的に安全）
function generateInvitationCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい文字を除外
    const bytes = crypto.randomBytes(8);
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

// POST: 招待コードを発行
export async function POST(req: NextRequest) {
    try {
        // 🔒 認証チェック
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        // 🔒 スタッフは招待コード発行不可
        if (user.role === "staff") {
            return forbiddenResponse("Only owners/managers can create invitation codes");
        }

        const body = await req.json();
        const { expiresInHours = 24, isSingleUse = true } = body;

        // 🔒 自組織のコードのみ発行可能
        const orgId = user.orgId;

        // コード生成（重複チェック付き）
        let code: string;
        let attempts = 0;
        do {
            code = generateInvitationCode();
            const existing = await supabaseFetch(
                `/invitation_codes?code=eq.${code}&select=id`
            );
            if (!existing || existing.length === 0) break;
            attempts++;
        } while (attempts < 5);

        if (attempts >= 5) {
            return NextResponse.json({ error: "Failed to generate unique code" }, { status: 500 });
        }

        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

        const result = await supabaseFetch("/invitation_codes", {
            method: "POST",
            body: JSON.stringify({
                org_id: orgId,
                code,
                expires_at: expiresAt,
                is_single_use: isSingleUse,
                created_by: user.id,
                max_uses: isSingleUse ? 1 : 100,
            }),
        });

        return NextResponse.json({
            success: true,
            code,
            expiresAt,
            id: result?.[0]?.id,
        });
    } catch (error) {
        console.error("Error creating invitation code:", error);
        return NextResponse.json(
            { error: "Failed to create invitation code" },
            { status: 500 }
        );
    }
}



// GET: 発行済み招待コード一覧を取得
export async function GET(req: NextRequest) {
    try {
        // 🔒 認証チェック
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        // 🔒 スタッフは招待コード一覧閲覧不可
        if (user.role === "staff") {
            return forbiddenResponse("Only owners/managers can view invitation codes");
        }

        // 🔒 自組織のコードのみ取得可能
        const orgId = user.orgId;

        const codes = await supabaseFetch(
            `/invitation_codes?org_id=eq.${orgId}&order=created_at.desc&limit=20`
        );

        // 期限切れ・使用済みのステータスを付与
        const codesWithStatus = (codes || []).map((code: {
            id: string;
            code: string;
            expires_at: string | null;
            used_count: number;
            max_uses: number;
            is_single_use: boolean;
            created_at: string;
        }) => {
            const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
            const isUsed = code.is_single_use && code.used_count >= code.max_uses;
            return {
                ...code,
                status: isExpired ? "expired" : isUsed ? "used" : "active",
            };
        });

        return NextResponse.json({ codes: codesWithStatus });
    } catch (error) {
        console.error("Error fetching invitation codes:", error);
        return NextResponse.json(
            { error: "Failed to fetch invitation codes" },
            { status: 500 }
        );
    }
}

// DELETE: 招待コードを削除
export async function DELETE(req: NextRequest) {
    try {
        // 🔒 認証チェック
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        // 🔒 スタッフは招待コード削除不可
        if (user.role === "staff") {
            return forbiddenResponse("Only owners/managers can delete invitation codes");
        }

        const { searchParams } = new URL(req.url);
        const codeId = searchParams.get("id");

        if (!codeId) {
            return NextResponse.json({ error: "Code ID is required" }, { status: 400 });
        }

        // 🔒 自組織のコードのみ削除可能（コードの存在確認と組織チェック）
        const existing = await supabaseFetch(
            `/invitation_codes?id=eq.${codeId}&select=id,org_id`
        );

        if (!existing || existing.length === 0) {
            return NextResponse.json({ error: "Code not found" }, { status: 404 });
        }

        if (existing[0].org_id !== user.orgId) {
            return forbiddenResponse("Cannot delete invitation codes from other organizations");
        }

        await supabaseFetch(`/invitation_codes?id=eq.${codeId}`, {
            method: "DELETE",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting invitation code:", error);
        return NextResponse.json(
            { error: "Failed to delete invitation code" },
            { status: 500 }
        );
    }
}

