import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CommentService from '../../services/commentService';
import { MessageSquare, CheckCircle, Clock, Edit3, Trash2 } from 'lucide-react';

const PostComments = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComments, setSelectedComments] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all'
  });

  const fetchComments = async () => {
    try {
      const response = await CommentService.getCommentsByPostId(postId, filters);
      if (response.success) {
        setComments(response.data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
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

  const handleUpdateResponse = async (commentId, response) => {
    if (!response || !response.trim()) {
      alert('الرجاء إدخال رد قبل الحفظ.');
      return;
    }
    
    try {
      const result = await CommentService.sendManualResponseToFacebook(commentId, response);
      if (result.success) {
        fetchComments();
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
          fetchComments();
          alert('تم حذف التعليق بنجاح!');
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        alert('خطأ في حذف التعليق: ' + error.message);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedComments.length === 0) {
      alert('الرجاء اختيار تعليقات للحذف');
      return;
    }
    
    if (window.confirm(`هل أنت متأكد من حذف ${selectedComments.length} تعليق؟`)) {
      try {
        const result = await CommentService.bulkDeleteFacebookComments(selectedComments);
        if (result.success) {
          setSelectedComments([]);
          fetchComments();
          alert(`تم حذف ${selectedComments.length} تعليق بنجاح!`);
        }
      } catch (error) {
        console.error('Error bulk deleting comments:', error);
        alert('خطأ في حذف التعليقات: ' + error.message);
      }
    }
  };

  const toggleCommentSelection = (commentId) => {
    setSelectedComments(prev => 
      prev.includes(commentId) 
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedComments.length === comments.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(comments.map(c => c.id));
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId, filters]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/posts')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة إلى المنشورات
        </button>
        <h1 className="text-2xl font-bold text-gray-800">تعليقات المنشور</h1>
        <p className="text-gray-600">معرف المنشور: {postId}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">الحالة</label>
            <select
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right"
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
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              onClick={() => fetchComments()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              تحديث
            </button>
          </div>
          
          <div className="flex items-end">
            <button
              className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
              onClick={() => navigate(`/posts/${postId}/settings`)}
            >
              إعدادات الرد التلقائي
            </button>
          </div>
          
          {selectedComments.length > 0 && (
            <div className="flex items-end">
              <button
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4" />
                حذف المحدد ({selectedComments.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">جاري تحميل التعليقات...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">لا توجد تعليقات</h3>
            <p className="text-gray-500">لا توجد تعليقات لهذا المنشور حتى الآن.</p>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedComments.length === comments.length && comments.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  تحديد الكل ({comments.length})
                </span>
              </label>
            </div>
            
            <div className="divide-y divide-gray-200">
              {comments.map((comment) => (
                <div key={comment.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedComments.includes(comment.id)}
                        onChange={() => toggleCommentSelection(comment.id)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{comment.senderName}</h4>
                          <span className="text-xs text-gray-500">{comment.senderId}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
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
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-800">{comment.message}</p>
                  </div>
                  
                  {comment.response && (
                    <div className="mt-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <p className="text-gray-800">{comment.response}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        رد في: {new Date(comment.respondedAt).toLocaleString('ar-EG')}
                      </p>
                    </div>
                  )}
                  
                  {!comment.respondedAt && (
                    <div className="mt-4 flex flex-wrap gap-2">
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
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </button>
                    </div>
                  )}
                </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PostComments;