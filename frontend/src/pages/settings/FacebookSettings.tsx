import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  TrashIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

import { useDateFormat } from '../../hooks/useDateFormat';
import { useAuth } from '../../hooks/useAuthSimple';
import { companyAwareApi } from '../../services/companyAwareApi';
import FacebookSetupGuide from '../../components/guides/FacebookSetupGuide';
import FacebookDiagnostics from '../../components/FacebookDiagnostics';

interface FacebookPage {
  id: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  status: string;
  connectedAt: string;
  lastActivity: string;
  messageCount: number;
}

interface FacebookConfig {
  appId: string;
  webhookUrl: string;
  verifyToken: string;
  requiredPermissions: string[];
  webhookFields: string[];
}

interface SkippedPage {
  pageId: string;
  pageName: string;
  reason: string;
}

const FacebookSettings: React.FC = () => {
  const { formatDate } = useDateFormat();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [newPageData, setNewPageData] = useState({
    pageAccessToken: ''
  });
  const [pageInfo, setPageInfo] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [skippedPages, setSkippedPages] = useState<SkippedPage[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // انتظار انتهاء تحميل Authentication
    if (authLoading) {
      console.log('⏳ [FacebookSettings] Waiting for auth to load...');
      return;
    }

    console.log('🚀 [FacebookSettings] Auth loaded, loading initial data...', { isAuthenticated, user: user?.email });
    loadFacebookData();
    loadSkippedPages();

    // تحديث تلقائي كل 30 ثانية
    const interval = setInterval(() => {
      console.log('🔄 [FacebookSettings] Auto-refreshing data...');
      loadFacebookData();
    }, 30000);

    return () => {
      console.log('🛑 [FacebookSettings] Component unmounted, clearing interval');
      clearInterval(interval);
    };
  }, [authLoading, isAuthenticated]);

  const loadFacebookData = async () => {
    try {
      console.log('🔄 [FacebookSettings] Starting to load Facebook data...');
      console.log('🔍 [FacebookSettings] Auth state:', {
        authLoading,
        isAuthenticated,
        user: user?.email,
        hasToken: !!localStorage.getItem('accessToken'),
        token: localStorage.getItem('accessToken')?.substring(0, 50) + '...'
      });
      console.log('🔍 [FacebookSettings] User object:', user);
      setLoading(true);

      // التحقق من المصادقة
      if (!isAuthenticated) {
        console.error('❌ [FacebookSettings] User not authenticated');
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // Load connected pages
      console.log('📡 [FacebookSettings] Fetching connected pages...');
      console.log('📡 [FacebookSettings] Making request to:', '/integrations/facebook/connected');
      console.log('📡 [FacebookSettings] With headers:', {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')?.substring(0, 20)}...`,
        'Content-Type': 'application/json'
      });
      const pagesResponse = await companyAwareApi.get('/integrations/facebook/connected');
      console.log('📊 [FacebookSettings] Pages response status:', pagesResponse.status);
      console.log('📊 [FacebookSettings] Pages response headers:', pagesResponse.headers);

      const pagesData = pagesResponse.data;
      console.log('📊 [FacebookSettings] Pages response data:', pagesData);
      console.log('📊 [FacebookSettings] Pages response data structure:', {
        success: pagesData.success,
        pages: pagesData.pages,
        pagesLength: pagesData.pages?.length,
        companyId: pagesData.companyId
      });

      if (pagesData.success) {
        setPages(pagesData.pages || []);
        console.log('✅ [FacebookSettings] Pages loaded successfully:', pagesData.pages?.length || 0, 'pages');
      } else {
        console.error('❌ [FacebookSettings] Pages API returned error:', pagesData.error);
      }

    } catch (error: any) {
      console.error('❌ [FacebookSettings] Error loading Facebook data:', error);
      setError(`خطأ في تحميل بيانات Facebook: ${error.message}`);
    } finally {
      setLoading(false);
      console.log('🏁 [FacebookSettings] Finished loading Facebook data');
    }
  };

  const loadSkippedPages = async () => {
    if (!user?.companyId) {
      return;
    }

    try {
      console.log('🔄 [FacebookSettings] Loading skipped pages for company:', user.companyId);

      const response = await companyAwareApi.get('/facebook-oauth/skipped-pages');

      console.log('✅ [FacebookSettings] Skipped Pages Response:', response.data);

      if (response.data.success && response.data.skippedPages) {
        setSkippedPages(response.data.skippedPages);
        console.log(`📊 [FacebookSettings] Found ${response.data.count} skipped pages`);
      }
    } catch (error: any) {
      console.error('❌ [FacebookSettings] Error loading skipped pages:', error);
    }
  };

  const resolveSkippedPages = async () => {
    if (!user?.companyId) {
      return;
    }

    try {
      console.log('🔄 [FacebookSettings] Resolving skipped pages for company:', user.companyId);

      const response = await companyAwareApi.post('/facebook-oauth/resolve-skipped', {});

      console.log('✅ [FacebookSettings] Resolve Response:', response.data);

      if (response.data.success) {
        setSkippedPages([]);
        setSuccess(`تم وضع علامة على ${response.data.resolvedCount} صفحة كمحلولة`);
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (error: any) {
      console.error('❌ [FacebookSettings] Error resolving skipped pages:', error);
      setError('خطأ في وضع علامة على الصفحات المتخطاة');
      setTimeout(() => setError(null), 5000);
    }
  };

  const validateAccessToken = async (accessToken: string) => {
    if (!accessToken.trim()) {
      console.log('🔍 [FacebookSettings] Empty access token, clearing page info');
      setPageInfo(null);
      return;
    }

    try {
      console.log('🔍 [FacebookSettings] Starting access token validation...');
      console.log('🔑 [FacebookSettings] Token length:', accessToken.length);
      console.log('🔑 [FacebookSettings] Token preview:', accessToken.substring(0, 20) + '...');
      setIsValidating(true);

      const requestBody = {
        pageAccessToken: accessToken
      };
      console.log('📤 [FacebookSettings] Sending validation request:', requestBody);

      const response = await companyAwareApi.post('/integrations/facebook/test', requestBody);

      console.log('📥 [FacebookSettings] Validation response status:', response.status);

      const data = response.data;
      console.log('📥 [FacebookSettings] Validation response data:', data);

      if (data.success && data.data) {
        setPageInfo(data.data);
        console.log('✅ [FacebookSettings] Token validation successful, page info:', data.data);
        alert(`✅ تم التحقق من الصفحة بنجاح: ${data.data.name}`);
      } else {
        setPageInfo(null);
        console.error('❌ [FacebookSettings] Token validation failed:', data);
        if (accessToken.trim()) {
          alert(`❌ فشل التحقق من Access Token: ${data.error || 'غير صحيح أو منتهي الصلاحية'}`);
        }
      }
    } catch (error: any) {
      console.error('❌ [FacebookSettings] Error validating token:', error);
      setPageInfo(null);
      if (accessToken.trim()) {
        alert(`❌ حدث خطأ أثناء التحقق من Access Token: ${error.message}`);
      }
    } finally {
      setIsValidating(false);
      console.log('🏁 [FacebookSettings] Token validation completed');
    }
  };

  const handleConnectPage = async (forceReassign: boolean = false) => {
    if (!newPageData.pageAccessToken || !pageInfo) {
      console.error('❌ [FacebookSettings] Missing required data for connection');
      alert('يرجى إدخال Access Token صحيح والتأكد من صحة بيانات الصفحة');
      return;
    }

    try {
      console.log('🔗 [FacebookSettings] Starting page connection...');
      console.log('📄 [FacebookSettings] Page info:', pageInfo);
      setIsConnecting(true);

      const requestBody = {
        pageId: pageInfo.id,
        pageAccessToken: newPageData.pageAccessToken,
        pageName: pageInfo.name,
        forceReassign: forceReassign
      };
      console.log('📤 [FacebookSettings] Sending connection request:', {
        ...requestBody,
        pageAccessToken: requestBody.pageAccessToken.substring(0, 20) + '...'
      });

      const response = await companyAwareApi.post('/integrations/facebook/connect', requestBody);

      console.log('📥 [FacebookSettings] Connection response status:', response.status);

      const data = response.data;
      console.log('📥 [FacebookSettings] Connection response data:', data);

      if (data.success) {
        console.log('✅ [FacebookSettings] Page connected successfully');
        const message = data.data?.isReassignment 
          ? `✅ تم إعادة تخصيص الصفحة وربطها بنجاح!`
          : `✅ تم ربط الصفحة بنجاح!`;
        
        alert(`${message}

اسم الصفحة: ${pageInfo.name}
معرف الصفحة: ${pageInfo.id}
الحالة: متصل

سيتم تحديث قائمة الصفحات الآن...`);
        setShowConnectModal(false);
        setNewPageData({ pageAccessToken: '' });
        setPageInfo(null);
        // تحديث البيانات بعد ثانية واحدة للتأكد من حفظ البيانات
        setTimeout(() => {
          loadFacebookData();
          loadSkippedPages();
        }, 1000);
      } else {
        console.error('❌ [FacebookSettings] Page connection failed:', data);
        alert(`❌ فشل في ربط الصفحة: ${data.message || data.error}`);
      }
    } catch (error: any) {
      console.error('❌ [FacebookSettings] Error connecting page:', error);
      
      // Handle 403 error (page belongs to another company)
      if (error.response?.status === 403 && error.response?.data?.code === 'PAGE_BELONGS_TO_OTHER_COMPANY') {
        const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'ADMIN';
        
        if (isAdmin || error.response.data.canReassign) {
          const confirmMessage = `⚠️ تحذير: هذه الصفحة مربوطة بشركة أخرى.

هل تريد إعادة تخصيص هذه الصفحة لشركتك الحالية؟

ملاحظة: سيتم فصل الصفحة من الشركة السابقة وربطها بشركتك.`;
          
          if (confirm(confirmMessage)) {
            // Retry with forceReassign flag
            console.log('🔄 [FacebookSettings] User confirmed reassignment, retrying...');
            setIsConnecting(false); // Reset before retry
            await handleConnectPage(true);
            return;
          }
        } else {
          alert(`❌ هذه الصفحة مربوطة بشركة أخرى ولا يمكنك إعادة تخصيصها.

معرف الشركة الحالية: ${error.response.data.existingCompanyId}

يرجى الاتصال بمسؤول النظام للمساعدة.`);
        }
      } else {
        alert(`❌ حدث خطأ أثناء ربط الصفحة: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setIsConnecting(false);
      console.log('🏁 [FacebookSettings] Page connection process completed');
    }
  };

  const handleDisconnectPage = async (pageId: string) => {
    console.log('🗑️ [FacebookSettings] Attempting to disconnect page:', pageId);

    if (!confirm('هل أنت متأكد من إلغاء ربط هذه الصفحة؟')) {
      console.log('🚫 [FacebookSettings] User cancelled page disconnection');
      return;
    }

    try {
      console.log('📤 [FacebookSettings] Sending disconnect request for page:', pageId);

      const response = await companyAwareApi.delete(`/integrations/facebook/${pageId}`);

      console.log('📥 [FacebookSettings] Disconnect response status:', response.status);

      const data = response.data;
      console.log('📥 [FacebookSettings] Disconnect response data:', data);

      if (data.success) {
        console.log('✅ [FacebookSettings] Page disconnected successfully');
        alert(`✅ تم إلغاء ربط الصفحة بنجاح!

معرف الصفحة: ${pageId}
الحالة: غير متصل
تاريخ الإلغاء: ${new Date().toLocaleString('ar-SA')}

سيتم تحديث قائمة الصفحات الآن...`);
        // تحديث البيانات بعد ثانية واحدة للتأكد من حذف البيانات
        setTimeout(() => {
          loadFacebookData();
          loadSkippedPages();
        }, 1000);
      } else {
        console.error('❌ [FacebookSettings] Page disconnection failed:', data);
        alert(`❌ فشل في إلغاء ربط الصفحة: ${data.message || data.error}`);
      }
    } catch (error: any) {
      console.error('❌ [FacebookSettings] Error disconnecting page:', error);
      alert(`❌ حدث خطأ أثناء إلغاء ربط الصفحة: ${error.message}`);
    }
  };

  const testPageConnection = async (pageId: string) => {
    console.log('🧪 [FacebookSettings] Testing page connection:', pageId);

    try {
      const response = await companyAwareApi.get(`/integrations/facebook/page/${pageId}`);

      const data = response.data;
      console.log('✅ [FacebookSettings] Page test result:', data);

      if (data.success) {
        alert(`✅ اختبار الصفحة نجح!\nاسم الصفحة: ${data.data.pageName}\nالحالة: ${data.data.status}`);
      } else {
        alert(`❌ فشل اختبار الصفحة: ${data.error}`);
      }
    } catch (error: any) {
      console.error('❌ [FacebookSettings] Error testing page:', error);
      alert(`❌ خطأ في اختبار الصفحة: ${error.message}`);
    }
  };


  // عرض Loading أثناء انتظار Authentication
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="mr-4 text-gray-600">جاري التحقق من المصادقة...</div>
      </div>
    );
  }

  // عرض Loading أثناء تحميل البيانات
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="mr-4 text-gray-600">جاري تحميل إعدادات Facebook...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <svg className="h-8 w-8 text-blue-600 ml-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              إعدادات Facebook Messenger
            </h1>
            <p className="text-gray-600 mt-1">
              إدارة ربط صفحات Facebook وإعدادات Messenger
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={loadFacebookData}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50"
            >
              <svg className="h-5 w-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'جاري التحديث...' : 'تحديث البيانات'}
            </button>
            <button
              onClick={() => setShowDiagnostics(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
            >
              <WrenchScrewdriverIcon className="h-5 w-5 ml-2" />
              تشخيص المشاكل
            </button>
            <button
              onClick={() => setShowSetupGuide(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
            >
              <QuestionMarkCircleIcon className="h-5 w-5 ml-2" />
              دليل الإعداد
            </button>
            <button
              onClick={() => setShowConnectModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              ربط صفحة جديدة
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
            <p className="text-green-800 whitespace-pre-line">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="mr-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 ml-2" />
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mr-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Skipped Pages Warning */}
      {skippedPages.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 ml-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                صفحات لم يتم ربطها ({skippedPages.length})
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                الصفحات التالية مربوطة بالفعل بشركة أخرى ولا يمكن ربطها:
              </p>
              <div className="space-y-2">
                {skippedPages.map((page) => (
                  <div 
                    key={page.pageId} 
                    className="flex items-center p-3 bg-white rounded-md border border-yellow-300"
                  >
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center ml-3">
                      <span className="text-yellow-600 text-sm">📘</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{page.pageName}</h4>
                      <p className="text-xs text-gray-500">Page ID: {page.pageId}</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      مربوطة بحساب آخر
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-100 rounded-md">
                <p className="text-sm text-yellow-900 mb-3">
                  <strong>💡 ملاحظة:</strong> لربط هذه الصفحات، يجب أولاً فك ربطها من الشركة الأخرى التي تستخدمها حالياً.
                </p>
                <button
                  onClick={resolveSkippedPages}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                >
                  ✓ تم الاطلاع - إخفاء هذا التنبيه
                </button>
              </div>
            </div>
            <button
              onClick={resolveSkippedPages}
              className="mr-2 text-yellow-600 hover:text-yellow-800 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Connected Pages */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">الصفحات المربوطة</h2>
              <p className="text-sm text-gray-600">
                إدارة صفحات Facebook المربوطة بحسابك ({pages?.length || 0} صفحة)
              </p>
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              <svg className="h-4 w-4 ml-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
              <span className="text-xs text-gray-400 mr-2">(تحديث تلقائي كل 30 ثانية)</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {!pages || pages.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد صفحات مربوطة</h3>
              <p className="mt-1 text-sm text-gray-500">
                ابدأ بربط صفحة Facebook لاستقبال الرسائل
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  ربط صفحة Facebook
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pages && pages.map((page) => (
                <div key={page.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {page.status === 'connected' ? (
                          <CheckCircleIcon className="h-8 w-8 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
                        )}
                      </div>
                      <div className="mr-4">
                        <h3 className="text-lg font-medium text-gray-900">{page.pageName}</h3>
                        <p className="text-sm text-gray-500">الحالة: {page.status === 'connected' ? 'نشط' : 'غير نشط'}</p>
                        <p className="text-xs text-gray-400">
                          معرف الصفحة: {page.pageId}
                        </p>
                        {page.connectedAt && (
                          <p className="text-xs text-gray-400">
                            تم الربط: {formatDate(page.connectedAt)}
                          </p>
                        )}
                        {page.lastActivity && (
                          <p className="text-xs text-gray-400">
                            آخر نشاط: {formatDate(page.lastActivity)}
                          </p>
                        )}
                        {page.messageCount !== undefined && (
                          <p className="text-xs text-gray-400">
                            عدد الرسائل: {page.messageCount}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        page.status === 'connected'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {page.status === 'connected' ? 'متصل' : 'غير متصل'}
                      </span>
                      {page.status === 'connected' && (
                        <button
                          onClick={() => testPageConnection(page.pageId)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="اختبار الاتصال"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDisconnectPage(page.pageId)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="إلغاء الربط"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Connect Page Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ربط صفحة Facebook</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Access Token
                </label>
                <textarea
                  value={newPageData.pageAccessToken}
                  onChange={(e) => {
                    const token = e.target.value;
                    setNewPageData({pageAccessToken: token});
                    validateAccessToken(token);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="أدخل Page Access Token من Facebook Developer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  سيتم جلب معلومات الصفحة تلقائياً عند إدخال Access Token صحيح
                </p>
              </div>

              {isValidating && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="mr-2 text-sm text-gray-600">جاري التحقق من Access Token...</span>
                </div>
              )}

              {pageInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 ml-2" />
                    <h4 className="font-medium text-green-900">تم العثور على الصفحة</h4>
                  </div>
                  <div className="mt-2 text-sm text-green-700">
                    <p><strong>اسم الصفحة:</strong> {pageInfo.name}</p>
                    <p><strong>معرف الصفحة:</strong> {pageInfo.id}</p>
                    <p><strong>الفئة:</strong> {pageInfo.category}</p>
                  </div>
                </div>
              )}

              {newPageData.pageAccessToken && !isValidating && !pageInfo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 ml-2" />
                    <h4 className="font-medium text-red-900">Access Token غير صحيح</h4>
                  </div>
                  <p className="mt-1 text-sm text-red-700">
                    تأكد من أن Access Token صحيح وله الصلاحيات المطلوبة
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleConnectPage}
                disabled={isConnecting || isValidating || !pageInfo}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isConnecting ? 'جاري الربط...' : 'ربط الصفحة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">دليل إعداد Facebook Messenger</h3>
              <button
                onClick={() => setShowSetupGuide(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FacebookSetupGuide />
          </div>
        </div>
      )}

      {/* Diagnostics Modal */}
      {showDiagnostics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">تشخيص Facebook Integration</h2>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <FacebookDiagnostics />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacebookSettings;
