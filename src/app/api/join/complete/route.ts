import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
    try {
        const { code, name, lineUserId } = await request.json();

        if (!code || !name || !lineUserId) {
            return NextResponse.json(
                { error: "必須項目が不足しています" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Verify invitation code
        const { data: invitation, error: inviteError } = await supabase
            .from("invitation_codes")
            .select("id, org_id, max_uses, used_count, expires_at")
            .eq("code", code.toUpperCase())
            .single();

        if (inviteError || !invitation) {
            return NextResponse.json(
                { error: "無効な招待コードです" },
                { status: 400 }
            );
        }

        // Check expiry
        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json(
                { error: "招待リンクの有効期限が切れています" },
                { status: 410 }
            );
        }

        // Check usage limit
        if (invitation.max_uses && invitation.used_count >= invitation.max_uses) {
            return NextResponse.json(
                { error: "招待リンクの使用回数上限に達しました" },
                { status: 410 }
            );
        }

        // Check if LINE user already registered
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("line_user_id", lineUserId)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: "このLINEアカウントは既に登録されています" },
                { status: 409 }
            );
        }

        // Create user with generated UUID (LINE-only users don't have Supabase Auth)
        const userId = crypto.randomUUID();
        const { data: newUser, error: userError } = await supabase
            .from("users")
            .insert({
                id: userId,
                org_id: invitation.org_id,
                line_user_id: lineUserId,
                display_name: name,
                role: "employee",
            })
            .select()
            .single();

        if (userError) {
            console.error("User creation error:", userError);
            return NextResponse.json(
                { error: `ユーザー登録に失敗しました: ${userError.message}` },
                { status: 500 }
            );
        }

        // Increment invitation usage count
        await supabase
            .from("invitation_codes")
            .update({ used_count: invitation.used_count + 1 })
            .eq("id", invitation.id);

        return NextResponse.json({
            success: true,
            user: {
                id: newUser.id,
                name: newUser.display_name,
            },
        });
    } catch (error) {
        console.error("Join complete error:", error);
        return NextResponse.json(
            { error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}
