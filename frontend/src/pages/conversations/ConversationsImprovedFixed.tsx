import React, { useState, useEffect, useRef } from 'react';
import {
  PaperAirplaneIcon,
  FaceSmileIcon,
  PaperClipIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  ChatBubbleLeftRightIcon,
  ShoppingCartIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  UserIcon // أيقونة المستخدم للرسائل اليدوية
} from '@heroicons/react/24/outline';

// استيراد الـ hooks المطلوبة (سنضيفها تدريجياً)
import useSocket from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuthSimple';
import { useCompany } from '../../contexts/CompanyContext';
import { companyAwareApi } from '../../services/companyAwareApi';
import { apiClient } from '../../services/apiClient';
import { uploadService } from '../../services/uploadService';
import CompanyProtectedRoute from '../../components/protection/CompanyProtectedRoute';
import OrderModal from '../../components/orders/OrderModal';
import { getImageUrl } from '../../utils/urlConverter';
import { buildApiUrl } from '../../utils/urlHelper';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  isFromCustomer: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  conversationId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isAiGenerated?: boolean; // للتمييز بين الرسائل اليدوية ورسائل الذكاء الصناعي
}

interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline?: boolean;
  platform: 'facebook' | 'whatsapp' | 'telegram' | 'unknown';
  messages: Message[];
  aiEnabled?: boolean; // حالة الذكاء الاصطناعي
  pageName?: string; // اسم صفحة الفيسبوك
  pageId?: string; // معرف صفحة الفيسبوك
}



