import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import crypto from "crypto";

// 暗号学的に安全な招待コード生成
function generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(8);
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

export async function POST(request: NextRequest) {
    try {
        // 🔒 セッションから認証済みユーザーIDを取得（なりすまし防止）
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json(
                { error: "認証が必要です。ログインしてください。" },
                { status: 401 }
            );
        }

        const { name, slug, ownerName } = await request.json();

        if (!name || !slug || !ownerName) {
            return NextResponse.json(
                { error: "必須項目が不足しています" },
                { status: 400 }
            );
        }

        // 🔒 セッションから取得したユーザーIDを使用
        const authenticatedUserId = authUser.id;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        // Use service role for database operations
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Create organization
        const { data: org, error: orgError } = await supabaseAdmin
            .from("organizations")
            .insert({
                name,
                slug,
                plan: "free",
                max_employees: 5,
                uses_shared_line: true,
            })
            .select()
            .single();

        if (orgError) {
            console.error("Org creation error:", orgError);
            return NextResponse.json(
                { error: "組織の作成に失敗しました" },
                { status: 500 }
            );
        }

        // Create owner user record
        const { error: userError } = await supabaseAdmin
            .from("users")
            .insert({
                id: authenticatedUserId,
                org_id: org.id,
                display_name: ownerName,
                role: "owner",
            });

        if (userError) {
            console.error("User creation error:", userError);
            // Rollback org creation
            await supabaseAdmin.from("organizations").delete().eq("id", org.id);
            return NextResponse.json(
                { error: "ユーザーの作成に失敗しました" },
                { status: 500 }
            );
        }

        // Create invitation code
        const inviteCode = generateInviteCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

        const { error: inviteError } = await supabaseAdmin
            .from("invitation_codes")
            .insert({
                org_id: org.id,
                code: inviteCode,
                max_uses: 100,
                expires_at: expiresAt.toISOString(),
            });

        if (inviteError) {
            console.error("Invite code creation error:", inviteError);
        }

        return NextResponse.json({
            success: true,
            organization: {
                id: org.id,
                name: org.name,
                slug: org.slug,
            },
            inviteCode,
        });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}
