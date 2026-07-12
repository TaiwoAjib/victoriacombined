import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { stylistService, StylistLeave } from "@/services/stylistService";
import { toast } from "sonner";

interface StylistLeaveManagerProps {
  stylistId: string;
}

export function StylistLeaveManager({ stylistId }: StylistLeaveManagerProps) {
  const [leaves, setLeaves] = useState<StylistLeave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [editingLeave, setEditingLeave] = useState<StylistLeave | null>(null);

  const fetchLeaves = async () => {
    try {
      const data = await stylistService.getLeaves(stylistId);
      setLeaves(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load time off records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [stylistId]);

  const handleAddLeave = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Please select a date range");
      return;
    }

    try {
      setIsAdding(true);
      // Send dates as YYYY-MM-DD strings to ensure they are interpreted as UTC midnight by the backend
      // and avoid timezone shifts (e.g. converting local midnight to previous day in UTC)
      await stylistService.addLeave(stylistId, {
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
        reason,
      });
      toast.success("Time off added successfully");
      setReason("");
      setDateRange(undefined);
      fetchLeaves();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add time off");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateLeave = async () => {
    if (!editingLeave || !dateRange?.from || !dateRange?.to) return;

    try {
      await stylistService.updateLeave(editingLeave.id, {
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
        reason,
      });
      
      toast.success("Time off updated successfully");
      setEditingLeave(null);
      setReason("");
      setDateRange(undefined);
      fetchLeaves();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update time off");
    }
  };

  const startEditing = (leave: StylistLeave) => {
    setEditingLeave(leave);
    setReason(leave.reason || "");
    // Parse dates back from string to Date object for the picker
    // Adjust for timezone to ensure they show up correctly in the picker
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const offset = start.getTimezoneOffset() * 60000;
    
    setDateRange({
        from: new Date(start.getTime() + offset),
        to: new Date(end.getTime() + offset)
    });
  };

  const cancelEditing = () => {
    setEditingLeave(null);
    setReason("");
    setDateRange(undefined);
  };

  const handleDeleteLeave = async (id: string) => {
    try {
      await stylistService.deleteLeave(id);
      toast.success("Time off removed");
      setLeaves(leaves.filter((l) => l.id !== id));
      if (editingLeave?.id === id) {
          cancelEditing();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove time off");
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    // Adjust UTC date to display correctly in local time (preventing day shift)
    const date = new Date(dateStr);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return format(adjustedDate, "MMM dd, yyyy");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium uppercase tracking-wide text-muted-foreground">
                {editingLeave ? "Edit Time Off" : "Add Time Off"}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 items-end">
            <div className="grid gap-2">
                <Label>Date Range</Label>
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                        dateRange.to ? (
                        <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                        </>
                        ) : (
                        format(dateRange.from, "LLL dd, y")
                        )
                    ) : (
                        <span>Pick a date range</span>
                    )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                    numberOfMonths={2}
                    />
                </PopoverContent>
                </Popover>
            </div>
            <div className="grid gap-2">
                <Label>Reason (Optional)</Label>
                <Input
                placeholder="e.g. Vacation, Sick Leave"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                />
            </div>
            </div>
            <div className="flex gap-2">
                {editingLeave ? (
                    <>
                        <Button 
                            onClick={handleUpdateLeave} 
                            disabled={!dateRange?.from || !dateRange?.to}
                            className="bg-gold hover:bg-gold-dark text-white"
                        >
                            Update Time Off
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={cancelEditing}
                        >
                            Cancel
                        </Button>
                    </>
                ) : (
                    <Button 
                        onClick={handleAddLeave} 
                        disabled={isAdding || !dateRange?.from || !dateRange?.to}
                        className="bg-gold hover:bg-gold-dark text-white"
                    >
                        {isAdding ? "Adding..." : "Add Time Off"}
                    </Button>
                )}
            </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Scheduled Time Off</h4>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : leaves.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No time off scheduled.</div>
        ) : (
          <div className="rounded-md border border-slate-800 bg-slate-950 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-slate-400 font-medium border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3 text-slate-300 font-medium">
                        {formatDateDisplay(leave.startDate)} - {formatDateDisplay(leave.endDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                        {leave.reason || <span className="text-slate-600 italic">No reason provided</span>}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/50"
                            onClick={() => startEditing(leave)}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                            onClick={() => handleDeleteLeave(leave.id)}
                        >
                            Delete
                        </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
