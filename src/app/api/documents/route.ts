import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { indexDocument } from "@/services/rag.service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

/**
 * Documents Upload API
 * 
 * Allows owners to upload and index documents for RAG
 */

const uploadDocumentSchema = z.object({
    title: z.string().min(1).max(200),
    docType: z.enum(["employment_rules", "salary_rules", "leave_policy", "other"]),
    content: z.string().min(10).max(100000),
});

// Create a new document
export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        // Only owners/managers can upload documents
        if (user.role === "staff") {
            return forbiddenResponse("ドキュメントを追加する権限がありません");
        }

        const body = await request.json();
        const parsed = uploadDocumentSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: "入力内容が正しくありません", details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { title, docType, content } = parsed.data;
        const supabase = getSupabaseAdmin();

        // Create document record
        const { data: doc, error: docError } = await supabase
            .from("documents")
            .insert({
                org_id: user.orgId,
                title,
                doc_type: docType,
                content,
                is_active: true,
                uploaded_by: user.id,
            })
            .select()
            .single();

        if (docError) {
            console.error("Document insert error:", docError);
            return NextResponse.json(
                { success: false, error: "ドキュメントの保存に失敗しました" },
                { status: 500 }
            );
        }

        // Index document for RAG (generate embeddings)
        try {
            await indexDocument(user.orgId, doc.id, title, content);
        } catch (indexError) {
            console.error("Indexing error:", indexError);
            // Document is saved, but indexing failed - continue anyway
        }

        return NextResponse.json({
            success: true,
            message: "ドキュメントを登録しました",
            data: {
                id: doc.id,
                title: doc.title,
                docType: doc.doc_type,
            },
        });
    } catch (error) {
        console.error("Upload document error:", error);
        return NextResponse.json(
            { success: false, error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}

// Get all documents for the organization
export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const supabase = getSupabaseAdmin();

        const { data: docs, error } = await supabase
            .from("documents")
            .select("id, title, doc_type, is_active, created_at, updated_at")
            .eq("org_id", user.orgId)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Get documents error:", error);
            return NextResponse.json(
                { success: false, error: "ドキュメントの取得に失敗しました" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                documents: docs || [],
            },
        });
    } catch (error) {
        console.error("Get documents error:", error);
        return NextResponse.json(
            { success: false, error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}

// Delete a document
export async function DELETE(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        // Only owners/managers can delete documents
        if (user.role === "staff") {
            return forbiddenResponse("ドキュメントを削除する権限がありません");
        }

        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get("id");

        if (!documentId) {
            return NextResponse.json(
                { success: false, error: "ドキュメントIDが指定されていません" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Soft delete (set is_active to false)
        const { error } = await supabase
            .from("documents")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", documentId)
            .eq("org_id", user.orgId);

        if (error) {
            console.error("Delete document error:", error);
            return NextResponse.json(
                { success: false, error: "ドキュメントの削除に失敗しました" },
                { status: 500 }
            );
        }

        // Also delete chunks
        await supabase
            .from("document_chunks")
            .delete()
            .eq("document_id", documentId);

        return NextResponse.json({
            success: true,
            message: "ドキュメントを削除しました",
        });
    } catch (error) {
        console.error("Delete document error:", error);
        return NextResponse.json(
            { success: false, error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}
