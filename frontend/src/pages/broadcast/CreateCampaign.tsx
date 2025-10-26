import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  CalendarIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PhotoIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { broadcastService } from '../../services/broadcastService';
import CampaignProgressModal from '../../components/broadcast/CampaignProgressModal';

interface CampaignFormData {
  name: string;
  message: string;
  targetAudience: string;
  scheduledAt: string;
  scheduledTime: string;
  recipientCount: number;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  includeImages: boolean;
  trackClicks: boolean;
  autoResend: boolean;
  sendNow: boolean;
  images: File[];
}

interface CustomerList {
  id: string;
  name: string;
  description: string;
  count: number;
  criteria: string;
}

const CreateCampaign: React.FC = () => {
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    message: '',
    targetAudience: '',
    scheduledAt: '',
    scheduledTime: '',
    recipientCount: 0,
    tags: [],
    priority: 'medium',
    includeImages: false,
    trackClicks: true,
    autoResend: false,
    sendNow: false,
    images: [],
  });

  const [customerLists, setCustomerLists] = useState<CustomerList[]>([]);
  const [newTag, setNewTag] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string>('');
  const [currentCampaignName, setCurrentCampaignName] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadCustomerLists();
  }, []);

  const loadCustomerLists = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📋 Loading customer lists using broadcastService...');
      const response = await broadcastService.getCustomerLists();
      console.log('📋 Customer lists response:', response);

      // Handle different response formats
      let listsArray: CustomerList[] = [];
      if (Array.isArray(response)) {
        listsArray = response;
      } else if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray((response as any).data)) {
          listsArray = (response as any).data;
        } else if ('success' in response && 'data' in response && Array.isArray((response as any).data)) {
          listsArray = (response as any).data;
        }
      }

      console.log('✅ Parsed customer lists:', listsArray);
      setCustomerLists(listsArray);
    } catch (err: any) {
      console.error('❌ Error loading customer lists:', err);
      setError(err.message || 'فشل في تحميل قوائم العملاء. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    console.log('📝 Input Change:', { name, value, type });
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Update recipient count when target audience changes
      if (name === 'targetAudience') {
        console.log('🎯 Looking for list with ID:', value);
        console.log('📚 Available lists:', customerLists);
        
        const selectedList = customerLists.find(list => list.id === value);
        console.log('✨ Selected list:', selectedList);
        
        if (selectedList) {
          setFormData(prev => ({ 
            ...prev, 
            recipientCount: selectedList.count || 0 
          }));
        } else {
          console.warn('⚠️ No list found with ID:', value);
          setFormData(prev => ({ 
            ...prev, 
            recipientCount: 0 
          }));
        }
      }
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(tag => tag !== tagToRemove) 
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      images: prev.images.filter((_, i) => i !== index) 
    }));
  };

  const handleSendNowChange = (checked: boolean) => {
    setFormData(prev => ({ 
      ...prev, 
      sendNow: checked,
      scheduledAt: checked ? '' : prev.scheduledAt,
      scheduledTime: checked ? '' : prev.scheduledTime
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'اسم الحملة مطلوب';
    if (!formData.message.trim()) return 'نص الرسالة مطلوب';
    if (!formData.targetAudience) return 'يجب اختيار الجمهور المستهدف';
    
    if (!formData.sendNow) {
      if (!formData.scheduledAt) return 'تاريخ الإرسال مطلوب';
      if (!formData.scheduledTime) return 'وقت الإرسال مطلوب';
      
      const scheduledDateTime = new Date(`${formData.scheduledAt}T${formData.scheduledTime}`);
      const now = new Date();
      const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      if (scheduledDateTime <= now) {
        return 'يجب أن يكون موعد الإرسال في المستقبل';
      }
      
      if (scheduledDateTime > maxDate) {
        return 'لا يمكن جدولة الحملة لأكثر من 24 ساعة مقدماً';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Submitting campaign:', formData);

      // إعداد FormData لإرسال البيانات والملفات
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('message', formData.message);
      formDataToSend.append('targetAudience', formData.targetAudience);
      if (!formData.sendNow) {
        // تحويل التوقيت المحلي إلى UTC بشكل صحيح
        const localDateTime = new Date(`${formData.scheduledAt}T${formData.scheduledTime}`);
        const utcDateTime = localDateTime.toISOString();
        formDataToSend.append('scheduledAt', utcDateTime);
      }
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('includeImages', String(formData.includeImages));
      formDataToSend.append('trackClicks', String(formData.trackClicks));
      formDataToSend.append('autoResend', String(formData.autoResend));
      formDataToSend.append('sendNow', String(formData.sendNow));
      formData.tags.forEach(tag => formDataToSend.append('tags[]', tag));
      formData.images.forEach(file => formDataToSend.append('images', file));

      console.log('📤 Sending campaign data (FormData):', formDataToSend);

      // Create campaign using broadcastService
      const createdCampaign = await broadcastService.createCampaign(formDataToSend);
      console.log('✅ Campaign created successfully:', createdCampaign);

      // If sendNow is true, also send the campaign
      if (createdCampaign.data.status === "sending" ) {
        console.log('📨 Sending campaign immediately...');
        
        // Show progress modal
        setCurrentCampaignId(createdCampaign.data.id);
        setCurrentCampaignName(formData.name);
        setShowProgressModal(true);
        
        try {
          const sendResult = await broadcastService.sendCampaign(createdCampaign.data.id);
          console.log('✅ Campaign sent successfully:', sendResult);
          
          // Check if the send was actually successful
          if (!sendResult.success) {
            throw new Error(sendResult.message || 'فشل في إرسال الحملة');
          }
        } catch (sendError: any) {
          console.error('❌ Error sending campaign:', sendError);
          setShowProgressModal(false);
          throw new Error(`فشل في إرسال الحملة: ${sendError.message || sendError.toString()}`);
        }
      }

      setSuccess(true);
      setSuccessMessage(
        formData.sendNow
          ? `تم إنشاء وإرسال الحملة بنجاح! تم إرسالها إلى ${formData.recipientCount} عميل.`
          : 'تم إنشاء الحملة وجدولتها بنجاح!'
      );

      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage('');
        setFormData({
          name: '',
          message: '',
          targetAudience: '',
          scheduledAt: '',
          scheduledTime: '',
          recipientCount: 0,
          tags: [],
          priority: 'medium',
          includeImages: false,
          trackClicks: true,
          autoResend: false,
          sendNow: false,
          images: [],
        });
      }, 3000);
    } catch (err: any) {
      console.error('❌ Error creating campaign:', err);
      setError(err.message || 'فشل في إنشاء الحملة. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const selectedList = customerLists.find(list => list.id === formData.targetAudience);

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-green-800 mb-2">
            تم إنشاء الحملة بنجاح!
          </h3>
          <p className="text-green-600">{successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                إنشاء حملة برودكاست جديدة
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                قم بإنشاء حملة إرسال جماعي لتصل لعملائك خلال 24 ساعة
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <EyeIcon className="h-4 w-4 ml-2" />
              {previewMode ? 'إخفاء المعاينة' : 'معاينة'}
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="mr-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Form */}
              <div className="space-y-6">
                {/* Campaign Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    اسم الحملة *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="مثال: عرض الجمعة البيضاء"
                    required
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700">
                    الجمهور المستهدف *
                  </label>
                  <select
                    name="targetAudience"
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                    disabled={loading}
                  >
                    <option value="">
                      {loading ? 'جاري التحميل...' : 'اختر قائمة العملاء'}
                    </option>
                    {customerLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name} ({list.count.toLocaleString()} عميل)
                      </option>
                    ))}
                  </select>
                  {selectedList && (
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedList.description}
                    </p>
                  )}
                  {formData.targetAudience && formData.recipientCount > 0 && (
                    <p className="mt-1 text-sm font-medium text-indigo-600">
                      ✓ سيتم الإرسال إلى {formData.recipientCount.toLocaleString()} عميل
                    </p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    نص الرسالة *
                  </label>
                  <textarea
                    name="message"
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="اكتب رسالتك هنا..."
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    عدد الأحرف: {formData.message.length} / 1000
                  </p>
                </div>

                {/* Send Now Option */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sendNow"
                    checked={formData.sendNow}
                    onChange={(e) => handleSendNowChange(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sendNow" className="mr-2 block text-sm font-medium text-gray-700">
                    <PaperAirplaneIcon className="h-5 w-5 inline ml-1" />
                    إرسال فوري (الآن)
                  </label>
                </div>

                {/* Scheduling */}
                {!formData.sendNow && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700">
                        تاريخ الإرسال *
                      </label>
                      <input
                        type="date"
                        name="scheduledAt"
                        id="scheduledAt"
                        value={formData.scheduledAt}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        max={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required={!formData.sendNow}
                      />
                    </div>
                    <div>
                      <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700">
                        وقت الإرسال *
                      </label>
                      <input
                        type="time"
                        name="scheduledTime"
                        id="scheduledTime"
                        value={formData.scheduledTime}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required={!formData.sendNow}
                      />
                    </div>
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <PhotoIcon className="h-5 w-5 inline ml-1" />
                    إرفاق صور (اختياري)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="images"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          <span>اختر الصور</span>
                          <input
                            id="images"
                            name="images"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="pr-1">أو اسحب الصور هنا</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF حتى 10MB
                      </p>
                    </div>
                  </div>
                  
                  {formData.images.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        الصور المرفقة ({formData.images.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {formData.images.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`صورة ${index + 1}`}
                              className="h-20 w-full object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    أولوية الحملة
                  </label>
                  <select
                    name="priority"
                    id="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    العلامات (Tags)
                  </label>
                  <div className="mt-1 flex items-center space-x-2 space-x-reverse">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="أضف علامة جديدة"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="mr-1 h-3 w-3 text-indigo-600 hover:text-indigo-800"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      id="trackClicks"
                      name="trackClicks"
                      type="checkbox"
                      checked={formData.trackClicks}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="trackClicks" className="mr-2 block text-sm text-gray-900">
                      تتبع النقرات والتفاعل
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="includeImages"
                      name="includeImages"
                      type="checkbox"
                      checked={formData.includeImages}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeImages" className="mr-2 block text-sm text-gray-900">
                      تضمين صور في الرسالة
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="autoResend"
                      name="autoResend"
                      type="checkbox"
                      checked={formData.autoResend}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoResend" className="mr-2 block text-sm text-gray-900">
                      إعادة الإرسال للذين لم يقرؤوا (بعد 6 ساعات)
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column - Preview */}
              {previewMode && (
                <div className="lg:sticky lg:top-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      معاينة الرسالة
                    </h4>
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="flex items-center mb-3">
                        <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">ش</span>
                        </div>
                        <div className="mr-3">
                          <p className="text-sm font-medium text-gray-900">شركتك</p>
                          <p className="text-xs text-gray-500">
                            {formData.sendNow 
                              ? 'سيتم الإرسال فوراً' 
                              : (formData.scheduledAt && formData.scheduledTime && 
                                  new Date(`${formData.scheduledAt}T${formData.scheduledTime}`).toLocaleString('ar-EG', {
                                    calendar: 'gregory',
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })
                                )
                            }
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-900 whitespace-pre-wrap">
                        {formData.message || 'اكتب رسالتك لرؤية المعاينة...'}
                      </div>
                      {formData.tags.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex flex-wrap gap-1">
                            {formData.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">المستلمون:</span>
                        <span className="font-medium text-gray-900">
                          {formData.recipientCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">الأولوية:</span>
                        <span className={`font-medium ${
                          formData.priority === 'high' ? 'text-red-600' :
                          formData.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {formData.priority === 'high' ? 'عالية' :
                           formData.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 space-x-reverse pt-5 border-t border-gray-200">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                حفظ كمسودة
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  formData.sendNow 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {loading ? (
                  <>
                    <ClockIcon className="h-4 w-4 ml-2 animate-spin" />
                    {formData.sendNow ? 'جاري الإرسال...' : 'جاري الجدولة...'}
                  </>
                ) : (
                  <>
                    {formData.sendNow ? (
                      <PaperAirplaneIcon className="h-4 w-4 ml-2" />
                    ) : (
                      <CalendarIcon className="h-4 w-4 ml-2" />
                    )}
                    {formData.sendNow ? 'إرسال فوري' : 'جدولة الحملة'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Progress Modal */}
      <CampaignProgressModal
        campaignId={currentCampaignId}
        campaignName={currentCampaignName}
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
      />
    </div>
  );
};

export default CreateCampaign;
