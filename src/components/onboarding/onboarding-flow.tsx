"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
    action?: string;
}

const onboardingSteps: OnboardingStep[] = [
    {
        id: "welcome",
        title: "ようこそ！",
        description: "このアプリの使い方を説明します。",
        isCompleted: true,
    },
    {
        id: "profile",
        title: "プロフィール設定",
        description: "緊急連絡先と基本情報を登録してください。",
        isCompleted: false,
        action: "設定する",
    },
    {
        id: "rules",
        title: "就業規則の確認",
        description: "就業規則を読んで、確認ボタンを押してください。",
        isCompleted: false,
        action: "確認する",
    },
    {
        id: "shift",
        title: "シフト希望の提出",
        description: "来週のシフト希望を提出してください。",
        isCompleted: false,
        action: "提出する",
    },
    {
        id: "complete",
        title: "準備完了！",
        description: "これで初期設定は完了です。何か質問があればいつでもどうぞ。",
        isCompleted: false,
    },
];

export function OnboardingFlow() {
    const [steps] = useState<OnboardingStep[]>(onboardingSteps);
    const [currentStep, setCurrentStep] = useState(1);

    const completedCount = steps.filter(s => s.isCompleted).length;
    const progress = (completedCount / steps.length) * 100;

    return (
        <div className="space-y-6">
            {/* Progress */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">初期設定</span>
                    <span className="text-sm text-gray-500">{completedCount}/{steps.length}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className={cn(
                            "p-4 rounded-xl border transition-all",
                            step.isCompleted
                                ? "bg-green-50 border-green-200"
                                : index === currentStep
                                    ? "bg-blue-50 border-blue-200"
                                    : "bg-gray-50 border-gray-200"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
                                step.isCompleted
                                    ? "bg-green-500 text-white"
                                    : index === currentStep
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-300 text-gray-600"
                            )}>
                                {step.isCompleted ? "✓" : index + 1}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-gray-900">{step.title}</div>
                                <div className="text-sm text-gray-600">{step.description}</div>
                                {step.action && !step.isCompleted && index === currentStep && (
                                    <button
                                        onClick={() => setCurrentStep(curr => curr + 1)}
                                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        {step.action} →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Compact version for dashboard
export function OnboardingProgress() {
    // TODO: Get actual values from API/props
    let completedCount = 1;
    let totalCount = 5;
    const progress = (completedCount / totalCount) * 100;

    if (completedCount >= totalCount) return null;

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-900">初期設定を完了してください</span>
                <span className="text-sm text-blue-700">{completedCount}/{totalCount}</span>
            </div>
            <div className="h-2 bg-blue-200 rounded-full overflow-hidden mb-2">
                <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <button className="text-sm text-blue-700 hover:text-blue-800 font-medium">
                続きを行う →
            </button>
        </div>
    );
}
