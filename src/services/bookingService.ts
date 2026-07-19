import { authService } from './authService';
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

export interface TimeSlot {
  time: string;
  available: boolean;
  spots: number;
}

export interface GuestDetails {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
    birthDay?: string;
    birthMonth?: string;
    smsConsent?: boolean;
}

export interface CreateBookingData {
  styleId: string;
  categoryId: string;
  stylistId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  guestDetails?: GuestDetails;
  promoId?: string | null;
}

export interface CreateAdminBookingData {
  customerId?: string;
  guestDetails?: GuestDetails;
  styleId?: string;
  categoryId: string;
  stylistId?: string;
  date: string;    // YYYY-MM-DD
  time: string;    // HH:mm
  notes?: string;
  status?: string;
}


export interface Booking {
  id: string;
  date: string;
  time: string;
  status: string;
  styleId?: string | null;
  categoryId?: string | null;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  style: {
    name: string;
  } | null;
  category: {
    name: string;
  } | null;
  price: number;
  amountPaid?: number;
  attemptedAmount?: number;
  paymentStatus?: 'successful' | 'failed' | null;
  paymentCurrency?: string;
  stylist?: {
    id: string;
    user: {
      fullName: string;
    };
  } | null;
  stylistId?: string | null;
  duration?: number;
  bookingDate: string;
  bookingTime: string;
  notes?: string | null;
  promo?: {
    id: string;
    title?: string;
    promoMonth: string;
    promoYear: number;
    discountPercentage?: number;
    promoPrice: number;
    stylePricing?: {
      style: { name: string };
      category: { name: string };
    };
  } | null;
}

export const bookingService = {
  async getAvailability(date: string, styleId?: string, categoryId?: string, stylistId?: string, duration?: number, excludeBookingId?: string): Promise<TimeSlot[]> {
    const params = new URLSearchParams({ date, _t: Date.now().toString() });
    if (styleId) params.append('styleId', styleId);
    if (categoryId) params.append('categoryId', categoryId);
    if (stylistId) params.append('stylistId', stylistId);
    if (duration) params.append('duration', duration.toString());
    if (excludeBookingId) params.append('excludeBookingId', excludeBookingId);
    
    const response = await fetch(`${API_URL}/availability?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch availability');
    return response.json();
  },

  async getWeeklyAvailability(startDate: string, endDate: string, styleId?: string, categoryId?: string, stylistId?: string, duration?: number): Promise<Record<string, TimeSlot[]>> {
    const params = new URLSearchParams({ startDate, endDate, _t: Date.now().toString() });
    if (styleId) params.append('styleId', styleId);
    if (categoryId) params.append('categoryId', categoryId);
    if (stylistId) params.append('stylistId', stylistId);
    if (duration) params.append('duration', duration.toString());
    
    const response = await fetch(`${API_URL}/availability?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch availability');
    return response.json();
  },

  async createBooking(data: CreateBookingData): Promise<any> {
     const token = authService.getToken();
     const headers: any = {
        'Content-Type': 'application/json',
     };
     
     if (token) {
        headers['Authorization'] = `Bearer ${token}`;
     }

     const response = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
     });
     if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create booking');
     }
     return response.json();
  },

  /** Admin-only: Create a booking without payment */
  async createAdminBooking(data: CreateAdminBookingData): Promise<Booking> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/bookings/admin-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create booking');
    }
    return response.json();
  },

  async getBookings(): Promise<Booking[]> {
     const token = authService.getToken();
     const response = await fetch(`${API_URL}/bookings`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
     });
     if (!response.ok) throw new Error('Failed to fetch bookings');
     return response.json();
  },

  async createPaymentIntent(amount: number, guestDetails?: any): Promise<{ clientSecret: string, id: string }> {
      const token = authService.getToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/bookings/create-payment-intent`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ amount, guestDetails })
      });

      if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Failed to create payment intent' }));
          throw new Error(error.message || 'Failed to create payment intent');
      }
      return response.json();
  },


  async updateBooking(id: string, data: {
    status?: string;
    stylistId?: string;
    date?: string;
    time?: string;
    styleId?: string;
    categoryId?: string;
    notes?: string;
  }): Promise<Booking> {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/bookings/${id}`, {
          method: 'PATCH',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update booking');
      }
      return response.json();
  },

  async checkInBooking(id: string): Promise<Booking> {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/bookings/${id}/check-in`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to check in');
      }
      return response.json();
  }
};