const ConversationsImprovedFixedContent: React.FC = () => {
  // Authentication & Company
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { company, companyId, getCompanyFilter } = useCompany();

  // الحالات الأساسية
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);

  // حالات الـ pagination
  const [conversationsPage, setConversationsPage] = useState(1);
  const [conversationsLimit] = useState(50);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [totalConversations, setTotalConversations] = useState(0);

  // Socket.IO للرسائل الفورية
  const { socket, isConnected, isReconnecting, emit, on, off } = useSocket();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loadingOldMessages, setLoadingOldMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [messagesPage, setMessagesPage] = useState(1);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  // حالات الطلبات
  const [showOrderModal, setShowOrderModal] = useState(false);

  // حالات الحذف
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // حالات التحكم في الذكاء الاصطناعي
  const [togglingAI, setTogglingAI] = useState<string | null>(null);

  // المراجع
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const conversationsListRef = useRef<HTMLDivElement>(null);

  // تحميل المحادثات من API مع العزل
  const loadConversations = async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMoreConversations(true);
      }
      setError(null);

      // التحقق من المصادقة
      if (!isAuthenticated) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // التحقق من وجود الشركة
      if (!companyId) {
        throw new Error('لم يتم العثور على معرف الشركة');
      }

      console.log('🔄 Loading conversations from API...');
      console.log('🏢 Company ID:', companyId);
      console.log('📄 Page:', page, 'Limit:', conversationsLimit);

      // استخدام Company-Aware API مع pagination
      const response = await companyAwareApi.getConversations({
        page: page,
        limit: conversationsLimit
      });

      if (!response.data) {
        throw new Error('لا توجد بيانات في الاستجابة');
      }

      const result = response.data;
      console.log('✅ Conversations loaded successfully:', result);

      // استخراج البيانات من الاستجابة
      const data = result.data || result || [];
      const pagination = result.pagination || {};
      
      console.log('📊 Conversations data:', data.length);
      console.log('📋 Pagination info:', pagination);
      console.log('📋 First conversation sample:', data[0]);

      // تحديث معلومات الـ pagination
      if (pagination.total !== undefined) {
        setTotalConversations(pagination.total);
      }
      if (pagination.hasNextPage !== undefined) {
        setHasMoreConversations(pagination.hasNextPage);
      }

      // تحويل البيانات للتنسيق المطلوب
      const formattedConversations = data.map((conv: any) => {
        console.log('🔍 [CONVERSATION-DEBUG] Processing conversation:', conv.id, 'aiEnabled:', conv.aiEnabled, 'pageName:', conv.pageName);
        return {
          id: conv.id,
          customerId: conv.customerId || conv.id,
          customerName: conv.customerName || conv.customerId || 'عميل غير معروف',
          lastMessage: conv.lastMessage || 'لا توجد رسائل',
          lastMessageTime: new Date(conv.lastMessageTime || conv.lastMessageAt || Date.now()),
          unreadCount: conv.unreadCount || 0,
          platform: (conv.platform || conv.channel || 'unknown') as Conversation['platform'],
          isOnline: false, // سنحدثها لاحقاً مع Socket.IO
          messages: [],
          aiEnabled: conv.aiEnabled !== undefined ? conv.aiEnabled : true, // إضافة حالة AI
          pageName: conv.pageName || null, // إضافة اسم الصفحة
          pageId: conv.pageId || null // إضافة معرف الصفحة
        };
      });

      // إضافة أو استبدال المحادثات
      if (append) {
        setConversations(prev => [...prev, ...formattedConversations]);
        setConversationsPage(page);
      } else {
        setConversations(formattedConversations);
        setConversationsPage(1);
      }
      
      console.log('✅ Conversations loaded:', formattedConversations.length);
      console.log('📊 Total conversations:', pagination.total || formattedConversations.length);
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      setError('فشل في تحميل المحادثات. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
      setLoadingMoreConversations(false);
    }
  };

  // تحميل محادثة محددة من الخادم
  const loadSpecificConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('رمز المصادقة غير موجود');
      }

      console.log('🔄 Loading specific conversation:', conversationId);
      const response = await fetch(buildApiUrl(`conversations/${conversationId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Specific conversation loaded:', result);

      if (result.success && result.data) {
        const conv = result.data;
        const formattedConversation: Conversation = {
          id: conv.id,
          customerId: conv.customerId || conv.id,
          customerName: conv.customerName || conv.customerId || 'عميل غير معروف',
          lastMessage: conv.lastMessage || 'لا توجد رسائل',
          lastMessageTime: new Date(conv.lastMessageTime || conv.lastMessageAt || Date.now()),
          unreadCount: conv.unreadCount || 0,
          platform: (conv.platform || conv.channel || 'unknown') as Conversation['platform'],
          isOnline: false,
          messages: []
        };

        // إضافة المحادثة للقائمة إذا لم تكن موجودة
        setConversations(prev => {
          const exists = prev.find(c => c.id === conversationId);
          if (!exists) {
            return [formattedConversation, ...prev];
          }
          return prev;
        });

        // اختيار المحادثة
        console.log('✅ Selecting loaded conversation:', conversationId);
        selectConversation(conversationId);
      } else {
        console.error('❌ Failed to load specific conversation:', result);
        // اختيار أول محادثة كبديل
        if (conversations.length > 0) {
          selectConversation(conversations[0].id);
        }
      }
    } catch (error) {
      console.error('❌ Error loading specific conversation:', error);
      // اختيار أول محادثة كبديل
      if (conversations.length > 0) {
        selectConversation(conversations[0].id);
      }
    }
  };

  // تحميل الرسائل لمحادثة محددة
  const loadMessages = async (conversationId: string, page: number = 1, append: boolean = false) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('رمز المصادقة غير موجود');
      }

      console.log('🔄 Loading messages for conversation:', conversationId, 'page:', page);
      const response = await fetch(buildApiUrl(`conversations/${conversationId}/messages?page=${page}&limit=50`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || result || [];
      const messages: Message[] = data.map((msg: any) => {
        // تحليل metadata والتحقق من الذكاء الاصطناعي
        let isAiGenerated = false;
        if (msg.metadata) {
          try {
            const metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
            isAiGenerated = metadata.isAIGenerated || metadata.isAutoGenerated || metadata.source === 'ai_agent' || false;
          } catch (e) {
            console.warn('⚠️ Failed to parse metadata for message:', msg.id);
          }
        }

        // Debug: Log sender info for employee messages
        if (!msg.isFromCustomer && msg.sender) {
          console.log(`👤 [SENDER] ${msg.sender.name} sent: "${msg.content.substring(0, 30)}..."`);
        }

        return {
          id: msg.id,
          content: msg.content,
          senderId: msg.sender?.id || 'unknown',
          senderName: msg.isFromCustomer 
            ? 'العميل' 
            : (msg.sender?.name || (isAiGenerated ? 'الذكاء الاصطناعي' : 'موظف')),
          timestamp: new Date(msg.timestamp),
          type: msg.type || 'text',
          isFromCustomer: msg.isFromCustomer,
          status: 'delivered',
          conversationId: conversationId,
          isAiGenerated: isAiGenerated, // تحديد نوع الرسالة
          fileUrl: msg.fileUrl, // إضافة رابط الملف
          fileName: msg.fileName, // إضافة اسم الملف
          fileSize: msg.fileSize, // إضافة حجم الملف
          attachments: msg.attachments || [] // إضافة المرفقات
        };
      });

      // إحصائيات مؤقتة للتشخيص
      const customerMessages = messages.filter(m => m.isFromCustomer).length;
      const aiMessages = messages.filter(m => !m.isFromCustomer && m.isAiGenerated).length;
      const manualMessages = messages.filter(m => !m.isFromCustomer && !m.isAiGenerated).length;

      console.log('✅ Messages loaded:', messages.length);
      console.log('📊 [FRONTEND-STATS] إحصائيات الرسائل:');
      console.log(`   👤 ${customerMessages} من العملاء`);
      console.log(`   🤖 ${aiMessages} من الذكاء الصناعي`);
      console.log(`   👨‍💼 ${manualMessages} يدوية`);

      // تحديث المحادثة المختارة بالرسائل
      setSelectedConversation(prev => {
        if (!prev) return null;

        if (append) {
          // إضافة رسائل قديمة في البداية
          return {
            ...prev,
            messages: [...messages, ...(prev.messages || [])]
          };
        } else {
          // تحميل رسائل جديدة - نحتاج للحفاظ على الرسائل الجديدة التي لم تُحفظ بعد
          const existingMessages = prev.messages || [];
          const newMessages = messages || [];

          // البحث عن الرسائل الجديدة التي لا توجد في الرسائل المحملة
          const latestMessageFromServer = newMessages.length > 0 ? new Date(newMessages[newMessages.length - 1].timestamp) : new Date(0);
          const recentMessages = existingMessages.filter(msg =>
            new Date(msg.timestamp) > latestMessageFromServer
          );

          console.log('🔄 [LOAD-MESSAGES] Merging messages:', {
            fromServer: newMessages.length,
            existing: existingMessages.length,
            recent: recentMessages.length,
            latestFromServer: latestMessageFromServer
          });

          return {
            ...prev,
            messages: [...newMessages, ...recentMessages]
          };
        }
      });

      // تحديث حالة وجود رسائل أقدم
      setHasMoreMessages(messages.length === 50); // إذا كان عدد الرسائل أقل من 50، فلا توجد رسائل أقدم

      if (!append) {
        // التمرير للأسفل بعد تحميل الرسائل الجديدة
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  };

  // تحميل الرسائل القديمة
  const loadOldMessages = async () => {
    if (!selectedConversation || loadingOldMessages || !hasMoreMessages) return;

    setLoadingOldMessages(true);
    const nextPage = messagesPage + 1;

    try {
      console.log('🔄 Loading old messages, page:', nextPage);
      const response = await fetch(buildApiUrl(`conversations/${selectedConversation.id}/messages?page=${nextPage}&limit=50`));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || result || [];

      if (data.length > 0) {
        const oldMessages: Message[] = data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.sender?.id || 'unknown',
          senderName: msg.sender?.name || (
            msg.isFromCustomer ? 'العميل' : 'أنت'
          ),
          timestamp: new Date(msg.timestamp),
          type: msg.type || 'text',
          isFromCustomer: msg.isFromCustomer,
          status: 'delivered',
          conversationId: selectedConversation.id,
          isAiGenerated: msg.isAiGenerated || msg.isAutoGenerated || false // تحديد نوع الرسالة
        }));

        console.log('✅ Old messages loaded:', oldMessages.length);

        // إضافة الرسائل القديمة في بداية القائمة
        setSelectedConversation(prev => prev ? {
          ...prev,
          messages: [...oldMessages, ...(prev.messages || [])]
        } : null);

        setMessagesPage(nextPage);
        setHasMoreMessages(oldMessages.length === 50);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('❌ Error loading old messages:', error);
    } finally {
      setLoadingOldMessages(false);
    }
  };

  // اختيار محادثة
  const selectConversation = (conversationId: string) => {
    console.log('🎯 selectConversation called with ID:', conversationId);
    console.log('🔍 Available conversations count:', conversations.length);

    const conversation = conversations.find(conv => conv.id === conversationId);
    console.log('🔍 Found conversation:', conversation ? conversation.customerName : 'NOT FOUND');

    if (conversation) {
      console.log('✅ Setting selected conversation:', conversation.customerName);

      // إذا كانت المحادثة محملة بالفعل، احتفظ بالرسائل الموجودة
      if (selectedConversation?.id === conversationId) {
        console.log('🔄 Conversation already selected, keeping existing messages');
        // لا نغير selectedConversation إذا كانت نفس المحادثة
      } else {
        console.log('🆕 Selecting new conversation');
        setSelectedConversation(conversation);

        // تحميل الرسائل إذا لم تكن محملة
        // نتحقق من المحادثة في القائمة أو المحادثة المختارة السابقة
        const hasMessages = (conversation.messages || []).length > 0 ||
          (selectedConversation?.id === conversationId && (selectedConversation.messages || []).length > 0);

        if (!hasMessages) {
          console.log('📥 Loading messages for new conversation');
          loadMessages(conversationId);
        } else {
          console.log('✅ Messages already available, skipping load');
        }
      }

      // تحديث URL لتضمين معرف المحادثة
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('conversationId', conversationId);
      window.history.replaceState({}, '', newUrl.toString());

      // تمييز كمقروءة
      if (conversation.unreadCount > 0) {
        // تحديث Frontend مباشرة
        setConversations(prev => prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        ));
        
        // 🔧 FIX: تحديث Backend أيضاً
        markConversationAsRead(conversationId);
      }
    } else {
      console.warn('❌ Conversation not found in selectConversation:', conversationId);
      console.log('📝 Available conversation IDs:', conversations.map(c => c.id));
    }
  };

  // 🔧 FIX: تحديد المحادثة كمقروءة في Backend
  const markConversationAsRead = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ [MARK-READ] No token found, skipping backend update');
        return;
      }

      const response = await fetch(buildApiUrl(`conversations/${conversationId}/read`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [MARK-READ] Marked conversation ${conversationId} as read - ${data.markedCount || 0} messages`);
      } else {
        console.warn(`⚠️ [MARK-READ] Failed to mark conversation as read:`, response.status);
      }
    } catch (error) {
      console.error('❌ [MARK-READ] Error marking conversation as read:', error);
    }
  };

  const refreshLastMessageFromServer = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) return;

      const resp = await fetch(buildApiUrl(`conversations/${conversationId}/messages`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!resp.ok) return;
      const result = await resp.json();
      const arr = result.data || result || [];
      if (!Array.isArray(arr) || arr.length === 0) return;

      let preview: string | null = null;
      let time: any = null;
      for (let i = arr.length - 1; i >= 0; i--) {
        const m = arr[i];
        const t = (m.type || '').toString().toLowerCase();
        if (t === 'image') {
          preview = '📷 صورة';
          time = m.timestamp;
          break;
        } else if (t === 'file') {
          preview = '📎 ملف';
          time = m.timestamp;
          break;
        } else {
          const content = (m.content || '').trim();
          if (content.length >= 1 && !/^[✓✗×\s]+$/.test(content)) {
            preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
            time = m.timestamp;
            break;
          }
        }
      }

      if (preview) {
        setConversations(prev => prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, lastMessage: preview as string, lastMessageTime: new Date(time || Date.now()) }
            : conv
        ));
      }
    } catch (e) {
      // ignore
    }
  };

  // إرسال رسالة مع Socket.IO
  const sendMessage = async (customMessage?: string) => {
    const messageContent = customMessage || newMessage.trim();
    if (!messageContent || !selectedConversation || sending) return;

    if (!customMessage) {
      setNewMessage('');
    }
    setSending(true);

    // إنشاء رسالة مؤقتة
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      content: messageContent,
      senderId: 'current_user',
      senderName: 'أنت',
      timestamp: new Date(),
      type: 'text',
      isFromCustomer: false,
      status: 'sending',
      conversationId: selectedConversation.id,
      isAiGenerated: false // رسالة يدوية
    };

    // إضافة الرسالة مؤقتاً للواجهة
    setSelectedConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, tempMessage]
    } : null);

    // التمرير للأسفل
    setTimeout(() => scrollToBottom(), 100);

    try {
      // إرسال عبر API فقط (لتجنب التضارب)
      const url = buildApiUrl(`conversations/${selectedConversation.id}/messages`);
      const payload = { message: messageContent };

      console.log('🚀 Sending message to:', url);
      console.log('📦 Payload:', payload);

      // البحث عن token بأسماء مختلفة
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('رمز المصادقة غير موجود. يرجى تسجيل الدخول مرة أخرى.');
      }

      console.log('🔑 Using token:', token ? `${token.substring(0, 20)}...` : 'No token');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);

      if (response.status === 401) {
        // خطأ مصادقة - إعادة توجيه لتسجيل الدخول
        localStorage.removeItem('token');
        alert('انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.');
        window.location.href = '/login';
        return;
      }

      const data = await response.json();
      console.log('📤 API Response:', data);

      if (data.success) {
        // ⚡ OPTIMIZATION: نشيل الرسالة المؤقتة ونستنى الـ echo من Facebook
        // الرسالة هتظهر تلقائياً لما الـ echo يجي
        console.log('⏳ Waiting for Facebook echo to save message...');
        
        // شيل الرسالة المؤقتة
        setSelectedConversation(prev => prev ? {
          ...prev,
          messages: (prev.messages || []).filter(msg => msg.id !== tempMessage.id)
        } : null);

        // تحديث قائمة المحادثات وإعادة ترتيبها
        setConversations((prev: Conversation[]) => {
          const updatedConversations = prev.map((conv: Conversation) =>
            conv.id === selectedConversation.id
              ? {
                ...conv,
                lastMessage: messageContent,
                lastMessageTime: new Date(),
                lastMessagePreview: messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent
              }
              : conv
          );
          
          // إعادة ترتيب المحادثات لتظهر المحادثة ذات آخر رسالة في الأعلى
          return updatedConversations.sort((a: Conversation, b: Conversation) => {
            const timeA = new Date(a.lastMessageTime).getTime();
            const timeB = new Date(b.lastMessageTime).getTime();
            return timeB - timeA;
          });
        });

        // إظهار رسالة نجاح مع معلومات التشخيص
        if (data.facebookSent) {
          console.log('✅ Message sent successfully to Facebook');
        } else {
          console.warn('⚠️ Message saved but not sent to Facebook');
          console.log('Debug info:', data.debug);

          // إظهار تنبيه للمستخدم
          if (data.debug && !data.debug.hasFacebookId) {
            alert('⚠️ تحذير: العميل لا يملك معرف Facebook صالح. الرسالة محفوظة محلياً فقط.');
          } else if (data.debug && !data.debug.facebookSent) {
            alert('⚠️ تحذير: فشل في إرسال الرسالة إلى Facebook. تحقق من إعدادات الصفحة.');
          }
        }

        console.log('✅ Message sent successfully!', data);

        // إعادة تحميل الرسائل لضمان التزامن
        setTimeout(() => {
          loadMessages(selectedConversation.id);
        }, 500);
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);

      // تحديث حالة الرسالة إلى خطأ
      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: (prev.messages || []).map(msg =>
          msg.id === tempMessage.id
            ? { ...msg, status: 'error' }
            : msg
        )
      } : null);

      setNewMessage(messageContent); // إعادة النص في حالة الخطأ
    } finally {
      setSending(false);
    }
  };

  // إرسال مؤشر الكتابة
  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (socket && isConnected && selectedConversation) {
      emit('start_typing', {
        conversationId: selectedConversation.id,
        userId: 'current_user'
      });

      // إيقاف مؤشر الكتابة بعد ثانيتين من التوقف
      setTimeout(() => {
        emit('stop_typing', {
          conversationId: selectedConversation.id,
          userId: 'current_user'
        });
      }, 2000);
    }
  };

  // التمرير إلى أسفل
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollToBottom(false);
    setUnreadMessagesCount(0);
  };

  // وظائف الإشعارات
  const playNotificationSound = () => {
    if (!soundEnabled) return;

    // إنشاء صوت إشعار بسيط
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const showBrowserNotification = (title: string, body: string, icon?: string) => {
    if (!notificationsEnabled) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag: 'new-message',
        requireInteraction: false,
        silent: false
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: icon || '/favicon.ico',
            tag: 'new-message'
          });
        }
      });
    }
  };

  // دالة حذف المحادثة
  const deleteConversation = async (conversationId: string) => {
    try {
      setDeleting(true);
      console.log('🗑️ Deleting conversation:', conversationId);

      // الحصول على الـ Token
      const token = localStorage.getItem('accessToken');
      console.log('🔑 Token found:', !!token);

      const response = await apiClient.delete(`/conversations/${conversationId}`);
      const data = response.data;

      if (data.success) {
        console.log('✅ Conversation deleted successfully');

        // إزالة المحادثة من القائمة
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));

        // إذا كانت المحادثة المحذوفة هي المحددة، قم بإلغاء التحديد
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
        }

        // إغلاق النافذة المنبثقة
        setShowDeleteModal(false);
        setConversationToDelete(null);

        // إشعار نجاح
        alert('تم حذف المحادثة بنجاح');
      } else {
        throw new Error(data.message || 'فشل في حذف المحادثة');
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      alert('حدث خطأ أثناء حذف المحادثة');
    } finally {
      setDeleting(false);
    }
  };

  // دالة فتح نافذة تأكيد الحذف
  const openDeleteModal = (conversation: Conversation) => {
    setConversationToDelete(conversation);
    setShowDeleteModal(true);
  };

  // دالة إغلاق نافذة تأكيد الحذف
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  // وظائف رفع الملفات
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const previews: string[] = [];

    // فحص نوع الملفات والحجم
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`حجم الملف ${file.name} كبير جداً. الحد الأقصى 10 ميجابايت.`);
        continue;
      }

      validFiles.push(file);

      // إنشاء معاينة للصور
      if (file.type.startsWith('image/')) {
        try {
          const preview = await uploadService.getFilePreview(file);
          previews.push(preview);
        } catch (error) {
          console.error('Error creating preview:', error);
          previews.push('');
        }
      } else {
        previews.push('');
      }
    }

    setSelectedFiles(validFiles);
    setFilePreviews(previews);
  };

  // دالة تشغيل/إيقاف الذكاء الاصطناعي للمحادثة
  const handleToggleAI = async (conversationId: string, currentAIStatus: boolean) => {
    console.log('🤖 [HANDLE-TOGGLE-AI] Function called with:', { conversationId, currentAIStatus, togglingAI });

    if (togglingAI) {
      console.log('🤖 [HANDLE-TOGGLE-AI] Already toggling, returning');
      return; // منع التشغيل المتعدد
    }

    setTogglingAI(conversationId);
    try {
      const newAIStatus = !currentAIStatus;
      console.log(`🤖 [HANDLE-TOGGLE-AI] Toggling AI for conversation ${conversationId} from ${currentAIStatus} to ${newAIStatus}`);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('لم يتم العثور على رمز المصادقة');
      }

      const response = await fetch(buildApiUrl(`conversations/${conversationId}/ai-toggle`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ aiEnabled: newAIStatus })
      });

      const result = await response.json();
      console.log('🤖 [HANDLE-TOGGLE-AI] API result:', result);

      if (result.success) {
        // تحديث المحادثة محلياً
        setConversations(prev => prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, aiEnabled: newAIStatus }
            : conv
        ));

        // تحديث المحادثة المختارة إذا كانت نفس المحادثة
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(prev => prev ? { ...prev, aiEnabled: newAIStatus } : null);
        }

        // إظهار رسالة نجاح
        const statusText = newAIStatus ? 'تم تفعيل' : 'تم إيقاف';
        console.log(`✅ ${statusText} الذكاء الاصطناعي للمحادثة`);

        // يمكن إضافة toast notification هنا
        if (soundEnabled) {
          playNotificationSound();
        }
      } else {
        throw new Error(result.message || 'فشل في تحديث حالة الذكاء الاصطناعي');
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة الذكاء الاصطناعي:', error);
      setError(error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setTogglingAI(null);
    }
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0 || !selectedConversation || uploadingFile) return;

    setUploadingFile(true);

    try {
      // رفع كل الملفات دفعة واحدة
      const uploadResult = await uploadService.uploadConversationFiles(selectedConversation.id, selectedFiles);

      if (!uploadResult.success) {
        alert(uploadResult.error || 'حدث خطأ أثناء رفع الملفات');
        return;
      }

      const data = uploadResult;

      // ⚡ OPTIMIZATION: مش هنضيف الملفات هنا - هنستنى الـ echo من Facebook
      console.log(`⏳ Waiting for Facebook echo to save ${data.data.length} file(s)...`);
      
      // التمرير للأسفل
      setTimeout(() => scrollToBottom(), 100);
      
      // تنظيف الحالة
      setSelectedFiles([]);
      setFilePreviews([]);
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      alert('حدث خطأ أثناء رفع الملفات');
    } finally {
      setUploadingFile(false);
    }
  };

  const cancelFileUpload = () => {
    setSelectedFiles([]);
    setFilePreviews([]);
  };

  // وظائف الطلبات
  const openOrderModal = () => {
    setShowOrderModal(true);
  };

  // معالجة إنشاء الطلب
  const handleOrderCreated = async (orderData: any) => {
    // إرسال رسالة تأكيد للعميل
    const confirmationMessage = `تم إنشاء طلبك بنجاح! 🎉

رقم الطلب: ${orderData.orderNumber}
الإجمالي: ${orderData.total} جنيه

سيتم التواصل معك قريباً لتأكيد التفاصيل.`;
    await sendMessage(confirmationMessage);
  };

  // مراقبة التمرير للرسائل
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    const isAtTop = container.scrollTop <= 100;

    setShowScrollToBottom(!isAtBottom);

    if (isAtBottom) {
      setUnreadMessagesCount(0);
    }

    // تحميل الرسائل القديمة عند الوصول لأعلى الصفحة
    if (isAtTop && hasMoreMessages && !loadingOldMessages) {
      loadOldMessages();
    }
  };

  // مراقبة التمرير لقائمة المحادثات (infinite scroll)
  const handleConversationsScroll = () => {
    if (!conversationsListRef.current) return;

    const container = conversationsListRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

    // تحميل المزيد من المحادثات عند الوصول لأسفل القائمة
    if (isAtBottom && hasMoreConversations && !loadingMoreConversations) {
      console.log('📄 Loading more conversations...');
      loadConversations(conversationsPage + 1, true);
    }
  };

  // إعداد مستمعي أحداث Socket.IO (مُفعل للتحديث الفوري)
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('❌ [SOCKET] Socket not available:', { socket: !!socket, isConnected });
      return;
    }

    console.log('🔌 [SOCKET] Setting up Socket.IO event listeners...');
    console.log('🔌 [SOCKET] Socket ID:', socket.id);
    console.log('🔌 [SOCKET] Connection status:', isConnected);

    // استقبال رسالة جديدة
    const handleNewMessage = (data: any) => {
      console.log('📨 [SOCKET] New message received:', data);
      console.log('📨 [SOCKET] Message ID:', data.id);
      console.log('📨 [SOCKET] Current conversation:', selectedConversation?.id);
      console.log('📨 [SOCKET] Message conversation:', data.conversationId || data.message?.conversationId);

      const newMessage: Message = {
        id: data.id,
        content: data.content,
        senderId: data.senderId,
        senderName: data.senderName || 'العميل',
        timestamp: new Date(data.timestamp),
        type: data.type || 'text',
        isFromCustomer: data.isFromCustomer,
        status: 'delivered',
        conversationId: data.conversationId,
        isAiGenerated: (
          data.metadata?.isAIGenerated ||
          data.metadata?.isAutoGenerated ||
          data.senderId === 'ai_agent' ||
          data.senderName === 'الذكاء الاصطناعي' ||
          false
        ),
        // إضافة معلومات الملف من Socket
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize
      };

      // إضافة الرسالة للمحادثة المناسبة في قائمة المحادثات
      setConversations((prev: Conversation[]) => {
        const updatedConversations = prev.map((conv: Conversation) => {
          if (conv.id === data.conversationId) {
            // التحقق من عدم وجود الرسالة مسبقاً لتجنب التكرار
            const existingMessages = conv.messages || [];
            const messageExists = existingMessages.some(msg => msg.id === newMessage.id);

            return {
              ...conv,
              messages: messageExists ? existingMessages : [...existingMessages, newMessage],
              lastMessage: data.content,
              lastMessageTime: new Date(data.timestamp),
              unreadCount: selectedConversation?.id === data.conversationId ? 0 : conv.unreadCount + 1
            };
          }
          return conv;
        });

        // إعادة ترتيب المحادثات لتظهر المحادثة ذات آخر رسالة في الأعلى
        return updatedConversations.sort((a: Conversation, b: Conversation) => {
          const timeA = new Date(a.lastMessageTime).getTime();
          const timeB = new Date(b.lastMessageTime).getTime();
          return timeB - timeA; // الأحدث أولاً
        });
      });

      // تحديث المحادثة المختارة إذا كانت نفس المحادثة
      if (selectedConversation?.id === data.conversationId) {
        setSelectedConversation((prev: Conversation | null) => {
          if (!prev) return null;

          // التحقق من عدم وجود الرسالة بالفعل لتجنب التكرار (محسن)
          const existingMessages = prev.messages || [];
          const messageExists = existingMessages.some((msg: Message) => {
            // فحص بالمعرف
            if (msg.id === newMessage.id) {
              console.log('⚠️ [SOCKET] Duplicate message ID detected:', msg.id);
              return true;
            }

            // فحص بالمحتوى والوقت (للرسائل من الذكاء الاصطناعي)
            if (msg.content === newMessage.content &&
              !msg.isFromCustomer &&
              !newMessage.isFromCustomer &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 2000) {
              console.log('⚠️ [SOCKET] Duplicate AI message content detected:', msg.content.substring(0, 50));
              return true;
            }

            return false;
          });

          if (messageExists) {
            console.log('⚠️ [SOCKET] Message already exists, skipping duplicate');
            return prev;
          }

          console.log('✅ [SOCKET] Adding new message to selected conversation');
          return {
            ...prev,
            messages: [...existingMessages, newMessage],
            lastMessage: data.content,
            lastMessageTime: new Date(data.timestamp)
          };
        });

        // إذا لم يكن المستخدم في الأسفل، زيادة عداد الرسائل غير المقروءة
        if (showScrollToBottom) {
          setUnreadMessagesCount(prev => prev + 1);

          // تشغيل صوت الإشعار وعرض إشعار المتصفح
          playNotificationSound();
          showBrowserNotification(
            `رسالة جديدة من ${data.senderName || 'العميل'}`,
            data.content.length > 50 ? data.content.substring(0, 50) + '...' : data.content
          );
        } else {
          // التمرير للأسفل إذا كان المستخدم في الأسفل
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    };

    // مؤشر الكتابة
    const handleUserTyping = (data: any) => {
      console.log('✍️ User typing:', data);
      setTypingUsers(prev => {
        if (!prev.includes(data.userId)) {
          return [...prev, data.userId];
        }
        return prev;
      });

      // إزالة مؤشر الكتابة بعد 3 ثوان
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }, 3000);
    };

    // إيقاف الكتابة
    const handleUserStoppedTyping = (data: any) => {
      setTypingUsers(prev => prev.filter(id => id !== data.userId));
    };

    // حالة الاتصال
    const handleUserOnline = (data: any) => {
      console.log('🟢 User online:', data.userId);
      setOnlineUsers(prev => {
        if (!prev.includes(data.userId)) {
          return [...prev, data.userId];
        }
        return prev;
      });

      // تحديث حالة المحادثات
      setConversations(prev => prev.map(conv =>
        conv.id === data.userId ? { ...conv, isOnline: true } : conv
      ));
    };

    const handleUserOffline = (data: any) => {
      console.log('🔴 User offline:', data.userId);
      setOnlineUsers(prev => prev.filter(id => id !== data.userId));

      // تحديث حالة المحادثات
      setConversations(prev => prev.map(conv =>
        conv.id === data.userId ? { ...conv, isOnline: false } : conv
      ));
    };

    // استقبال محادثة جديدة
    const handleConversationCreated = (data: any) => {
      console.log('🆕 [SOCKET] New conversation created:', data);

      const formattedConversation: Conversation = {
        id: data.id,
        customerId: data.customerId || data.id,
        customerName: data.customerName || 'عميل غير معروف',
        lastMessage: data.lastMessage || 'محادثة جديدة',
        lastMessageTime: new Date(data.lastMessageTime || Date.now()),
        unreadCount: data.unreadCount || 0,
        platform: 'facebook',
        isOnline: false,
        messages: [] ,
        pageName : data.pageName || 'unknown',
        pageId : data.pageId
      };

      // إضافة المحادثة لأعلى القائمة
      setConversations(prev => [formattedConversation, ...prev]);

      console.log('✅ [SOCKET] New conversation added to frontend list');
    };

    // استقبال محادثة جديدة عبر البث العام (طريقة احتياطية)
    const handleNewConversationBroadcast = (data: any) => {
      console.log('ð [SOCKET] New conversation broadcast received:', data);

      // فحص إذا كانت للشركة الحالية
      if (data.targetCompanyId === companyId) {
        handleConversationCreated(data);
      }
    };

    // استقبال محادثة عندما لا يكون هناك مستخدمين متصلين
    const handleNewConversationOffline = (data: any) => {
      console.log('📵 [SOCKET] New conversation (offline) received:', data);

      // فحص إذا كانت المحادثة مخصصة لشركة المستخدم الحالي
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (data.targetCompanyId === user.companyId) {
            console.log('✅ [SOCKET] Offline conversation is for current user company, adding...');
            handleConversationCreated(data);
          }
        } catch (error) {
          console.error('❌ [SOCKET] Error parsing user data for offline conversation:', error);
        }
      }
    };

    // تسجيل مستمعي الأحداث
    console.log('🎯 [SOCKET] Registering event listeners...');
    on('new_message', handleNewMessage);
    on('user_typing', handleUserTyping);
    on('user_stopped_typing', handleUserStoppedTyping);
    on('user_online', handleUserOnline);
    on('user_offline', handleUserOffline);
    on('conversation:new', handleConversationCreated);
    on('new_conversation_broadcast', handleNewConversationBroadcast);
    on('new_conversation_offline', handleNewConversationOffline);
    console.log('✅ [SOCKET] Event listeners registered successfully');

    // تنظيف المستمعين عند إلغاء التحميل
    return () => {
      console.log('🧹 [SOCKET] Cleaning up event listeners...');
      off('new_message', handleNewMessage);
      off('user_typing', handleUserTyping);
      off('user_stopped_typing', handleUserStoppedTyping);
      off('user_online', handleUserOnline);
      off('user_offline', handleUserOffline);
      off('conversation:new', handleConversationCreated); // Changed from 'conversation_created' to 'conversation:new'
      off('new_conversation_broadcast', handleNewConversationBroadcast);
      console.log('✅ [SOCKET] Event listeners cleaned up');
    };
  }, [socket, isConnected, selectedConversation, on, off]);



  // تحميل المحادثات عند بدء التشغيل
  useEffect(() => {
    console.log('🚀 ConversationsImprovedFixed component mounted');
    console.log('🔗 Current URL:', window.location.href);
    console.log('🔗 URL search params:', window.location.search);

    // انتظار انتهاء تحميل المصادقة
    if (authLoading) {
      console.log('⏳ Waiting for auth to load...');
      return;
    }

    // التحقق من المصادقة
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, redirecting to login...');
      window.location.href = '/auth/login';
      return;
    }

    // فحص معامل URL فوراً
    const urlParams = new URLSearchParams(window.location.search);
    const conversationIdFromUrl = urlParams.get('conversationId');
    console.log('🎯 Initial conversation ID from URL:', conversationIdFromUrl);

    loadConversations();
  }, [authLoading, isAuthenticated]);

  // معالجة معامل URL عند تحميل المحادثات
  useEffect(() => {
    if (conversations.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const conversationIdFromUrl = urlParams.get('conversationId');

      console.log('🔄 Conversations loaded, checking URL param:', conversationIdFromUrl);

      if (conversationIdFromUrl) {
        const targetConversation = conversations.find(conv => conv.id === conversationIdFromUrl);
        if (targetConversation) {
          console.log('✅ Found target conversation after loading:', targetConversation.customerName);
          selectConversation(conversationIdFromUrl);
        } else {
          console.warn('⚠️ Conversation not found after loading, trying to load from server');
          loadSpecificConversation(conversationIdFromUrl);
        }
      } else if (!selectedConversation) {
        // اختيار أول محادثة إذا لم يكن هناك معامل URL
        console.log('✅ No URL param, selecting first conversation');
        selectConversation(conversations[0].id);
      }
    }
  }, [conversations]);

  // مزامنة الرسائل بين selectedConversation و conversations
  useEffect(() => {
    if (selectedConversation && selectedConversation.messages && selectedConversation.messages.length > 0) {
      setConversations(prev => prev.map(conv => {
        if (conv.id === selectedConversation.id) {
          return {
            ...conv,
            messages: selectedConversation.messages
          };
        }
        return conv;
      }));
    }
  }, [selectedConversation?.messages?.length]); // فقط عندما يتغير عدد الرسائل

  // الاستماع لتغييرات URL
  useEffect(() => {
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const conversationIdFromUrl = urlParams.get('conversationId');

      if (conversationIdFromUrl && conversations.length > 0) {
        const targetConversation = conversations.find(conv => conv.id === conversationIdFromUrl);
        if (targetConversation && selectedConversation?.id !== conversationIdFromUrl) {
          console.log('🔄 URL changed, switching to conversation:', conversationIdFromUrl);
          selectConversation(conversationIdFromUrl);
        }
      }
    };

    // استمع لتغييرات التاريخ
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [conversations, selectedConversation]);

  // تحديث عرض الوقت تلقائياً كل دقيقة
  useEffect(() => {
    const intervalId = setInterval(() => {
      // إجبار React على إعادة الرسم لتحديث عرض الوقت
      setConversations((prev: Conversation[]) => [...prev]);
    }, 60000); // كل دقيقة

    return () => clearInterval(intervalId);
  }, []);

  // دالة لإزالة الرسائل المكررة
  const removeDuplicateMessages = (messages: Message[]): Message[] => {
    console.log('🔄 [DEDUP] Processing', messages.length, 'messages for deduplication');

    const seen = new Set<string>();
    const uniqueMessages: Message[] = [];

    // ترتيب الرسائل حسب الوقت أولاً لضمان الترتيب الصحيح
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    for (const message of sortedMessages) {
      // استخدام ID كمفتاح أساسي مع فحص إضافي للمحتوى
      if (seen.has(message.id)) {
        console.warn(`🔄 [DUPLICATE-REMOVED] Removing duplicate message: ${message.id}`);
        continue;
      }

      seen.add(message.id);

      // إضافة علامة isAiGenerated إذا لم تكن موجودة
      const enhancedMessage = {
        ...message,
        isAiGenerated: message.isAiGenerated ||
          (message.senderId === 'ai_agent') ||
          (message.senderName === 'الذكاء الاصطناعي') ||
          (message.metadata?.isAIGenerated) ||
          false
      };

      uniqueMessages.push(enhancedMessage);
    }

    console.log(`✅ [DEDUP] Kept ${uniqueMessages.length}/${messages.length} unique messages (sorted by timestamp)`);
    return uniqueMessages;
  };

  // معالجة الضغط على Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // دالة لتنسيق عرض التاريخ والوقت
  const formatMessageTime = (date: Date): string => {
    const now = new Date();
    const messageDate = new Date(date);
    
    // إزالة الوقت للمقارنة بالتاريخ فقط
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    // إذا كانت الرسالة اليوم: عرض الوقت
    if (messageDay.getTime() === today.getTime()) {
      return messageDate.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    // إذا كانت الرسالة أمس: عرض "أمس"
    else if (messageDay.getTime() === yesterday.getTime()) {
      return 'أمس';
    }
    // إذا كانت قبل ذلك: عرض التاريخ الميلادي
    else {
      return messageDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  // فلترة المحادثات حسب البحث وترتيبها حسب آخر رسالة
  const filteredConversations = conversations
    .filter(conv =>
      (conv.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // ترتيب حسب آخر رسالة (الأحدث أولاً)
      const timeA = new Date(a.lastMessageTime).getTime();
      const timeB = new Date(b.lastMessageTime).getTime();
      return timeB - timeA;
    });

  // عرض حالة تحميل المصادقة
  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري التحقق من المصادقة...</p>
          </div>
        </div>
      </div>
    );
  }

  // إعادة توجيه إذا لم يكن مصادق
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
              <h3 className="text-yellow-800 font-semibold mb-2">🔐 مطلوب تسجيل الدخول</h3>
              <p className="text-yellow-700 mb-4">يجب تسجيل الدخول للوصول للمحادثات</p>
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                تسجيل الدخول
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل المحادثات...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <h3 className="text-red-800 font-semibold mb-2">❌ خطأ في التحميل</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={loadConversations}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* قائمة المحادثات */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* رأس قائمة المحادثات */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              🚀 المحادثات المحسنة
            </h2>
            {isConnected ? (
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">متصل</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm">{isReconnecting ? 'إعادة الاتصال...' : 'غير متصل'}</span>
              </div>
            )}
          </div>

          {/* أزرار التحكم */}
          <div className="flex items-center space-x-2 mb-4">
            <button
              onClick={() => {
                console.log('🔄 Manual reload conversations');
                loadConversations();
              }}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              title="إعادة تحميل المحادثات"
            >
              🔄 إعادة تحميل
            </button>

            <button
              onClick={() => {
                const urlParams = new URLSearchParams(window.location.search);
                const conversationIdFromUrl = urlParams.get('conversationId');
                console.log('🧪 Manual URL check:', conversationIdFromUrl);
                if (conversationIdFromUrl && conversations.length > 0) {
                  const found = conversations.find(c => c.id === conversationIdFromUrl);
                  console.log('🧪 Found in current list:', found ? 'YES' : 'NO');
                  if (found) {
                    selectConversation(conversationIdFromUrl);
                  } else {
                    loadSpecificConversation(conversationIdFromUrl);
                  }
                }
              }}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              title="اختبار معامل URL"
            >
              🧪 اختبار URL
            </button>
          </div>

          {/* شريط البحث */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* قائمة المحادثات */}
        <div 
          ref={conversationsListRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleConversationsScroll}
        >
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد محادثات'}
            </div>
          ) : (
            <>
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${selectedConversation?.id === conversation.id ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center space-x-3 flex-1 cursor-pointer"
                    onClick={() => selectConversation(conversation.id)}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {conversation.customerName.charAt(0)}
                      </div>
                      {/* مؤشر حالة الاتصال */}
                      {onlineUsers.includes(conversation.id) && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                        <span>{conversation.customerName}</span>
                        {conversation.pageName && (
                          <span className="text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded text-sm">
                            {conversation.pageName}
                          </span>
                        )}
                      </h3>

                      {onlineUsers.includes(conversation.id) && (
                        <span className="text-xs text-green-600 font-medium">متصل</span>
                      )}
                    </div>

                      <div className="flex items-center space-x-1">
                        <p className="text-sm text-gray-500 flex-1">
                          {conversation.lastMessage.length > 40 
                            ? conversation.lastMessage.substring(0, 40) + '...' 
                            : conversation.lastMessage}
                        </p>
                        {/* مؤشر نوع آخر رسالة */}
                        {conversation.messages && (conversation.messages || []).length > 0 && (
                          (() => {
                            const lastMessage = (conversation.messages || [])[(conversation.messages || []).length - 1];
                            if (!lastMessage.isFromCustomer) {
                              return lastMessage.isAiGenerated ? (
                                <CpuChipIcon className="w-3 h-3 text-green-600" title="آخر رسالة من الذكاء الصناعي" />
                              ) : (
                                <UserIcon className="w-3 h-3 text-blue-600" title="آخر رسالة يدوية" />
                              );
                            }
                            return null;
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {formatMessageTime(conversation.lastMessageTime)}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <div className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 mt-1 inline-block">
                          {conversation.unreadCount}
                        </div>
                      )}
                    </div>
                    {/* زر الحذف */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(conversation);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="حذف المحادثة"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
            }
            
            {/* مؤشر تحميل المزيد */}
            {loadingMoreConversations && (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">جاري تحميل المزيد...</p>
              </div>
            )}
            
            {/* رسالة عدم وجود المزيد */}
            {!hasMoreConversations && conversations.length > 0 && (
              <div className="p-4 text-center text-sm text-gray-500">
                تم عرض جميع المحادثات ({totalConversations})
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* منطقة المحادثة */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* شريط علوي مع معلومات المحادثة */}
            <div className="bg-white border-b border-gray-200 p-4">
              {/* عرض اسم الصفحة */}
              {selectedConversation.pageName && (
                <div className="mb-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg inline-block">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">f</span>
                    </div>
                    <span className="text-blue-700 font-medium">صفحة: {selectedConversation.pageName}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedConversation.customerName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedConversation.customerName}</h2>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                      <span>{isConnected ? 'متصل' : 'غير متصل'}</span>
                      {isReconnecting && <span className="text-yellow-600">يعيد الاتصال...</span>}

                      {/* إحصائيات الرسائل */}
                      {selectedConversation.messages && (selectedConversation.messages || []).length > 0 && (
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            👤 {(selectedConversation.messages || []).filter(m => !m.isFromCustomer && !m.isAiGenerated).length} يدوي
                          </span>
                          <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                            🤖 {(selectedConversation.messages || []).filter(m => !m.isFromCustomer && m.isAiGenerated).length} ذكي
                          </span>
                        </div>
                      )}

                      {/* Debug info */}
                      <span className="text-xs text-blue-500 border border-blue-200 px-1 rounded">
                        AI: {selectedConversation.aiEnabled !== undefined ? (selectedConversation.aiEnabled ? 'ON' : 'OFF') : 'UNDEFINED'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* أزرار الإشعارات */}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2 rounded-full hover:bg-gray-100 ${soundEnabled ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    title={soundEnabled ? 'إيقاف الصوت' : 'تفعيل الصوت'}
                  >
                    {soundEnabled ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4c0-1.1.9-2 2-2h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zm14 11V5h-2v15h2zm-4.5-7h-2v2h2v-2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={`p-2 rounded-full hover:bg-gray-100 ${notificationsEnabled ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    title={notificationsEnabled ? 'إيقاف الإشعارات' : 'تفعيل الإشعارات'}
                  >
                    {notificationsEnabled ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 18.69L7.84 6.14 5.27 3.49 4 4.76l2.8 2.8v.01c-.52.99-.8 2.16-.8 3.42v5l-2 2v1h13.73l2 2L21 19.73l-1-1.04zM12 22c1.11 0 2-.89 2-2h-4c0 1.11.89 2 2 2zm4-7.32V11c0-2.76-1.46-5.02-4-5.42V4.5c0-.83-.67-1.5-1.5-1.5S9 3.67 9 4.5v1.08c-.14.04-.28.08-.42.12L16 13.68z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="p-2 text-green-600 hover:text-green-700 rounded-full hover:bg-green-50 border border-green-200"
                    title="إنشاء طلب جديد"
                  >
                    <ShoppingCartIcon className="w-5 h-5" />
                  </button>



                  {/* زر التحكم في الذكاء الاصطناعي مع نص توضيحي */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        console.log('🤖 [AI-BUTTON] Clicked! Conversation:', selectedConversation?.id, 'AI Status:', selectedConversation?.aiEnabled);
                        if (selectedConversation) {
                          handleToggleAI(selectedConversation.id, selectedConversation.aiEnabled ?? true);
                        }
                      }}
                      disabled={!selectedConversation || togglingAI === selectedConversation?.id}
                      className={`p-2 rounded-full transition-all duration-200 ${selectedConversation?.aiEnabled ?? true
                        ? 'text-green-600 bg-green-50 hover:bg-green-100'
                        : 'text-red-600 bg-red-50 hover:bg-red-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={`${selectedConversation?.aiEnabled ?? true ? 'إيقاف' : 'تفعيل'} الذكاء الاصطناعي`}
                    >
                      {togglingAI === selectedConversation?.id ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CpuChipIcon className="w-5 h-5" />
                      )}
                    </button>
                    <span className={`text-xs font-medium ${selectedConversation?.aiEnabled ?? true
                      ? 'text-green-600'
                      : 'text-red-600'
                      }`}>
                      {selectedConversation?.aiEnabled ?? true ? '🤖 مُفعل' : '👤 يدوي'}
                    </span>
                  </div>

                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <PhoneIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <VideoCameraIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <InformationCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* منطقة الرسائل */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              onScroll={handleScroll}
            >
              {/* مؤشر تحميل الرسائل القديمة */}
              {loadingOldMessages && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center space-x-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm">جاري تحميل الرسائل القديمة...</span>
                  </div>
                </div>
              )}

              {(selectedConversation.messages || []).length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد رسائل في هذه المحادثة</p>
                </div>
              ) : (
                <div>
                  {removeDuplicateMessages(selectedConversation.messages || []).map((message, index) => {
                    // إنشاء key فريد يجمع بين ID والفهرس لتجنب التكرار
                    const uniqueKey = message.id ? `${message.id}-${index}` : `temp-${index}-${message.timestamp?.getTime() || Date.now()}`;

                    // تسجيل تشخيصي للرسائل (تم إزالة المكررة بالفعل)
                    if (process.env.NODE_ENV === 'development' && index === 0) {
                      const originalCount = (selectedConversation.messages || []).length;
                      const cleanedCount = removeDuplicateMessages(selectedConversation.messages || []).length;
                      if (originalCount !== cleanedCount) {
                        console.warn(`🔄 [DUPLICATE-CLEANUP] Removed ${originalCount - cleanedCount} duplicate messages`);
                      }
                    }

                    return (
                      <div
                        key={uniqueKey}
                        className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg border-l-4 ${message.isFromCustomer
                            ? 'bg-gray-200 text-gray-800 border-l-gray-400'
                            : message.status === 'sending'
                              ? 'bg-blue-400 text-white opacity-70 border-l-blue-600'
                              : message.isAiGenerated
                                ? 'bg-green-500 text-white border-l-green-700 shadow-green-200 shadow-sm' // رسائل الذكاء الصناعي - أخضر مع ظل
                                : 'bg-blue-500 text-white border-l-blue-700 shadow-blue-200 shadow-sm'  // رسائل يدوية - أزرق مع ظل
                            }`}
                        >
                          {/* عرض الرسائل حسب النوع */}
                          {/* تسجيل تشخيصي لكل رسالة */}
                          {process.env.NODE_ENV === 'development' && console.log('🔍 [MESSAGE-DEBUG] Message data:', {
                            id: message.id,
                            type: message.type,
                            content: message.content,
                            fileUrl: message.fileUrl,
                            fileName: message.fileName,
                            hasFileUrl: !!message.fileUrl,
                            isImageType: message.type === 'image' || message.type === 'IMAGE',
                            willShowAsImage: (message.type === 'image' || message.type === 'IMAGE') && (message.fileUrl || (message.content && message.content.startsWith('http'))),
                            willShowAsFile: (message.type === 'file' || message.type === 'FILE') && message.fileUrl,
                            willShowAsText: !((message.type === 'image' || message.type === 'IMAGE') && (message.fileUrl || (message.content && message.content.startsWith('http')))) && !((message.type === 'file' || message.type === 'FILE') && message.fileUrl)
                          })}

                          {(message.type === 'template' || message.type === 'TEMPLATE') ? (
                            <div className="space-y-2">
                              <img
                                src={message.content}
                                alt="Template"
                                className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(message.content, '_blank')}
                                onError={(e) => {
                                  console.error('❌ Template image load error:', message.content);
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZhaWxlZCB0byBsb2FkIGltYWdlPC90ZXh0Pjwvc3ZnPg==';
                                }}
                              />
                              {message.attachments && (() => {
                                try {
                                  const attachments = JSON.parse(message.attachments);
                                  const template = attachments[0]?.payload;
                                  const element = template?.elements?.[0];
                                  const button = element?.buttons?.[0];
                                  return button ? (
                                    <a
                                      href={button.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`block text-center py-2 px-4 rounded text-sm font-medium transition-colors ${
                                        message.isFromCustomer 
                                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                          : 'bg-white text-blue-600 hover:bg-gray-100 border border-blue-600'
                                      }`}
                                    >
                                      {button.title}
                                    </a>
                                  ) : null;
                                } catch (e) {
                                  console.error('❌ Error parsing template attachments:', e);
                                  return null;
                                }
                              })()}
                            </div>
                          ) : (message.type === 'image' || message.type === 'IMAGE') && (message.fileUrl || (message.content && message.content.startsWith('http'))) ? (
                            <div>
                              {/* تسجيل تشخيصي للصور */}
                              {process.env.NODE_ENV === 'development' && console.log('🖼️ [IMAGE-DEBUG] Rendering image:', {
                                type: message.type,
                                fileUrl: message.fileUrl,
                                content: message.content,
                                fileName: message.fileName,
                                messageId: message.id,
                                finalImageUrl: message.fileUrl || message.content
                              })}
                              <img
                                src={message.fileUrl || message.content}
                                alt={message.fileName || 'صورة'}
                                className="max-w-full h-auto rounded mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(message.fileUrl || message.content, '_blank')}
                                onError={(e) => {
                                  console.error('❌ Image load error:', message.fileUrl || message.content);
                                  console.error('❌ Message data:', JSON.stringify(message, null, 2));
                                  console.error('❌ Error event:', e);
                                  // عرض placeholder بدلاً من إخفاء الصورة
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZhaWxlZCB0byBsb2FkIGltYWdlPC90ZXh0Pjwvc3ZnPg==';
                                  (e.target as HTMLImageElement).alt = 'فشل في تحميل الصورة';
                                }}
                              />
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{message.fileName || 'صورة'}</span>
                                {message.fileSize && (
                                  <span>{(message.fileSize / 1024 / 1024).toFixed(2)} ميجابايت</span>
                                )}
                              </div>
                            </div>
                          ) : (message.type === 'file' || message.type === 'FILE') && message.fileUrl ? (
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                              <PaperClipIcon className="w-5 h-5 text-gray-600" />
                              <div className="flex-1">
                                <a
                                  href={message.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 underline hover:no-underline"
                                >
                                  {message.fileName || message.content}
                                </a>
                                {message.fileSize && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {(message.fileSize / 1024 / 1024).toFixed(2)} ميجابايت
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => window.open(message.fileUrl, '_blank')}
                                className="text-gray-400 hover:text-gray-600"
                                title="فتح الملف"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm">{message.content}</p>
                          )}

                          <div className="flex items-center justify-between text-xs mt-1 opacity-70">
                            <div className="flex items-center space-x-1">
                              {/* أيقونة نوع الرسالة */}
                              {!message.isFromCustomer && (
                                message.isAiGenerated ? (
                                  <CpuChipIcon className="w-3 h-3" title="ذكاء صناعي" />
                                ) : (
                                  <UserIcon className="w-3 h-3" title="رسالة يدوية" />
                                )
                              )}
                              <span>
                                {message.senderName}
                                {!message.isFromCustomer && (
                                  message.isAiGenerated ? ' • 🤖 ذكاء صناعي' : ' • 👤 يدوي'
                                )}
                                {' • '}
                                {message.timestamp.toLocaleTimeString('ar-SA', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {!message.isFromCustomer && (
                              <span className="ml-2">
                                {message.status === 'sending' && '⏳'}
                                {message.status === 'sent' && '✓'}
                                {message.status === 'delivered' && '✓✓'}
                                {message.status === 'read' && '✓✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* مؤشرات الكتابة */}
                  {typingUsers.length > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg max-w-xs">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div key="dot-1" className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                            <div key="dot-2" className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div key="dot-3" className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-xs">العميل يكتب...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* زر الانتقال للأسفل */}
            {showScrollToBottom && (
              <div className="absolute bottom-20 right-6 z-10">
                <button
                  onClick={scrollToBottom}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  {unreadMessagesCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {unreadMessagesCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* معاينة الملفات المختارة */}
            {selectedFiles.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 p-4">
                <div className="space-y-3">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                      <div className="flex items-center space-x-3">
                        {filePreviews[index] ? (
                          <img src={filePreviews[index]} alt="Preview" className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <PaperClipIcon className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} ميجابايت
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={uploadFiles}
                      disabled={uploadingFile}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      {uploadingFile ? 'جاري الرفع...' : `رفع ${selectedFiles.length} ملف`}
                    </button>
                    <button
                      onClick={cancelFileUpload}
                      className="text-gray-500 hover:text-gray-700 p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* منطقة إدخال الرسالة */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  multiple
                />
                <label
                  htmlFor="file-upload"
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <PaperClipIcon className="w-5 h-5" />
                </label>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="اكتب رسالتك هنا..."
                    disabled={sending}
                    className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <FaceSmileIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">اختر محادثة للبدء</h3>
              <p>اختر محادثة من القائمة لعرض الرسائل</p>
            </div>
          </div>
        )}
      </div>



      {/* Order Modal */}
      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        customerId={selectedConversation?.customerId || ''}
        customerName={selectedConversation?.customerName || ''}
        conversationId={selectedConversation?.id || ''}
        onOrderCreated={handleOrderCreated}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && conversationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 ml-2" />
              <h3 className="text-lg font-semibold text-gray-900">تأكيد حذف المحادثة</h3>
            </div>

            <p className="text-gray-600 mb-6">
              هل أنت متأكد من حذف المحادثة مع <strong>{conversationToDelete.customerName}</strong>؟
              <br />
              <span className="text-red-600 text-sm">
                ⚠️ سيتم حذف جميع الرسائل نهائياً ولا يمكن استرجاعها.
              </span>
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteConversation(conversationToDelete.id)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4 ml-2" />
                    حذف نهائياً
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// المكون الرئيسي مع الحماية

const ConversationsImprovedFixed: React.FC = () => {
  return (
    <CompanyProtectedRoute>
      <ConversationsImprovedFixedContent />
    </CompanyProtectedRoute>
  );
};

export default ConversationsImprovedFixed;
