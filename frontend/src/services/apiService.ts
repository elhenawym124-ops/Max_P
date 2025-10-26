import axios from 'axios';
import { buildApiUrl } from '../utils/urlHelper';

// إنشاء مثيل axios مع إعدادات أساسية
const apiClient = axios.create({
  baseURL: buildApiUrl(''),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة interceptor لإضافة الـ token تلقائياً
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// إضافة interceptor للتعامل مع الأخطاء
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// أنواع البيانات
export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'voice';
  isFromCustomer: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  conversationId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  voiceDuration?: number;
  repliedBy?: string;
  isFacebookReply?: boolean; // إضافة معلومة الردود من فيسبوك
  facebookMessageId?: string; // إضافة معرف رسالة فيسبوك
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  customerEmail?: string;
  customerPhone?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline?: boolean;
  platform: 'facebook' | 'whatsapp' | 'telegram' | 'unknown';
  status: 'new' | 'active' | 'archived' | 'important';
  messages: Message[];
  customerOrders?: any[];
  lastRepliedBy?: string;
  pageName?: string; // اسم صفحة الفيسبوك
  pageId?: string; // معرف صفحة الفيسبوك
}

export interface SavedReply {
  id: string;
  title: string;
  content: string;
  category: 'welcome' | 'thanks' | 'apology' | 'followup' | 'closing' | 'custom';
  createdAt: Date;
}

export interface CustomerProfile {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  totalOrders: number;
  lastOrder?: any;
  customerSince: Date;
  notes?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  createdAt: Date;
  items: OrderItem[];
}

// خدمات API
export const apiService = {
  // جلب المحادثات
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await apiClient.get('/conversations');
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // جلب الرسائل لمحادثة معينة
  async getMessages(conversationId: string, includeFacebookReplies: boolean = true): Promise<Message[]> {
    try {
      const response = await apiClient.get(`/conversations/${conversationId}/messages`, {
        params: { includeFacebookReplies }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // إرسال رسالة
  async sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'>): Promise<Message> {
    try {
      const response = await apiClient.post('/messages', message);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // جلب الردود المحفوظة
  async getSavedReplies(): Promise<SavedReply[]> {
    try {
      const response = await apiClient.get('/saved-replies');
      return response.data;
    } catch (error) {
      console.error('Error fetching saved replies:', error);
      throw error;
    }
  },

  // إنشاء رد محفوظ
  async createSavedReply(reply: Omit<SavedReply, 'id' | 'createdAt'>): Promise<SavedReply> {
    try {
      const response = await apiClient.post('/saved-replies', reply);
      return response.data;
    } catch (error) {
      console.error('Error creating saved reply:', error);
      throw error;
    }
  },

  // حذف رد محفوظ
  async deleteSavedReply(id: string): Promise<void> {
    try {
      await apiClient.delete(`/saved-replies/${id}`);
    } catch (error) {
      console.error('Error deleting saved reply:', error);
      throw error;
    }
  },

  // جلب ملف العميل
  async getCustomerProfile(customerId: string): Promise<CustomerProfile> {
    try {
      const response = await apiClient.get(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer profile:', error);
      throw error;
    }
  },

  // حذف محادثة
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await apiClient.delete(`/conversations/${conversationId}`);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },

  // جلب معلومات مستخدم Facebook
  async getFacebookUserProfile(userId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/facebook/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Facebook user profile:', error);
      throw error;
    }
  },

  // جلب طلبات العميل
  async getCustomerOrders(customerId: string): Promise<Order[]> {
    try {
      const response = await apiClient.get(`/customers/${customerId}/orders`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      throw error;
    }
  }
};

export default apiService;