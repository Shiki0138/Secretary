import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/database.types";

/**
 * Shift Service
 * Handles all shift-related database operations
 */

export type Shift = Tables<"shifts">;

export async function getShiftsForUser(
    userId: string,
    startDate: string,
    endDate: string
): Promise<Shift[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", userId)
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .order("shift_date", { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function getShiftsForOrg(
    orgId: string,
    startDate: string,
    endDate: string
): Promise<Shift[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("org_id", orgId)
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .order("shift_date", { ascending: true });

    if (error) throw error;
    return data || [];
}

export interface ShiftRequest {
    date: string;
    preference: "full" | "morning" | "afternoon" | "off";
    notes?: string;
}

export async function submitShiftRequests(
    orgId: string,
    userId: string,
    requests: ShiftRequest[]
): Promise<Shift[]> {
    const supabase = getSupabaseAdmin();

    const shiftsToUpsert = requests.map(req => {
        let startTime: string | null = null;
        let endTime: string | null = null;

        switch (req.preference) {
            case "full":
                startTime = "09:00";
                endTime = "18:00";
                break;
            case "morning":
                startTime = "09:00";
                endTime = "13:00";
                break;
            case "afternoon":
                startTime = "13:00";
                endTime = "18:00";
                break;
            case "off":
                // null times for day off
                break;
        }

        return {
            org_id: orgId,
            user_id: userId,
            shift_date: req.date,
            start_time: startTime,
            end_time: endTime,
            status: "requested" as const,
            notes: req.notes || null,
        };
    });

    const { data, error } = await supabase
        .from("shifts")
        .upsert(shiftsToUpsert, { onConflict: "org_id,user_id,shift_date" })
        .select();

    if (error) throw error;
    return data || [];
}

export async function confirmShift(shiftId: string): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase
        .from("shifts")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", shiftId);
}

export async function bulkConfirmShifts(orgId: string, startDate: string, endDate: string): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase
        .from("shifts")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("org_id", orgId)
        .eq("status", "requested")
        .gte("shift_date", startDate)
        .lte("shift_date", endDate);
}
