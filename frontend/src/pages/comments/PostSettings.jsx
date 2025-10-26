import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CommentService from '../../services/commentService';
import { Bot, MessageSquare, Settings } from 'lucide-react';

const PostSettings = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postSettings, setPostSettings] = useState({
    responseMethod: 'manual', // 'ai', 'fixed', 'manual'
    commentMessages: [''], // Variations for comment responses
    fixedMessengerMessage: '',
    aiPrompt: ''
  });
  const [message, setMessage] = useState('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const fetchPostSettings = async () => {
    try {
      const response = await CommentService.getPostResponseMethod(postId);
      if (response.success && response.data) {
        setPostSettings({
          responseMethod: response.data.responseMethod || 'manual',
          commentMessages: response.data.commentMessages ? JSON.parse(response.data.commentMessages) : [''],
          fixedMessengerMessage: response.data.fixedMessengerMessage || '',
          aiPrompt: response.data.aiPrompt || ''
        });
        
        // Check if we're in fallback mode
        if (response.data.updatedAt && !response.data.id) {
          setIsFallbackMode(true);
        }
      }
    } catch (error) {
      console.error('Error fetching post settings:', error);
      setMessage('حدث خطأ أثناء تحميل إعدادات المنشور');
    } finally {
      setLoading(false);
    }
  };

  const savePostSettings = async () => {
    if (postSettings.responseMethod === 'fixed' && (!postSettings.commentMessages || postSettings.commentMessages.length === 0 || !postSettings.commentMessages[0].trim())) {
      setMessage('الرجاء إدخال رسالة واحدة على الأقل للرد على التعليقات');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const response = await CommentService.setPostResponseMethod(postId, postSettings);
      if (response.success) {
        setMessage(response.message || 'تم حفظ إعدادات المنشور بنجاح');
        
        // Check if we're in fallback mode
        if (response.message && response.message.includes('fallback')) {
          setIsFallbackMode(true);
        }
        
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving post settings:', error);
      setMessage('حدث خطأ أثناء حفظ إعدادات المنشور: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const applyResponseMethod = async () => {
    if (isFallbackMode) {
      setMessage('لا يمكن تطبيق طريقة الرد في وضع التخزين المؤقت. يرجى تشغيل قاعدة البيانات.');
      return;
    }
    
    if (window.confirm('هل أنت متأكد من تطبيق طريقة الرد على جميع التعليقات المعلقة في هذا المنشور؟')) {
      try {
        const response = await CommentService.applyPostResponseMethod(postId);
        if (response.success) {
          setMessage(`تم معالجة ${response.data.processedComments} تعليق`);
          setTimeout(() => setMessage(''), 3000);
        }
      } catch (error) {
        console.error('Error applying response method:', error);
        setMessage('حدث خطأ أثناء تطبيق طريقة الرد: ' + error.message);
      }
    }
  };

  useEffect(() => {
    fetchPostSettings();
  }, [postId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">جاري تحميل إعدادات المنشور...</p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-800">إعدادات المنشور</h1>
        <p className="text-gray-600">معرف المنشور: {postId}</p>
        {isFallbackMode && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            ⚠️ وضع التخزين المؤقت: يتم تخزين الإعدادات محليًا حتى يتم تشغيل قاعدة البيانات
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              طريقة الرد التلقائي
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">اختر طريقة الرد:</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      postSettings.responseMethod === 'ai' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPostSettings(prev => ({ ...prev, responseMethod: 'ai' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">الذكاء الاصطناعي</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      الرد تلقائيًا باستخدام الذكاء الاصطناعي المدرب على منتجاتك وخدماتك
                    </p>
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      postSettings.responseMethod === 'fixed' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPostSettings(prev => ({ ...prev, responseMethod: 'fixed' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      <span className="font-medium">رسالة محددة</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      الرد برسالة محددة مسبقًا على جميع التعليقات
                    </p>
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      postSettings.responseMethod === 'manual' 
                        ? 'border-yellow-500 bg-yellow-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPostSettings(prev => ({ ...prev, responseMethod: 'manual' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="font-medium">رد يدوي</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      الرد يدويًا على كل تعليق بشكل فردي
                    </p>
                  </div>
                </div>
              </div>
              
              {postSettings.responseMethod === 'ai' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">برومبت الذكاء الاصطناعي (اختياري):</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="6"
                    value={postSettings.aiPrompt}
                    onChange={(e) => setPostSettings(prev => ({ ...prev, aiPrompt: e.target.value }))}
                    placeholder="أدخل برومبت مخصص للذكاء الاصطناعي لهذا المنشور..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    إذا تركت هذا الحقل فارغاً، سيتم استخدام البرومبت الأساسي للـ AI Agent
                  </p>
                </div>
              )}
              
              {postSettings.responseMethod === 'fixed' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تنويعات الرد على التعليق:</label>
                    {postSettings.commentMessages.map((msg, index) => (
                      <div key={index} className="mb-2 flex gap-2">
                        <textarea
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows="2"
                          value={msg}
                          onChange={(e) => {
                            const newMessages = [...postSettings.commentMessages];
                            newMessages[index] = e.target.value;
                            setPostSettings(prev => ({ ...prev, commentMessages: newMessages }));
                          }}
                          placeholder={`رد ${index + 1}...`}
                        />
                        {postSettings.commentMessages.length > 1 && (
                          <button
                            onClick={() => {
                              const newMessages = postSettings.commentMessages.filter((_, i) => i !== index);
                              setPostSettings(prev => ({ ...prev, commentMessages: newMessages }));
                            }}
                            className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setPostSettings(prev => ({ ...prev, commentMessages: [...prev.commentMessages, ''] }));
                      }}
                      className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition text-sm"
                    >
                      + إضافة رد
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الرسالة الثابتة في الماسنجر:</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      value={postSettings.fixedMessengerMessage}
                      onChange={(e) => setPostSettings(prev => ({ ...prev, fixedMessengerMessage: e.target.value }))}
                      placeholder="أدخل الرسالة التي ستُرسل في الماسنجر..."
                    />
                  </div>
                  
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={savePostSettings}
                disabled={saving}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button>
              
              {postSettings.responseMethod !== 'manual' && !isFallbackMode && (
                <button
                  onClick={applyResponseMethod}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition"
                >
                  تطبيق طريقة الرد على التعليقات المعلقة
                </button>
              )}
              
              {isFallbackMode && postSettings.responseMethod !== 'manual' && (
                <button
                  disabled
                  className="bg-gray-400 text-white py-2 px-4 rounded-md cursor-not-allowed"
                >
                  تطبيق طريقة الرد (غير متوفر في وضع التخزين المؤقت)
                </button>
              )}
              
              <button
                onClick={() => navigate(`/posts/${postId}/comments`)}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition"
              >
                عرض تعليقات المنشور
              </button>
            </div>
            
            {message && (
              <div className={`mt-4 p-3 rounded text-center text-sm ${
                message.includes('خطأ') || message.includes('Error') 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
        
        {/* Instructions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">كيفية الاستخدام</h2>
            <div className="space-y-4">
              <div className="border-r-4 border-blue-500 pr-3">
                <h3 className="font-medium text-gray-800">الذكاء الاصطناعي</h3>
                <p className="text-sm text-gray-600 mt-1">
                  يحلل كل تعليق بشكل فردي ويقدم رداً مخصصاً بناءً على محتوى التعليق ومنتجاتك.
                </p>
              </div>
              
              <div className="border-r-4 border-green-500 pr-3">
                <h3 className="font-medium text-gray-800">رسالة محددة</h3>
                <p className="text-sm text-gray-600 mt-1">
                  يرسل نفس الرسالة المحددة مسبقًا كرد على جميع التعليقات المعلقة.
                </p>
              </div>
              
              <div className="border-r-4 border-yellow-500 pr-3">
                <h3 className="font-medium text-gray-800">رد يدوي</h3>
                <p className="text-sm text-gray-600 mt-1">
                  يمكنك الرد على كل تعليق بشكل فردي يدويًا كما تفعل عادة.
                </p>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-800 mb-2">نصائح مهمة:</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc pr-5">
                  <li>يمكنك تغيير طريقة الرد في أي وقت</li>
                  <li>تطبيق طريقة الرد يؤثر فقط على التعليقات المعلقة</li>
                  <li>التعليقات التي تم الرد عليها مسبقًا لن تتأثر</li>
                  {isFallbackMode && (
                    <li className="text-yellow-600 font-medium">⚠️ الإعدادات مخزنة مؤقتًا محليًا</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostSettings;