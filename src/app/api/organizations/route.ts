import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function POST(request: NextRequest) {
    try {
        const { name, slug, ownerName } = await request.json();

        if (!name || !slug || !ownerName) {
            return NextResponse.json(
                { error: "必須項目が不足しています" },
                { status: 400 }
            );
        }

        // Get authenticated user from cookies
        const cookieStore = await cookies();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        // Create client with user's session
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    cookie: cookieStore.toString(),
                },
            },
        });

        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "認証が必要です" },
                { status: 401 }
            );
        }

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
                id: user.id,
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
