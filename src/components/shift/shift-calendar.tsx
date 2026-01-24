"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ShiftDay {
    date: string;
    dayOfWeek: string;
    startTime: string | null;
    endTime: string | null;
    status: "confirmed" | "requested" | "off";
}

// Mock data
const mockShifts: ShiftDay[] = [
    { date: "2026-01-27", dayOfWeek: "月", startTime: "09:00", endTime: "18:00", status: "confirmed" },
    { date: "2026-01-28", dayOfWeek: "火", startTime: "09:00", endTime: "18:00", status: "confirmed" },
    { date: "2026-01-29", dayOfWeek: "水", startTime: null, endTime: null, status: "off" },
    { date: "2026-01-30", dayOfWeek: "木", startTime: "09:00", endTime: "18:00", status: "confirmed" },
    { date: "2026-01-31", dayOfWeek: "金", startTime: "09:00", endTime: "17:00", status: "requested" },
    { date: "2026-02-01", dayOfWeek: "土", startTime: "09:00", endTime: "13:00", status: "confirmed" },
    { date: "2026-02-02", dayOfWeek: "日", startTime: null, endTime: null, status: "off" },
];

export function ShiftCalendar({ isEmployee = true }: { isEmployee?: boolean }) {
    const [shifts] = useState<ShiftDay[]>(mockShifts);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const getStatusStyle = (status: ShiftDay["status"]) => {
        switch (status) {
            case "confirmed":
                return "bg-blue-100 border-blue-300 text-blue-800";
            case "requested":
                return "bg-yellow-100 border-yellow-300 text-yellow-800";
            case "off":
                return "bg-gray-100 border-gray-200 text-gray-500";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                    {isEmployee ? "今週のシフト" : "シフト管理"}
                </h3>
                {isEmployee && (
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        希望を提出 →
                    </button>
                )}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {shifts.map((shift) => (
                    <button
                        key={shift.date}
                        onClick={() => setSelectedDate(shift.date)}
                        className={cn(
                            "p-3 rounded-xl border transition-all text-center",
                            getStatusStyle(shift.status),
                            selectedDate === shift.date && "ring-2 ring-blue-500"
                        )}
                    >
                        <div className="text-xs font-medium mb-1">{shift.dayOfWeek}</div>
                        <div className="text-lg font-bold">
                            {new Date(shift.date).getDate()}
                        </div>
                        {shift.startTime ? (
                            <div className="text-xs mt-1">
                                {shift.startTime}〜
                            </div>
                        ) : (
                            <div className="text-xs mt-1">休</div>
                        )}
                    </button>
                ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
                    確定
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
                    希望中
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
                    休み
                </div>
            </div>
        </div>
    );
}

// Shift request form for employees
export function ShiftRequestForm() {
    const [requests, setRequests] = useState<Record<string, string>>({});

    const dates = [
        { date: "2026-02-03", dayOfWeek: "月" },
        { date: "2026-02-04", dayOfWeek: "火" },
        { date: "2026-02-05", dayOfWeek: "水" },
        { date: "2026-02-06", dayOfWeek: "木" },
        { date: "2026-02-07", dayOfWeek: "金" },
        { date: "2026-02-08", dayOfWeek: "土" },
        { date: "2026-02-09", dayOfWeek: "日" },
    ];

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">来週のシフト希望</h3>
            <p className="text-sm text-gray-500">
                希望するシフトを選択してください。1月30日までに提出をお願いします。
            </p>

            <div className="space-y-2">
                {dates.map(({ date, dayOfWeek }) => (
                    <div key={date} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                        <div className="w-16">
                            <span className="font-medium">{dayOfWeek}</span>
                            <span className="text-sm text-gray-500 ml-1">
                                {new Date(date).getDate()}日
                            </span>
                        </div>
                        <select
                            value={requests[date] || ""}
                            onChange={(e) => setRequests({ ...requests, [date]: e.target.value })}
                            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">選択してください</option>
                            <option value="full">終日（9:00-18:00）</option>
                            <option value="morning">午前のみ（9:00-13:00）</option>
                            <option value="afternoon">午後のみ（13:00-18:00）</option>
                            <option value="off">お休み希望</option>
                        </select>
                    </div>
                ))}
            </div>

            <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                希望を提出する
            </button>
        </div>
    );
}
