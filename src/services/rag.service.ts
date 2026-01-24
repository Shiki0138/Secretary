import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateEmbedding, answerWithRAG, type DocumentChunk } from "@/core/rag-engine";

/**
 * RAG Service
 * Handles document chunking, embedding, and semantic search
 */

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

// Split text into overlapping chunks
function splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + CHUNK_SIZE, text.length);
        chunks.push(text.slice(start, end));
        start = end - CHUNK_OVERLAP;
        if (start + CHUNK_OVERLAP >= text.length) break;
    }

    return chunks;
}

// Index a document for RAG
export async function indexDocument(
    orgId: string,
    documentId: string,
    documentTitle: string,
    content: string
): Promise<void> {
    const supabase = getSupabaseAdmin();

    // Delete existing chunks
    await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", documentId);

    // Split into chunks
    const chunks = splitIntoChunks(content);

    // Generate embeddings and insert
    for (let i = 0; i < chunks.length; i++) {
        const embedding = await generateEmbedding(chunks[i]);

        await supabase
            .from("document_chunks")
            .insert({
                org_id: orgId,
                document_id: documentId,
                chunk_index: i,
                content: chunks[i],
                embedding: embedding as unknown as string, // pgvector format
                metadata: { title: documentTitle },
            });
    }
}

// Search for relevant chunks using vector similarity
export async function searchDocuments(
    orgId: string,
    query: string,
    limit = 5
): Promise<DocumentChunk[]> {
    const supabase = getSupabaseAdmin();

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Vector similarity search using pgvector
    const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        p_org_id: orgId,
    });

    if (error) {
        console.error("Vector search error:", error);
        // Fallback to text search
        return fallbackTextSearch(orgId, query, limit);
    }

    return (data || []).map((item: { id: string; document_id: string; content: string; similarity: number; metadata: { title: string } }) => ({
        id: item.id,
        documentId: item.document_id,
        documentTitle: item.metadata?.title || "Unknown",
        content: item.content,
        similarity: item.similarity,
    }));
}

// Escape special characters for ILIKE pattern matching
// Prevents SQL injection through pattern special chars
function escapeIlikePattern(pattern: string): string {
    return pattern
        .replace(/\\/g, "\\\\") // Escape backslashes first
        .replace(/%/g, "\\%")    // Escape percent
        .replace(/_/g, "\\_")    // Escape underscore
        .replace(/'/g, "''");    // Escape single quotes
}

// Fallback text search if vector search fails
async function fallbackTextSearch(
    orgId: string,
    query: string,
    limit: number
): Promise<DocumentChunk[]> {
    const supabase = getSupabaseAdmin();

    // Simple text search with sanitized keywords
    const keywords = query
        .split(/\s+/)
        .filter(k => k.length > 1)
        .map(escapeIlikePattern);

    let queryBuilder = supabase
        .from("document_chunks")
        .select("id, document_id, content, metadata")
        .eq("org_id", orgId)
        .limit(limit);

    // Add text filters with escaped patterns
    for (const keyword of keywords.slice(0, 3)) {
        queryBuilder = queryBuilder.ilike("content", `%${keyword}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    type ChunkRow = { id: string; document_id: string; content: string; metadata: unknown };
    return ((data || []) as ChunkRow[]).map((item: ChunkRow) => ({
        id: item.id,
        documentId: item.document_id,
        documentTitle: (item.metadata as Record<string, string>)?.title || "Unknown",
        content: item.content,
        similarity: 0.5, // Fixed score for text search
    }));
}

// Answer a question using RAG
export async function answerQuestion(
    orgId: string,
    question: string
) {
    // Search for relevant documents
    const relevantChunks = await searchDocuments(orgId, question);

    // Get answer with references
    return answerWithRAG(question, relevantChunks);
}
