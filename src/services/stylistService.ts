import { authService } from "./authService";
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/stylists`;

export interface Stylist {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  skillLevel: string;
  surcharge?: number;
  styleSurcharges?: Record<string, number>;
  workingHours?: Record<string, { start?: string; end?: string; isOpen: boolean }>;
  isActive: boolean;
  createdAt: string;
  pricing?: StylistPricing[];
  styles?: { id: string; name: string }[];
}

export interface StylistLeave {
  id: string;
  stylistId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt: string;
}

export interface StylistPricing {
  id: string;
  stylistId: string;
  categoryId: string;
  serviceId: string;
  price: number;
  durationMinutes: number;
  category?: { id: string; name: string };
  service?: { id: string; name: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StylistParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const stylistService = {
  async getAllStylists(params?: StylistParams): Promise<PaginatedResponse<Stylist>> {
    const token = authService.getToken();
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);

    const response = await fetch(`${API_URL}?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch stylists");
    return response.json();
  },

  async createStylist(data: any): Promise<Stylist> {
    const token = authService.getToken();
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create stylist");
    }
    return response.json();
  },

  async updateStylist(id: string, data: any): Promise<void> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update stylist");
  },

  async deleteStylist(id: string): Promise<void> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to delete stylist");
  },

  async getStylistById(id: string): Promise<Stylist> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch stylist");
    return response.json();
  },

  async getMyProfile(): Promise<Stylist> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch stylist profile");
    return response.json();
  },

  async addLeave(stylistId: string, leave: { startDate: string | Date; endDate: string | Date; reason?: string }): Promise<StylistLeave> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/${stylistId}/leaves`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(leave),
    });
    if (!response.ok) throw new Error("Failed to add leave");
    return response.json();
  },

  async deleteLeave(leaveId: string): Promise<void> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/leaves/${leaveId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to delete leave");
  },

  async getLeaves(stylistId: string): Promise<StylistLeave[]> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/${stylistId}/leaves`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch leaves");
    return response.json();
  },

  async updateLeave(leaveId: string, leave: { startDate: string | Date; endDate: string | Date; reason?: string }): Promise<StylistLeave> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/leaves/${leaveId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(leave),
    });
    if (!response.ok) throw new Error("Failed to update leave");
    return response.json();
  }
};
