import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CommentService from '../../services/commentService';
import { MessageSquare, CheckCircle, Clock, Search, RefreshCw, Settings, X, Save } from 'lucide-react';

const PostsManagement = () => {
  const [posts, setPosts] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [pageSettings, setPageSettings] = useState({
    responseMethod: 'manual',
    commentMessages: [''],
    fixedMessengerMessage: '',
    aiPrompt: ''
  });
  const [savingPageSettings, setSavingPageSettings] = useState(false);
  const [pageSettingsMessage, setPageSettingsMessage] = useState('');
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: 'all'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });
  const navigate = useNavigate();

  const fetchPages = async () => {
    setLoadingPages(true);
    try {
      const response = await CommentService.getFacebookPages();
      if (response.success && response.data) {
        setPages(response.data);
        // Auto-select first page if available
        if (response.data.length > 0 && !selectedPage) {
          setSelectedPage(response.data[0].pageId);
        }
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  const fetchPosts = async () => {
    if (!selectedPage) return;
    
    setLoading(true);
    try {
      const response = await CommentService.getPostsByPageId(selectedPage);
      if (response.success) {
        console.log(response.data)
        setPosts(response.data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetchPosts();
      fetchPageSettings();
    }
  }, [selectedPage]);

  const fetchPageSettings = async () => {
    if (!selectedPage) return;
    try {
      const response = await CommentService.getPageResponseMethod(selectedPage);
      if (response.success && response.data) {
        setPageSettings({
          responseMethod: response.data.responseMethod || 'manual',
          commentMessages: response.data.commentMessages ? JSON.parse(response.data.commentMessages) : [''],
          fixedMessengerMessage: response.data.fixedMessengerMessage || '',
          aiPrompt: response.data.aiPrompt || ''
        });
      }
    } catch (error) {
      console.error('Error fetching page settings:', error);
    }
  };

  const savePageSettings = async () => {
    if (pageSettings.responseMethod === 'fixed' && (!pageSettings.commentMessages || pageSettings.commentMessages.length === 0 || !pageSettings.commentMessages[0].trim())) {
      setPageSettingsMessage('الرجاء إدخال رسالة واحدة على الأقل للرد على التعليقات');
      return;
    }

    setSavingPageSettings(true);
    setPageSettingsMessage('');
    try {
      const response = await CommentService.setPageResponseMethod(selectedPage, pageSettings);
      if (response.success) {
        setPageSettingsMessage('تم حفظ إعدادات الصفحة بنجاح ✅');
        setTimeout(() => {
          setShowPageSettings(false);
          setPageSettingsMessage('');
        }, 2000);
      }
    } catch (error) {
      setPageSettingsMessage('حدث خطأ أثناء حفظ الإعدادات: ' + error.message);
    } finally {
      setSavingPageSettings(false);
    }
  };

  const getResponseMethodLabel = (method) => {
    switch (method) {
      case 'ai': return 'رد تلقائي بالذكاء الاصطناعي';
      case 'fixed': return 'رد محدد مسبقًا';
      case 'manual': return 'رد يدوي';
      default: return 'غير محدد';
    }
  };

  const getResponseMethodColor = (method) => {
    switch (method) {
      case 'ai': return 'bg-blue-100 text-blue-800';
      case 'fixed': return 'bg-green-100 text-green-800';
      case 'manual': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">إدارة منشورات فيسبوك</h1>
              <p className="text-slate-600 mt-1">إدارة الردود على التعليقات حسب المنشور</p>
            </div>
          </div>
        </div>

        {/* Page Selector */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
          <label className="block text-sm font-semibold text-slate-700 mb-3">اختر صفحة فيسبوك</label>
          {loadingPages ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page) => (
                <div
                  key={page.pageId}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedPage === page.pageId
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 text-right">
                      <div className="font-bold text-slate-800">{page.pageName}</div>
                      <div className="text-sm text-slate-600 mt-2 flex gap-3">
                        <span>📝 {page.totalPosts} منشور</span>
                        <span>💬 {page.totalComments} تعليق</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPage(page.pageId);
                        setShowPageSettings(true);
                      }}
                      className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex-shrink-0"
                      title="إعدادات الصفحة"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedPage(page.pageId)}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    عرض المنشورات
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        {selectedPage && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">بحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right"
                  placeholder="ابحث في المنشورات..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">الحالة</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">كل المنشورات</option>
                <option value="responded">تم الرد عليها</option>
                <option value="pending">قيد الانتظار</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">عدد العناصر</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right"
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold"
                onClick={() => fetchPosts()}
              >
                <RefreshCw className="w-5 h-5" />
                تحديث
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Posts Grid - Facebook Style */}
        {selectedPage && (
        <div>
          {loading ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-slate-600 font-medium">جاري تحميل المنشورات...</p>
            </div>
          ) : (
            <>
              {posts.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center">
                  <MessageSquare className="w-16 h-16 text-slate-300 mb-4 mx-auto" />
                  <p className="text-slate-500 text-lg font-medium">لا يوجد منشورات</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map((post) => (
                    <div key={post.postId} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-slate-200 overflow-hidden">
                      {/* Post Image */}
                      {post.pictureUrl && (
                        <div className="relative h-48 bg-slate-100 overflow-hidden">
                          <img 
                            src={post.pictureUrl} 
                            alt="Post" 
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}

                      {/* Post Header */}
                      <div className="p-4 border-b border-slate-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-900 truncate" title={post.postId}>
                              منشور #{post.postId.substring(post.postId.length - 8)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {new Date(post.firstCommentTime).toLocaleDateString('ar-EG', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${getResponseMethodColor(post.responseMethod)}`}>
                            {post.responseMethod === 'ai' ? '🤖' : post.responseMethod === 'fixed' ? '📝' : '✋'}
                          </span>
                        </div>

                        {/* Post Description */}
                        {post.message && (
                          <div className="mt-3 text-xs text-slate-600 line-clamp-3" title={post.message}>
                            {post.message}
                          </div>
                        )}
                      </div>

                      {/* Latest Comment Preview */}
                      {post.latestComment && (
                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {post.latestComment.senderName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-700">{post.latestComment.senderName}</div>
                              <div className="text-xs text-slate-600 mt-1 line-clamp-2" title={post.latestComment.message}>
                                {post.latestComment.message}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="p-4 space-y-3">
                        {/* Comments Count */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600 font-medium">التعليقات</span>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                              {post.totalComments}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {post.respondedComments}
                            </span>
                            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {post.pendingComments}
                            </span>
                          </div>
                        </div>

                        {/* Response Rate */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600 font-medium">معدل الرد</span>
                            <span className="text-xs font-bold text-slate-700">{post.responseRate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all" 
                              style={{ width: `${post.responseRate}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Response Method */}
                        <div className="pt-2 border-t border-slate-100">
                          <span className={`px-3 py-1.5 inline-flex items-center gap-1 text-xs font-bold rounded-full w-full justify-center ${getResponseMethodColor(post.responseMethod)}`}>
                            {getResponseMethodLabel(post.responseMethod)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-3 bg-slate-50 flex gap-2">
                        <button
                          onClick={() => navigate(`/posts/${post.postId}/comments`)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          عرض التعليقات
                        </button>
                        <button
                          onClick={() => navigate(`/posts/${post.postId}/settings`)}
                          className="flex-1 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          الإعدادات
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/20">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border-2 border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="mr-3 relative inline-flex items-center px-4 py-2 border-2 border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      التالي
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-700 font-medium">
                        عرض <span className="font-bold text-blue-600">{(pagination.currentPage - 1) * filters.limit + 1}</span> إلى{' '}
                        <span className="font-bold text-blue-600">
                          {Math.min(pagination.currentPage * filters.limit, pagination.totalCount)}
                        </span> من{' '}
                        <span className="font-bold text-blue-600">{pagination.totalCount}</span> نتيجة
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-xl shadow-sm gap-1" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={pagination.currentPage === 1}
                          className="relative inline-flex items-center px-3 py-2 rounded-lg bg-white border-2 border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          السابق
                        </button>
                        {[...Array(Math.min(pagination.totalPages, 7))].map((_, i) => {
                          let page;
                          if (pagination.totalPages <= 7) {
                            page = i + 1;
                          } else if (pagination.currentPage <= 4) {
                            page = i + 1;
                          } else if (pagination.currentPage >= pagination.totalPages - 3) {
                            page = pagination.totalPages - 6 + i;
                          } else {
                            page = pagination.currentPage - 3 + i;
                          }
                          
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                                page === pagination.currentPage
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                                  : 'bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={pagination.currentPage === pagination.totalPages}
                          className="relative inline-flex items-center px-3 py-2 rounded-lg bg-white border-2 border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          التالي
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        )}

        {/* Page Settings Modal */}
        {showPageSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6" />
                  <div>
                    <h2 className="text-2xl font-bold">إعدادات الصفحة</h2>
                    <p className="text-sm text-white/80 mt-1">
                      {pages.find(p => p.pageId === selectedPage)?.pageName || 'صفحة فيسبوك'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPageSettings(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    ℹ️ <strong>ملاحظة مهمة:</strong> هذه الإعدادات ستكون <strong>احتياطية (Fallback)</strong> للمنشورات.
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    • إذا كان المنشور له إعدادات (AI أو Fixed) → يستخدم إعدادات المنشور<br/>
                    • إذا كان المنشور إعداداته Manual أو بدون إعدادات → يستخدم إعدادات الصفحة
                  </p>
                </div>

                {/* Response Method Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">طريقة الرد:</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setPageSettings(prev => ({ ...prev, responseMethod: 'ai' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        pageSettings.responseMethod === 'ai'
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">🤖</div>
                        <div className="font-bold text-slate-800">ذكاء اصطناعي</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setPageSettings(prev => ({ ...prev, responseMethod: 'fixed' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        pageSettings.responseMethod === 'fixed'
                          ? 'border-green-500 bg-green-50 shadow-lg'
                          : 'border-slate-200 hover:border-green-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">📝</div>
                        <div className="font-bold text-slate-800">رد ثابت</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setPageSettings(prev => ({ ...prev, responseMethod: 'manual' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        pageSettings.responseMethod === 'manual'
                          ? 'border-yellow-500 bg-yellow-50 shadow-lg'
                          : 'border-slate-200 hover:border-yellow-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">✋</div>
                        <div className="font-bold text-slate-800">رد يدوي</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* AI Settings */}
                {pageSettings.responseMethod === 'ai' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">البرومبت المخصص (اختياري):</label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                      rows="4"
                      value={pageSettings.aiPrompt}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, aiPrompt: e.target.value }))}
                      placeholder="أدخل تعليمات خاصة للذكاء الاصطناعي..."
                    />
                  </div>
                )}

                {/* Fixed Response Settings */}
                {pageSettings.responseMethod === 'fixed' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">تنويعات الرد على التعليق:</label>
                      {pageSettings.commentMessages.map((msg, index) => (
                        <div key={index} className="mb-2 flex gap-2">
                          <textarea
                            className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                            rows="2"
                            value={msg}
                            onChange={(e) => {
                              const newMessages = [...pageSettings.commentMessages];
                              newMessages[index] = e.target.value;
                              setPageSettings(prev => ({ ...prev, commentMessages: newMessages }));
                            }}
                            placeholder={`رد ${index + 1}...`}
                          />
                          {pageSettings.commentMessages.length > 1 && (
                            <button
                              onClick={() => {
                                const newMessages = pageSettings.commentMessages.filter((_, i) => i !== index);
                                setPageSettings(prev => ({ ...prev, commentMessages: newMessages }));
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setPageSettings(prev => ({ ...prev, commentMessages: [...prev.commentMessages, ''] }));
                        }}
                        className="mt-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition text-sm"
                      >
                        + إضافة رد
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">الرسالة الثابتة في الماسنجر:</label>
                      <textarea
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                        rows="3"
                        value={pageSettings.fixedMessengerMessage}
                        onChange={(e) => setPageSettings(prev => ({ ...prev, fixedMessengerMessage: e.target.value }))}
                        placeholder="أدخل الرسالة التي ستُرسل في الماسنجر..."
                      />
                    </div>
                  </div>
                )}

                {/* Message */}
                {pageSettingsMessage && (
                  <div className={`p-4 rounded-xl text-center font-medium ${
                    pageSettingsMessage.includes('خطأ') || pageSettingsMessage.includes('Error')
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {pageSettingsMessage}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={savePageSettings}
                    disabled={savingPageSettings}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    {savingPageSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </button>
                  <button
                    onClick={() => setShowPageSettings(false)}
                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostsManagement;