import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CommentService from '../../services/commentService';
import { MessageSquare, CheckCircle, Clock, Search, RefreshCw, Edit3, Trash2, Settings } from 'lucide-react';

const UnifiedCommentsManagement = () => {
  const { postId: urlPostId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePostId, setActivePostId] = useState(urlPostId || null);
  const [selectedComments, setSelectedComments] = useState([]); // For bulk operations
  const [postSettings, setPostSettings] = useState(null); // To store post response settings
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

  // Fetch posts
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await CommentService.getFacebookPosts(filters);
      if (response.success) {
        setPosts(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch comments for a specific post
  const fetchComments = async (postId) => {
    setLoading(true);
    try {
      const response = await CommentService.getCommentsByPostId(postId, { status: filters.status });
      if (response.success) {
        setComments(response.data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch post response settings
  const fetchPostSettings = async (postId) => {
    try {
      const response = await CommentService.getPostResponseMethod(postId);
      if (response.success) {
        setPostSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching post settings:', error);
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

  const handleUpdateResponse = async (commentId, response) => {
    if (!response || !response.trim()) {
      alert('الرجاء إدخال رد قبل الحفظ.');
      return;
    }
    
    try {
      const result = await CommentService.sendManualResponseToFacebook(commentId, response);
      if (result.success) {
        // Refresh comments
        if (activePostId) {
          fetchComments(activePostId);
        }
        alert('تم حفظ الرد وإرساله إلى فيسبوك بنجاح!');
      }
    } catch (error) {
      alert('خطأ في تحديث رد التعليق: ' + error.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا التعليق؟')) {
      try {
        const result = await CommentService.deleteFacebookComment(commentId);
        if (result.success) {
          // Refresh comments
          if (activePostId) {
            fetchComments(activePostId);
          }
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const handleViewComments = (postId) => {
    setActivePostId(postId);
    fetchComments(postId);
    fetchPostSettings(postId); // Fetch post settings when viewing comments
    // Update URL without page reload
    window.history.pushState({}, '', `/unified-comments/${postId}`);
  };

  const handleBackToPosts = () => {
    setActivePostId(null);
    // Update URL without page reload
    window.history.pushState({}, '', '/unified-comments');
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedComments.length === 0) {
      alert('الرجاء اختيار تعليقات لحذفها');
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف ${selectedComments.length} تعليق؟`)) {
      try {
        const result = await CommentService.bulkDeleteFacebookComments(selectedComments);
        if (result.success) {
          // Refresh comments
          if (activePostId) {
            fetchComments(activePostId);
          }
          // Clear selection
          setSelectedComments([]);
          alert('تم حذف التعليقات بنجاح');
        }
      } catch (error) {
        console.error('Error deleting comments:', error);
        alert('حدث خطأ أثناء حذف التعليقات: ' + error.message);
      }
    }
  };

  // Handle select/deselect comment
  const toggleCommentSelection = (commentId) => {
    setSelectedComments(prev => {
      if (prev.includes(commentId)) {
        return prev.filter(id => id !== commentId);
      } else {
        return [...prev, commentId];
      }
    });
  };

  // Handle select all comments
  const toggleSelectAll = () => {
    if (selectedComments.length === comments.length) {
      // Deselect all
      setSelectedComments([]);
    } else {
      // Select all
      setSelectedComments(comments.map(comment => comment.id));
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

  useEffect(() => {
    if (activePostId) {
      fetchComments(activePostId);
    } else {
      fetchPosts();
    }
  }, [filters, activePostId]);

  // If we're viewing comments for a specific post
  if (activePostId) {
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
                <h1 className="text-3xl font-bold text-slate-800">تعليقات المنشور</h1>
                <p className="text-slate-600 mt-1">إدارة والرد على تعليقات المنشور المحدد</p>
              </div>
            </div>
          </div>

          {/* Back Button and Post Info */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={handleBackToPosts}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                العودة إلى المنشورات
              </button>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-800 truncate">معرف المنشور: {activePostId}</h2>
                {postSettings && (
                  <div className="mt-1">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getResponseMethodColor(postSettings.responseMethod)}`}>
                      طريقة الرد: {getResponseMethodLabel(postSettings.responseMethod)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/posts/${activePostId}/settings`)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  <Settings className="w-4 h-4" />
                  إعدادات الرد
                </button>
                {selectedComments.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف ({selectedComments.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">الحالة</label>
                <select
                  className="px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">كل التعليقات</option>
                  <option value="responded">تم الرد عليها</option>
                  <option value="pending">قيد الانتظار</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  className="bg-blue-600 text-white py-2 px-4 rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
                  onClick={() => fetchComments(activePostId)}
                >
                  <RefreshCw className="w-4 h-4" />
                  تحديث
                </button>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-white/20">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-slate-600 font-medium">جاري تحميل التعليقات...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">لا توجد تعليقات</h3>
                <p className="text-slate-500">لا توجد تعليقات لهذا المنشور حتى الآن.</p>
              </div>
            ) : (
              <>
                {/* Bulk Actions Bar */}
                {selectedComments.length > 0 && (
                  <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-blue-800">
                      تم اختيار {selectedComments.length} تعليق
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف الكل
                      </button>
                      <button
                        onClick={() => setSelectedComments([])}
                        className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                      >
                        إلغاء الاختيار
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="divide-y divide-slate-200">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-6 hover:bg-blue-50/50 transition-colors">
                      <div className="flex justify-between">
                        <div className="flex items-start gap-3">
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={selectedComments.includes(comment.id)}
                              onChange={() => toggleCommentSelection(comment.id)}
                              className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </div>
                          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-slate-900">{comment.senderName}</h4>
                              <span className="text-xs text-slate-500">{comment.senderId}</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                              {new Date(comment.createdTime).toLocaleString('ar-EG')}
                            </p>
                          </div>
                        </div>
                        <div>
                          {comment.respondedAt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              تم الرد
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" />
                              قيد الانتظار
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 ml-13">
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-slate-800">{comment.message}</p>
                        </div>
                        
                        {comment.response && (
                          <div className="mt-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <p className="text-slate-800">{comment.response}</p>
                            <p className="text-xs text-slate-500 mt-2">
                              رد في: {new Date(comment.respondedAt).toLocaleString('ar-EG')}
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-4 flex flex-wrap gap-2">
                          {!comment.respondedAt && (
                            <button
                              onClick={() => {
                                const response = prompt('اكتب ردك هنا:');
                                if (response !== null) {
                                  handleUpdateResponse(comment.id, response);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                            >
                              <Edit3 className="w-4 h-4" />
                              رد
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default view: Show posts list
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
              <h1 className="text-3xl font-bold text-slate-800">إدارة منشورات وتعليقات فيسبوك</h1>
              <p className="text-slate-600 mt-1">إدارة الردود على التعليقات حسب المنشور</p>
            </div>
          </div>
        </div>

        {/* Filters */}
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

        {/* Posts Table */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-white/20">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-slate-600 font-medium">جاري تحميل المنشورات...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">معرف المنشور</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">آخر تعليق</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">التعليقات</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الردود</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">طريقة الرد</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {posts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-slate-500 text-lg font-medium">لا يوجد منشورات</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      posts.map((post) => (
                        <tr key={post.postId} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-900 font-mono">{post.postId.substring(0, 10)}...</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(post.firstCommentTime).toLocaleDateString('ar-EG')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {post.latestComment ? (
                              <div>
                                <div className="text-sm font-medium text-slate-900">{post.latestComment.senderName}</div>
                                <div className="text-xs text-slate-500 mt-1 max-w-xs truncate" title={post.latestComment.message}>
                                  {post.latestComment.message}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500">لا توجد تعليقات</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                {post.totalComments}
                              </span>
                              <div className="flex gap-1">
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
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${post.responseRate}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{post.responseRate}%</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 inline-flex items-center gap-1 text-xs leading-5 font-bold rounded-full ${getResponseMethodColor(post.responseMethod)}`}>
                              {getResponseMethodLabel(post.responseMethod)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleViewComments(post.postId)}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                عرض التعليقات
                              </button>
                              <button
                                onClick={() => navigate(`/posts/${post.postId}/settings`)}
                                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                إعدادات الرد
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 flex items-center justify-between border-t border-slate-200">
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
      </div>
    </div>
  );
};

export default UnifiedCommentsManagement;