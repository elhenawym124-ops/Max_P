import React, { useState } from 'react';
import { useDateFormat } from '../../hooks/useDateFormat';
import {
  CameraIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
  CalendarDaysIcon,
  BellIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ChartBarIcon,
  FireIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuthSimple';

interface UserStats {
  totalConversations: number;
  responseRate: number;
  averageResponseTime: string;
  customerSatisfaction: number;
  tasksCompleted: number;
  activeHours: number;
}

interface RecentActivity {
  id: string;
  type: 'conversation' | 'task' | 'achievement';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ComponentType<any>;
  color: string;
}

const Profile: React.FC = () => {
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string>('/api/placeholder/150/150');
  const [isOnline, setIsOnline] = useState(true);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || 'أحمد',
    lastName: user?.lastName || 'محمد',
    email: user?.email || 'ahmed@example.com',
    phone: '+966 50 123 4567',
    position: 'مدير خدمة العملاء',
    department: 'خدمة العملاء',
    location: 'الرياض، السعودية',
    bio: 'متخصص في خدمة العملاء مع خبرة 5 سنوات في إدارة المحادثات وحل المشاكل.',
    joinDate: '2023-01-15',
    timezone: 'Asia/Riyadh',
    language: 'العربية'
  });

  // Mock stats data
  const [stats] = useState<UserStats>({
    totalConversations: 1247,
    responseRate: 98.5,
    averageResponseTime: '2.3 دقيقة',
    customerSatisfaction: 4.8,
    tasksCompleted: 89,
    activeHours: 8.5
  });

  // Mock recent activities
  const [recentActivities] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'conversation',
      title: 'محادثة جديدة مع عميل',
      description: 'تم حل مشكلة الطلب #12345 بنجاح',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      icon: ChatBubbleLeftRightIcon,
      color: 'text-blue-600'
    },
    {
      id: '2',
      type: 'achievement',
      title: 'إنجاز جديد',
      description: 'وصلت إلى 1000 محادثة مكتملة',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: TrophyIcon,
      color: 'text-yellow-600'
    },
    {
      id: '3',
      type: 'task',
      title: 'مهمة مكتملة',
      description: 'تم تحديث قاعدة بيانات العملاء',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      icon: CheckIcon,
      color: 'text-green-600'
    }
  ]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://www.mokhtarelhenawy.online'}/api/v1/companies/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('Profile updated successfully:', data.data);
        setIsEditing(false);
        alert('تم حفظ البيانات بنجاح!');
      } else {
        console.error('Failed to update profile:', data.message);
        alert('فشل في حفظ البيانات: ' + (data.message || 'خطأ غير معروف'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      firstName: user?.firstName || 'أحمد',
      lastName: user?.lastName || 'محمد',
      email: user?.email || 'ahmed@example.com',
      phone: '+966 50 123 4567',
      position: 'مدير خدمة العملاء',
      department: 'خدمة العملاء',
      location: 'الرياض، السعودية',
      bio: 'متخصص في خدمة العملاء مع خبرة 5 سنوات في إدارة المحادثات وحل المشاكل.',
      joinDate: '2023-01-15',
      timezone: 'Asia/Riyadh',
      language: 'العربية'
    });
    setIsEditing(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} دقيقة`;
    } else if (diffInMinutes < 1440) {
      return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
    } else {
      return `منذ ${Math.floor(diffInMinutes / 1440)} يوم`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">الملف الشخصي</h1>
          <p className="text-gray-600 mt-2">إدارة معلوماتك الشخصية والمهنية</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Cover Image */}
              <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
              
              {/* Profile Content */}
              <div className="px-6 pb-6">
                {/* Profile Image */}
                <div className="relative -mt-16 mb-4">
                  <div className="relative inline-block">
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                    />
                    <label className="absolute bottom-2 right-2 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                      <CameraIcon className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {/* Online Status */}
                  <div className="absolute top-4 right-4">
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        isOnline ? 'bg-green-500' : 'bg-gray-500'
                      }`}></div>
                      {isOnline ? 'متصل' : 'غير متصل'}
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    {isEditing ? (
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          className="px-3 py-1 border border-gray-300 rounded-md text-lg font-semibold"
                          placeholder="الاسم الأول"
                        />
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          className="px-3 py-1 border border-gray-300 rounded-md text-lg font-semibold"
                          placeholder="الاسم الأخير"
                        />
                      </div>
                    ) : (
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        {formData.firstName} {formData.lastName}
                      </h2>
                    )}
                    
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                        className="px-3 py-1 border border-gray-300 rounded-md text-gray-600"
                        placeholder="المنصب"
                      />
                    ) : (
                      <p className="text-gray-600">{formData.position}</p>
                    )}
                    
                    <p className="text-sm text-gray-500 mt-1">{formData.department}</p>
                  </div>

                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckIcon className="w-4 h-4 mr-2" />
                          حفظ
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4 mr-2" />
                          إلغاء
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4 mr-2" />
                        تعديل
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center text-gray-600">
                    <EnvelopeIcon className="w-5 h-5 mr-3" />
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <span>{formData.email}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <PhoneIcon className="w-5 h-5 mr-3" />
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <span>{formData.phone}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <MapPinIcon className="w-5 h-5 mr-3" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <span>{formData.location}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <CalendarDaysIcon className="w-5 h-5 mr-3" />
                    <span>انضم في {formatDate(formData.joinDate)}</span>
                  </div>
                </div>

                {/* Bio */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">نبذة شخصية</h3>
                  {isEditing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                      placeholder="اكتب نبذة عن نفسك..."
                    />
                  ) : (
                    <p className="text-gray-600">{formData.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي المحادثات</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalConversations.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">معدل الاستجابة</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.responseRate}%</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <ChartBarIcon className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">متوسط وقت الاستجابة</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.averageResponseTime}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <ClockIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">مؤشرات الأداء</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <StarIcon className="w-5 h-5 text-yellow-500 mr-3" />
                    <span className="text-gray-700">تقييم رضا العملاء</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-semibold text-gray-900 mr-2">{stats.customerSatisfaction}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.floor(stats.customerSatisfaction)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <TrophyIcon className="w-5 h-5 text-purple-500 mr-3" />
                    <span className="text-gray-700">المهام المكتملة</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{stats.tasksCompleted}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FireIcon className="w-5 h-5 text-red-500 mr-3" />
                    <span className="text-gray-700">ساعات النشاط اليومي</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{stats.activeHours} ساعة</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <HeartIcon className="w-5 h-5 text-pink-500 mr-3" />
                    <span className="text-gray-700">حالة الصحة المهنية</span>
                  </div>
                  <span className="text-lg font-semibold text-green-600">ممتازة</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Activities & Quick Settings */}
          <div className="space-y-6">
            {/* Quick Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">إعدادات سريعة</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BellIcon className="w-5 h-5 text-gray-500 mr-3" />
                    <span className="text-gray-700">الإشعارات</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <GlobeAltIcon className="w-5 h-5 text-gray-500 mr-3" />
                    <span className="text-gray-700">حالة التوفر</span>
                  </div>
                  <button
                    onClick={() => setIsOnline(!isOnline)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      isOnline 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {isOnline ? 'متاح' : 'مشغول'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClockIcon className="w-5 h-5 text-gray-500 mr-3" />
                    <span className="text-gray-700">المنطقة الزمنية</span>
                  </div>
                  <span className="text-sm text-gray-600">{formData.timezone}</span>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">النشاطات الأخيرة</h3>
              
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const IconComponent = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start space-x-3 space-x-reverse">
                      <div className={`p-2 rounded-lg bg-gray-100`}>
                        <IconComponent className={`w-4 h-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <button className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
                عرض جميع النشاطات
              </button>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">الإنجازات</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <TrophyIcon className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-yellow-800">خبير المحادثات</p>
                </div>
                
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <StarIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-blue-800">نجم الفريق</p>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <CheckIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-green-800">منجز المهام</p>
                </div>
                
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <HeartIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-purple-800">محبوب العملاء</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
