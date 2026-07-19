import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isSameDay, startOfDay } from "date-fns";
import { DayPicker } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { bookingService, Booking, TimeSlot } from "@/services/bookingService";
import { stylistService } from "@/services/stylistService";
import { styleService, Style } from "@/services/styleService";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Calendar as CalendarIcon, CheckCircle, User, Plus, Pencil } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";


// ── Status colour ────────────────────────────────────────────────────────────
// Defined BEFORE it is used in renderBookingCard (fixes the critical const-hoisting crash)
const getStatusColor = (status: string) => {
  switch (status) {
    case "booked":       return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "checked_in":   return "bg-teal-100 text-teal-800 border-teal-200";
    case "in_progress":  return "bg-blue-100 text-blue-800 border-blue-200";
    case "completed":    return "bg-green-100 text-green-800 border-green-200";
    case "cancelled":    return "bg-red-100 text-red-800 border-red-200";
    default:             return "bg-gray-100 text-gray-800 border-gray-200";
  }
};


// ── Reschedule Dialog ────────────────────────────────────────────────────────
function RescheduleDialog({ booking, onReschedule }: { booking: Booking; onReschedule: (date: string, time: string) => void }) {
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [time, setTime] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [slots, setSlots] = useState<TimeSlot[]>([]);

    useEffect(() => {
        if (date && open) {
            const fetchAvailability = async () => {
                setLoading(true);
                try {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const duration = booking.duration || 60;
                    const availableSlots = await bookingService.getAvailability(
                        dateStr,
                        booking.styleId || undefined,
                        booking.categoryId || undefined,
                        booking.stylistId || undefined,
                        duration,
                        booking.id
                    );
                    setSlots(availableSlots);
                } catch (error) {
                    console.error(error);
                    toast.error("Failed to load availability");
                } finally {
                    setLoading(false);
                }
            };
            fetchAvailability();
        } else {
            setSlots([]);
        }
    }, [date, open, booking]);

    const handleConfirm = () => {
        if (date && time) {
            const dateStr = format(date, 'yyyy-MM-dd');
            onReschedule(dateStr, time);
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">Reschedule</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col w-[95vw]">
                <DialogHeader>
                    <DialogTitle>Reschedule Appointment</DialogTitle>
                    <DialogDescription>
                        Select a new date and time for {booking.customer?.fullName || 'Guest'}.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-1">
                <div className="grid gap-4 py-4">
                    <div className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => { setDate(d); setTime(null); }}
                            disabled={(d) => d < startOfDay(new Date())}
                            className="rounded-md border shadow-sm"
                        />
                    </div>
                    {date && (
                        <div className="space-y-2">
                             <h4 className="font-medium text-sm">Available Times ({format(date, 'MMM d')})</h4>
                             {loading ? (
                                 <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                             ) : slots.length === 0 ? (
                                 <div className="text-center text-sm text-muted-foreground">No available slots for this date.</div>
                             ) : (
                                 <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                                     {slots.map((slot) => (
                                         <Button
                                             key={slot.time}
                                             variant={time === slot.time ? "default" : "outline"}
                                             size="sm"
                                             onClick={() => setTime(slot.time)}
                                             disabled={!slot.available}
                                             className={!slot.available ? "opacity-50 cursor-not-allowed" : ""}
                                         >
                                             {format(parseISO(`2000-01-01T${slot.time}`), 'h:mm a')}
                                         </Button>
                                     ))}
                                 </div>
                             )}
                        </div>
                    )}
                </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!date || !time}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Edit Booking Dialog ──────────────────────────────────────────────────────
function EditBookingDialog({ booking, stylists, styles, onSave }: {
  booking: Booking;
  stylists: any[];
  styles: Style[];
  onSave: (id: string, data: any) => void;
}) {
    const [open, setOpen] = useState(false);
    const [selectedStyleId, setSelectedStyleId] = useState(booking.styleId || '');
    const [selectedCategoryId, setSelectedCategoryId] = useState(booking.categoryId || '');
    const [selectedStylistId, setSelectedStylistId] = useState(booking.stylistId || '');
    const [selectedStatus, setSelectedStatus] = useState(booking.status);
    const [notes, setNotes] = useState(booking.notes || '');
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [time, setTime] = useState<string | null>(null);
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setSelectedStyleId(booking.styleId || '');
            setSelectedCategoryId(booking.categoryId || '');
            setSelectedStylistId(booking.stylistId || '');
            setSelectedStatus(booking.status);
            setNotes(booking.notes || '');
            setDate(undefined);
            setTime(null);
            setSlots([]);
        }
    }, [open, booking]);

    // Fetch slots when date, style, or stylist changes inside edit dialog
    useEffect(() => {
        if (date && open && selectedCategoryId) {
            const fetchSlots = async () => {
                setLoadingSlots(true);
                try {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const slotList = await bookingService.getAvailability(
                        dateStr,
                        selectedStyleId || undefined,
                        selectedCategoryId || undefined,
                        (selectedStylistId && selectedStylistId !== '--select a stylist--') ? selectedStylistId : undefined,
                        undefined,
                        booking.id
                    );
                    setSlots(slotList);
                } catch {
                    setSlots([]);
                } finally {
                    setLoadingSlots(false);
                }
            };
            fetchSlots();
        } else {
            setSlots([]);
        }
    }, [date, open, selectedStyleId, selectedCategoryId, selectedStylistId, booking.id]);

    const availableVariations = () => {
        if (!selectedStyleId) return [];
        const style = styles.find(s => s.id === selectedStyleId);
        return style?.pricing?.map(p => ({
            id: p.categoryId,
            name: p.category.name,
        })) || [];
    };

    const handleSave = () => {
        const payload: any = {
            status: selectedStatus,
            notes,
        };
        if (selectedStyleId && selectedStyleId !== booking.styleId) payload.styleId = selectedStyleId;
        if (selectedCategoryId && selectedCategoryId !== booking.categoryId) payload.categoryId = selectedCategoryId;
        if (selectedStylistId !== (booking.stylistId || '')) payload.stylistId = selectedStylistId || '--select a stylist--';
        if (date && time) {
            payload.date = format(date, 'yyyy-MM-dd');
            payload.time = time;
        }
        onSave(booking.id, payload);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col w-[95vw]">
                <DialogHeader>
                    <DialogTitle>Edit Booking</DialogTitle>
                    <DialogDescription>
                        Update booking details for {booking.customer?.fullName || 'Guest'}.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-1 space-y-4 py-2">
                    {/* Status */}
                    <div className="space-y-1">
                        <Label>Status</Label>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="booked">Booked</SelectItem>
                                <SelectItem value="checked_in">Checked In</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Style */}
                    <div className="space-y-1">
                        <Label>Style</Label>
                        <Select value={selectedStyleId} onValueChange={(v) => { setSelectedStyleId(v); setSelectedCategoryId(''); }}>
                            <SelectTrigger><SelectValue placeholder="Select style..." /></SelectTrigger>
                            <SelectContent>
                                {styles.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Variation */}
                    {selectedStyleId && (
                        <div className="space-y-1">
                            <Label>Variation</Label>
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger><SelectValue placeholder="Select variation..." /></SelectTrigger>
                                <SelectContent>
                                    {availableVariations().map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Stylist */}
                    <div className="space-y-1">
                        <Label>Stylist</Label>
                        <Select value={selectedStylistId || '--select a stylist--'} onValueChange={setSelectedStylistId}>
                            <SelectTrigger><SelectValue placeholder="Select stylist..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="--select a stylist--">-- Unassigned --</SelectItem>
                                {stylists.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>{s.fullName || s.user?.fullName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Reschedule date */}
                    <div className="space-y-1">
                        <Label>Reschedule Date (optional)</Label>
                        <div className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => { setDate(d); setTime(null); }}
                                disabled={(d) => d < startOfDay(new Date())}
                                className="rounded-md border shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Time slots */}
                    {date && (
                        <div className="space-y-2">
                            <Label>Available Times ({format(date, 'MMM d')})</Label>
                            {loadingSlots ? (
                                <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
                            ) : slots.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center">No available slots.</p>
                            ) : (
                                <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto">
                                    {slots.map(slot => (
                                        <Button
                                            key={slot.time}
                                            size="sm"
                                            variant={time === slot.time ? 'default' : 'outline'}
                                            disabled={!slot.available}
                                            onClick={() => setTime(slot.time)}
                                        >
                                            {format(parseISO(`2000-01-01T${slot.time}`), 'h:mm a')}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Any internal notes..."
                            className="resize-none"
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Create Booking Dialog (Admin) ────────────────────────────────────────────
function CreateBookingDialog({ stylists, styles, onCreated }: {
  stylists: any[];
  styles: Style[];
  onCreated: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Customer mode
    const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');

    // Customer search (Existing)
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

    // New Customer details
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Service
    const [selectedStyleId, setSelectedStyleId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedStylistId, setSelectedStylistId] = useState('');

    // Date/time
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [time, setTime] = useState<string | null>(null);
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Notes / status
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('booked');

    const resetForm = () => {
        setCustomerMode('existing');
        setCustomerSearch('');
        setCustomers([]);
        setSelectedCustomer(null);
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setSelectedStyleId('');
        setSelectedCategoryId('');
        setSelectedStylistId('');
        setDate(undefined);
        setTime(null);
        setSlots([]);
        setNotes('');
        setStatus('booked');
    };

    useEffect(() => {
        if (!open) resetForm();
    }, [open]);

    // Debounced customer search
    useEffect(() => {
        const search = customerSearch.trim();
        if (search.length < 2) { setCustomers([]); return; }
        const timer = setTimeout(async () => {
            setLoadingCustomers(true);
            try {
                const result = await userService.getCustomers({ search, limit: 10 });
                setCustomers(result.data || []);
            } catch {
                setCustomers([]);
            } finally {
                setLoadingCustomers(false);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [customerSearch]);

    // Load slots when date + style + category are set
    useEffect(() => {
        if (!date || !selectedCategoryId) { setSlots([]); return; }
        const fetchSlots = async () => {
            setLoadingSlots(true);
            setTime(null);
            try {
                const slotList = await bookingService.getAvailability(
                    format(date, 'yyyy-MM-dd'),
                    selectedStyleId || undefined,
                    selectedCategoryId,
                    (selectedStylistId && selectedStylistId !== '--select a stylist--') ? selectedStylistId : undefined
                );
                setSlots(slotList);
            } catch {
                setSlots([]);
            } finally {
                setLoadingSlots(false);
            }
        };
        fetchSlots();
    }, [date, selectedStyleId, selectedCategoryId, selectedStylistId]);

    const availableVariations = () => {
        if (!selectedStyleId) return [];
        const style = styles.find(s => s.id === selectedStyleId);
        return style?.pricing?.map(p => ({ id: p.categoryId, name: p.category.name })) || [];
    };

    const handleCreate = async () => {
        if (customerMode === 'existing' && !selectedCustomer) { toast.error('Please select a customer'); return; }
        if (customerMode === 'new' && (!firstName || !lastName || !email || !phone)) { toast.error('Please fill all required new customer fields'); return; }
        if (!selectedCategoryId) { toast.error('Please select a variation'); return; }
        if (!date || !time) { toast.error('Please select a date and time'); return; }

        setSaving(true);
        try {
            await bookingService.createAdminBooking({
                customerId: customerMode === 'existing' ? selectedCustomer.id : undefined,
                guestDetails: customerMode === 'new' ? {
                    fullName: `${firstName} ${lastName}`.trim(),
                    email,
                    phone
                } : undefined,
                styleId: selectedStyleId || undefined,
                categoryId: selectedCategoryId,
                stylistId: (selectedStylistId && selectedStylistId !== '--select a stylist--') ? selectedStylistId : undefined,
                date: format(date, 'yyyy-MM-dd'),
                time,
                notes: notes || undefined,
                status,
            });
            const customerName = customerMode === 'existing' ? selectedCustomer.fullName : `${firstName} ${lastName}`;
            toast.success(`Booking created for ${customerName}`);
            setOpen(false);
            onCreated();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create booking');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" /> New Booking
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col w-[95vw]">
                <DialogHeader>
                    <DialogTitle>Create New Booking</DialogTitle>
                    <DialogDescription>
                        Manually create a booking for a customer. No payment required.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1 space-y-4 py-2">

                    {/* ── Customer Selection ── */}
                    <div className="space-y-4 border p-4 rounded-md bg-muted/5">
                        <RadioGroup 
                            value={customerMode} 
                            onValueChange={(v) => {
                                setCustomerMode(v as 'existing' | 'new');
                                if (v === 'new') {
                                    setSelectedCustomer(null);
                                    setCustomerSearch('');
                                }
                            }}
                            className="flex gap-4 mb-2"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="existing" id="mode-existing" />
                                <Label htmlFor="mode-existing">Existing Customer</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="new" id="mode-new" />
                                <Label htmlFor="mode-new">New Customer</Label>
                            </div>
                        </RadioGroup>

                        {customerMode === 'existing' ? (
                            <div className="space-y-2">
                                <Label>Select Customer <span className="text-red-500">*</span></Label>
                                {selectedCustomer ? (
                                    <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                        <div>
                                            <p className="font-medium text-sm">{selectedCustomer.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{selectedCustomer.email} • {selectedCustomer.phone || 'No phone'}</p>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}>
                                            Change
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Input
                                            placeholder="Search by name, email or phone..."
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                        />
                                        {loadingCustomers && (
                                            <div className="absolute right-3 top-2.5">
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            </div>
                                        )}
                                        {customers.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                {customers.map(c => (
                                                    <button
                                                        key={c.id}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                                        onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomers([]); }}
                                                    >
                                                        <span className="font-medium">{c.fullName}</span>
                                                        <span className="text-muted-foreground ml-2 text-xs">{c.email}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {customerSearch.length >= 2 && !loadingCustomers && customers.length === 0 && (
                                            <p className="text-xs text-muted-foreground mt-1">No customers found.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>First Name <span className="text-red-500">*</span></Label>
                                        <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Last Name <span className="text-red-500">*</span></Label>
                                        <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>Email <span className="text-red-500">*</span></Label>
                                    <Input value={email} type="email" onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
                                </div>
                                <div className="space-y-1">
                                    <Label>Phone <span className="text-red-500">*</span></Label>
                                    <Input value={phone} type="tel" onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Style ── */}
                    <div className="space-y-1">
                        <Label>Style</Label>
                        <Select value={selectedStyleId} onValueChange={v => { setSelectedStyleId(v); setSelectedCategoryId(''); }}>
                            <SelectTrigger><SelectValue placeholder="Select a style..." /></SelectTrigger>
                            <SelectContent>
                                {styles.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ── Variation ── */}
                    {selectedStyleId && (
                        <div className="space-y-1">
                            <Label>Variation <span className="text-red-500">*</span></Label>
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger><SelectValue placeholder="Select variation..." /></SelectTrigger>
                                <SelectContent>
                                    {availableVariations().map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* ── Stylist ── */}
                    <div className="space-y-1">
                        <Label>Braider</Label>
                        <Select value={selectedStylistId || '--select a stylist--'} onValueChange={setSelectedStylistId}>
                            <SelectTrigger><SelectValue placeholder="Select braider..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="--select a stylist--">-- Unassigned --</SelectItem>
                                {stylists
                                    .filter(s => !selectedStyleId || (s.styles && s.styles.some((st: any) => st.id === selectedStyleId)))
                                    .map((s: any) => (
                                        <SelectItem key={s.id} value={s.id}>{s.fullName || s.user?.fullName}</SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ── Date ── */}
                    <div className="space-y-1">
                        <Label>Date <span className="text-red-500">*</span></Label>
                        <div className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={d => { setDate(d); setTime(null); }}
                                disabled={d => d < startOfDay(new Date())}
                                className="rounded-md border shadow-sm"
                            />
                        </div>
                    </div>

                    {/* ── Time Slots ── */}
                    {date && (
                        <div className="space-y-2">
                            <Label>Time <span className="text-red-500">*</span></Label>
                            {!selectedCategoryId ? (
                                <p className="text-xs text-muted-foreground">Select a variation first to see available times.</p>
                            ) : loadingSlots ? (
                                <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
                            ) : slots.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center">No available slots for this date.</p>
                            ) : (
                                <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto">
                                    {slots.map(slot => (
                                        <Button
                                            key={slot.time}
                                            size="sm"
                                            variant={time === slot.time ? 'default' : 'outline'}
                                            disabled={!slot.available}
                                            onClick={() => setTime(slot.time)}
                                        >
                                            {format(parseISO(`2000-01-01T${slot.time}`), 'h:mm a')}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Status ── */}
                    <div className="space-y-1">
                        <Label>Initial Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="booked">Booked</SelectItem>
                                <SelectItem value="checked_in">Checked In</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ── Notes ── */}
                    <div className="space-y-1">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Any notes for this booking..."
                            className="resize-none"
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Create Booking
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Main Bookings Component ──────────────────────────────────────────────────
export default function Bookings() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  // Fetch all bookings
  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: bookingService.getBookings,
  });

  // Fetch all stylists for assignment
  const { data: stylistsResponse, isLoading: isLoadingStylists } = useQuery({
    queryKey: ["stylists"],
    queryFn: () => stylistService.getAllStylists({ limit: 100 }),
  });

  // Fetch all styles for create/edit dialogs
  const { data: stylesResponse, isLoading: isLoadingStyles } = useQuery({
    queryKey: ["styles-all"],
    queryFn: () => styleService.getAllStyles({ limit: 1000 }),
  });

  const stylists = Array.isArray(stylistsResponse?.data) ? stylistsResponse.data : [];
  const styles: Style[] = Array.isArray(stylesResponse?.data) ? stylesResponse.data : [];

  // Update Booking Mutation
  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      bookingService.updateBooking(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update booking");
    },
  });

  const formatBookingTimeDisplay = (bookingTime: string) => {
    try {
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(bookingTime)) {
        const [hh, mm] = bookingTime.split(":").map(Number);
        const d = new Date(0);
        d.setHours(hh, mm);
        return format(d, "h:mm a");
      }
      const d = new Date(bookingTime);
      const hours = d.getUTCHours();
      const minutes = d.getUTCMinutes();
      const local = new Date(0);
      local.setHours(hours, minutes);
      return format(local, "h:mm a");
    } catch {
      return bookingTime;
    }
  };

  const handleAssignStylist = (bookingId: string, stylistId: string) => {
    updateBookingMutation.mutate({ id: bookingId, data: { stylistId } });
  };

  const handleStatusChange = (bookingId: string, status: string) => {
    updateBookingMutation.mutate({ id: bookingId, data: { status } });
  };

  const handleEditSave = (bookingId: string, data: any) => {
    updateBookingMutation.mutate({ id: bookingId, data });
  };
  
  const handleReschedule = (bookingId: string, date: string, time: string) => {
      updateBookingMutation.mutate({ id: bookingId, data: { date, time } });
  };

  const handleBookingCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };

  // Filter bookings logic
  const getFilteredBookings = (type: 'upcoming' | 'completed') => {
    return bookings.filter((booking) => {
      const bookingDate = parseISO(booking.bookingDate);
      const isTodayOrFuture = bookingDate >= startOfDay(new Date());
      const isPast = bookingDate < startOfDay(new Date());
      const isCompletedOrCancelled = ['completed', 'cancelled'].includes(booking.status);

      if (date) {
        if (!isSameDay(bookingDate, date)) return false;
        if (type === 'upcoming') return !isCompletedOrCancelled;
        return isCompletedOrCancelled;
      }

      if (type === 'upcoming') return isTodayOrFuture && !isCompletedOrCancelled;
      return isPast || isCompletedOrCancelled;
    }).sort((a, b) => {
        const timeA = a.bookingTime && /^\d{2}:\d{2}/.test(a.bookingTime) ? a.bookingTime.substring(0,5) : "00:00";
        const timeB = b.bookingTime && /^\d{2}:\d{2}/.test(b.bookingTime) ? b.bookingTime.substring(0,5) : "00:00";
        const dateA = new Date(`${a.bookingDate}T${timeA}`).getTime();
        const dateB = new Date(`${b.bookingDate}T${timeB}`).getTime();
        return type === 'upcoming' ? dateA - dateB : dateB - dateA;
    });
  };

  const upcomingBookings = getFilteredBookings('upcoming');
  const completedBookings = getFilteredBookings('completed');

  // renderBookingCard uses getStatusColor which is now defined at module scope above
  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} className="overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center">
        {/* Time & Status Strip */}
        <div className={`p-4 md:w-48 flex flex-col justify-center items-center md:items-start border-b md:border-b-0 md:border-r bg-muted/30`}>
          {!date && (
            <span className="text-sm font-medium text-muted-foreground mb-1">
                {format(parseISO(booking.bookingDate), "MMM d")}
            </span>
          )}
          <span className="text-2xl font-bold">
            {formatBookingTimeDisplay(booking.bookingTime)}
          </span>
          <Badge 
            variant="secondary" 
            className={`mt-2 ${getStatusColor(booking.status)}`}
          >
            {booking.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Booking Details */}
        <div className="p-4 flex-1 space-y-4 md:space-y-0 md:grid md:grid-cols-2 gap-4">
          <div>
            {booking.style && (
              <div className="text-sm font-semibold text-primary uppercase tracking-wide mb-1">
                {booking.style.name}
              </div>
            )}
            <h4 className="font-semibold text-lg">{booking.category?.name}</h4>
            {booking.promo && (
              <div className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                Promo: {booking.promo.title || 'Special Offer'} (
                {booking.promo.discountPercentage
                  ? `${booking.promo.discountPercentage}% off`
                  : `$${booking.promo.promoPrice} promo`}
                )
              </div>
            )}
            {booking.notes && (
              <div className="mt-1 text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                {booking.notes}
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-1 mt-1">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                {booking.customer?.fullName || 'Guest'}
              </div>
              <div className="pl-6">{booking.customer?.phone || 'No phone'}</div>
              <div className="pl-6">{booking.customer?.email || 'No email'}</div>
            </div>

            {/* Payment (from payments table linked to this booking) */}
            <div className="mt-2">
              {booking.paymentStatus === 'successful' ? (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 border border-green-200">
                  Payment Successful — ${(booking.amountPaid || 0).toFixed(2)}
                </span>
              ) : booking.paymentStatus === 'failed' ? (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
                  Payment Failed{booking.attemptedAmount ? ` — $${booking.attemptedAmount.toFixed(2)} attempted` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground border">
                  No payment record
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
             {/* Stylist Assignment */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase">
                Assigned Stylist
              </label>
              {isAdmin ? (
                <Select
                  value={booking.stylistId || "--select a stylist--"}
                  onValueChange={(value) => handleAssignStylist(booking.id, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Stylist" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="--select a stylist--">--Select a stylist--</SelectItem>
                    {stylists.map((stylist: any) => (
                      <SelectItem key={stylist.id} value={stylist.id}>
                        {stylist.fullName || stylist.user?.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 border rounded-md bg-muted/50 text-sm font-medium">
                  {booking.stylist ? (booking.stylist.user?.fullName || "Assigned") : "--select a stylist--"}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
               {/* Status Actions */}
               {booking.status === 'booked' && (
                   <Button size="sm" variant="outline" onClick={() => handleStatusChange(booking.id, 'in_progress')}>
                       Start Appointment
                   </Button>
               )}
               {booking.status === 'in_progress' && (
                   <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(booking.id, 'completed')}>
                       <CheckCircle className="h-4 w-4 mr-2" />
                       Mark Complete
                   </Button>
               )}
               
               {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                   <>
                     <RescheduleDialog 
                         booking={booking} 
                         onReschedule={(date, time) => handleReschedule(booking.id, date, time)} 
                     />
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                         <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                             Cancel
                         </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent className="max-h-[90vh] w-[95vw] sm:max-w-lg flex flex-col">
                         <div className="flex-1 overflow-y-auto px-1">
                           <AlertDialogHeader>
                             <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                             <AlertDialogDescription>
                               This action will cancel the booking. This cannot be easily undone.
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                         </div>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Dismiss</AlertDialogCancel>
                           <AlertDialogAction onClick={() => handleStatusChange(booking.id, 'cancelled')} className="bg-red-600 hover:bg-red-700">
                             Yes, Cancel Booking
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                   </>
               )}

               {booking.status === 'cancelled' && (
                   <Button size="sm" variant="outline" onClick={() => handleStatusChange(booking.id, 'booked')}>
                       Restore to Booked
                   </Button>
               )}

               {/* Edit button — admin only */}
               {isAdmin && (
                   <EditBookingDialog
                       booking={booking}
                       stylists={stylists}
                       styles={styles}
                       onSave={handleEditSave}
                   />
               )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  // Get days with bookings for calendar modifiers
  const bookedDays = bookings.map((b) => parseISO(b.bookingDate));

  if (isLoadingBookings || isLoadingStylists || isLoadingStyles) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings Management</h2>
          <p className="text-muted-foreground">
            View and manage customer appointments.
          </p>
        </div>
        {isAdmin && (
            <CreateBookingDialog
                stylists={stylists}
                styles={styles}
                onCreated={handleBookingCreated}
            />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Calendar View */}
        <div className="md:col-span-4 lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <DayPicker
                mode="single"
                selected={date}
                onSelect={setDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="p-3 w-full flex justify-center"
                modifiers={{
                    booked: bookedDays
                }}
                modifiersStyles={{
                    booked: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                }}
              />
            </CardContent>
          </Card>
          
          <div className="mt-4 space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Legend</h3>
             <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded-full mr-2"></span>
                <span>Booked</span>
             </div>
             <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-teal-100 border border-teal-200 rounded-full mr-2"></span>
                <span>Checked In</span>
             </div>
             <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-full mr-2"></span>
                <span>In Progress</span>
             </div>
             <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-green-100 border border-green-200 rounded-full mr-2"></span>
                <span>Completed</span>
             </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">
                  {date ? format(date, "MMMM d, yyyy") : `Upcoming Bookings`}
                </h3>
                {date && (
                  <Button variant="ghost" size="sm" onClick={() => setDate(undefined)}>
                    Clear filter
                  </Button>
                )}
              </div>
              
              {upcomingBookings.length === 0 ? (
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
                    <p>No upcoming bookings found{date ? " for this date" : ""}.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {upcomingBookings.map(renderBookingCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
               <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">
                  {date ? format(date, "MMMM d, yyyy") : `Completed Bookings`}
                </h3>
                {date && (
                  <Button variant="ghost" size="sm" onClick={() => setDate(undefined)}>
                    Clear filter
                  </Button>
                )}
              </div>
              
              {completedBookings.length === 0 ? (
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p>No completed bookings found{date ? " for this date" : ""}.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {completedBookings.map(renderBookingCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
