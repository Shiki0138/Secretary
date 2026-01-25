import { Suspense } from "react";
import { JoinPageClient } from "./client";

interface PageProps {
    params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: PageProps) {
    const { code } = await params;

    return (
        <Suspense fallback={
            <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100">
                <div className="text-gray-500">読み込み中...</div>
            </div>
        }>
            <JoinPageClient code={code} />
        </Suspense>
    );
}
