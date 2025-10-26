import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Facebook, MessageSquare, Settings, ChevronDown, ChevronUp } from 'lucide-react';

const PageCommentsManagement = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedPage, setExpandedPage] = useState(null);
  const [posts, setPosts] = useState({});
  const [pageSettings, setPageSettings] = useState({});
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const navigate = useNavigate();

  // Fetch all pages
  const fetchPages = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/v1/comments/facebook-pages');
      if (response.data.success) {
        setPages(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch posts for a specific page
  const fetchPostsForPage = async (pageId) => {
    try {
      const response = await axios.get(`/api/v1/comments/facebook-pages/${pageId}/posts`);
      if (response.data.success) {
        setPosts(prev => ({ ...prev, [pageId]: response.data.data }));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  // Fetch page settings
  const fetchPageSettings = async (pageId) => {
    try {
      const response = await axios.get(`/api/v1/comments/facebook-pages/${pageId}/response-method`);
      if (response.data.success) {
        setPageSettings(prev => ({ ...prev, [pageId]: response.data.data }));
      }
    } catch (error) {
      console.error('Error fetching page settings:', error);
    }
  };

  // Toggle page expansion
  const togglePageExpansion = async (pageId) => {
    if (expandedPage === pageId) {
      setExpandedPage(null);
    } else {
      setExpandedPage(pageId);
      if (!posts[pageId]) {
        await fetchPostsForPage(pageId);
      }
      if (!pageSettings[pageId]) {
        await fetchPageSettings(pageId);
      }
    }
  };

  // Open settings modal
  const openSettingsModal = (page) => {
    setSelectedPage(page);
    setShowSettingsModal(true);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <Facebook className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">إدارة التعليقات حسب الصفحة</h1>
              <p className="text-slate-600 mt-1">إدارة إعدادات الرد على التعليقات لكل صفحة فيسبوك</p>
            </div>
          </div>
        </div>

        {/* Pages List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600 font-medium">جاري تحميل الصفحات...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.pageId} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-white/20">
                {/* Page Header */}
                <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Facebook className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">{page.pageName}</h3>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          <span>📝 {page.totalPosts} منشور</span>
                          <span>💬 {page.totalComments} تعليق</span>
                          <span>✅ {page.respondedComments} تم الرد</span>
                          <span>⏳ {page.pendingComments} قيد الانتظار</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openSettingsModal(page)}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        title="إعدادات الصفحة"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => togglePageExpansion(page.pageId)}
                        className="p-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                      >
                        {expandedPage === page.pageId ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Page Settings Summary */}
                  {pageSettings[page.pageId] && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold">طريقة الرد:</span>
                        <span className={`px-2 py-1 rounded ${
                          pageSettings[page.pageId].responseMethod === 'ai' ? 'bg-purple-100 text-purple-700' :
                          pageSettings[page.pageId].responseMethod === 'fixed' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {pageSettings[page.pageId].responseMethod === 'ai' ? '🤖 ذكاء اصطناعي' :
                           pageSettings[page.pageId].responseMethod === 'fixed' ? '📌 رد ثابت' :
                           '✋ يدوي'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Posts List (Expanded) */}
                {expandedPage === page.pageId && (
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-slate-800 mb-4">منشورات الصفحة</h4>
                    {posts[page.pageId] && posts[page.pageId].length > 0 ? (
                      <div className="space-y-3">
                        {posts[page.pageId].map((post) => (
                          <div key={post.postId} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm text-slate-600 font-mono truncate">{post.postId}</p>
                                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                                  <span>💬 {post.totalComments} تعليق</span>
                                  <span>✅ {post.respondedComments} تم الرد</span>
                                  <span>⏳ {post.pendingComments} قيد الانتظار</span>
                                  <span>📊 {post.responseRate}% معدل الرد</span>
                                </div>
                              </div>
                              <button
                                onClick={() => navigate(`/comments/post/${post.postId}`)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                              >
                                عرض التعليقات
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 py-8">لا توجد منشورات لهذه الصفحة</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {pages.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Facebook className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">لا توجد صفحات متصلة</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && selectedPage && (
        <PageSettingsModal
          page={selectedPage}
          settings={pageSettings[selectedPage.pageId]}
          onClose={() => setShowSettingsModal(false)}
          onSave={async () => {
            await fetchPageSettings(selectedPage.pageId);
            setShowSettingsModal(false);
          }}
        />
      )}
    </div>
  );
};

// Page Settings Modal Component
const PageSettingsModal = ({ page, settings, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    responseMethod: settings?.responseMethod || 'manual',
    aiPrompt: settings?.aiPrompt || '',
    fixedCommentMessage: settings?.fixedCommentMessage || '',
    fixedMessengerMessage: settings?.fixedMessengerMessage || '',
    messengerMessages: settings?.messengerMessages ? JSON.parse(settings.messengerMessages) : ['']
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.post(`/api/v1/comments/facebook-pages/${page.pageId}/response-method`, formData);
      if (response.data.success) {
        alert('تم حفظ الإعدادات بنجاح');
        onSave();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">إعدادات الصفحة: {page.pageName}</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Response Method */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">طريقة الرد</label>
            <select
              value={formData.responseMethod}
              onChange={(e) => setFormData({ ...formData, responseMethod: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="manual">يدوي</option>
              <option value="ai">ذكاء اصطناعي</option>
              <option value="fixed">رد ثابت</option>
            </select>
          </div>

          {/* AI Prompt */}
          {formData.responseMethod === 'ai' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">برومبت الذكاء الاصطناعي</label>
              <textarea
                value={formData.aiPrompt}
                onChange={(e) => setFormData({ ...formData, aiPrompt: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="6"
                placeholder="أدخل البرومبت المخصص..."
              />
            </div>
          )}

          {/* Fixed Messages */}
          {formData.responseMethod === 'fixed' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">الرد الثابت على التعليق</label>
                <textarea
                  value={formData.fixedCommentMessage}
                  onChange={(e) => setFormData({ ...formData, fixedCommentMessage: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="أدخل الرد الثابت..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">الرسالة الثابتة في الماسنجر</label>
                <textarea
                  value={formData.fixedMessengerMessage}
                  onChange={(e) => setFormData({ ...formData, fixedMessengerMessage: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="أدخل الرسالة الثابتة..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">تنويعات رسائل الماسنجر</label>
                {formData.messengerMessages.map((msg, index) => (
                  <div key={index} className="mb-2 flex gap-2">
                    <textarea
                      value={msg}
                      onChange={(e) => {
                        const newMessages = [...formData.messengerMessages];
                        newMessages[index] = e.target.value;
                        setFormData({ ...formData, messengerMessages: newMessages });
                      }}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="2"
                      placeholder={`رسالة ${index + 1}...`}
                    />
                    {formData.messengerMessages.length > 1 && (
                      <button
                        onClick={() => {
                          const newMessages = formData.messengerMessages.filter((_, i) => i !== index);
                          setFormData({ ...formData, messengerMessages: newMessages });
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    setFormData({ ...formData, messengerMessages: [...formData.messengerMessages, ''] });
                  }}
                  className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  + إضافة رسالة
                </button>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageCommentsManagement;
