import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");

    if (!code) {
        return NextResponse.json(
            { valid: false, error: "招待コードが必要です" },
            { status: 400 }
        );
    }

    try {
        const supabase = getSupabaseAdmin();

        const { data: invitation, error } = await supabase
            .from("invitation_codes")
            .select(`
                id,
                code,
                max_uses,
                used_count,
                expires_at,
                org_id,
                organizations (
                    id,
                    name
                )
            `)
            .eq("code", code.toUpperCase())
            .single();

        if (error || !invitation) {
            return NextResponse.json(
                { valid: false, error: "招待コードが見つかりません" },
                { status: 404 }
            );
        }

        // Check expiry
        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json(
                { valid: false, error: "招待リンクの有効期限が切れています" },
                { status: 410 }
            );
        }

        // Check usage limit
        if (invitation.max_uses && invitation.used_count >= invitation.max_uses) {
            return NextResponse.json(
                { valid: false, error: "招待リンクの使用回数上限に達しました" },
                { status: 410 }
            );
        }

        // Handle organizations as array from join
        const orgs = invitation.organizations as unknown as { id: string; name: string }[] | null;
        const org = Array.isArray(orgs) ? orgs[0] : orgs;

        return NextResponse.json({
            valid: true,
            name: org?.name || "組織",
            orgId: invitation.org_id,
        });
    } catch (error) {
        console.error("Verify error:", error);
        return NextResponse.json(
            { valid: false, error: "招待コードの確認に失敗しました" },
            { status: 500 }
        );
    }
}
