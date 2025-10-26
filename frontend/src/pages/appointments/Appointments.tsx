import React, { useState, useEffect } from 'react';
import { useDateFormat } from '../../hooks/useDateFormat';
import {
  CalendarDaysIcon,
  PlusIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  staffId: string;
  staffName: string;
  title: string;
  description: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  type: string;
  location: string;
  meetingLink?: string;
  notes: string;
  createdAt: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: number;
  available: boolean;
}

const Appointments: React.FC = () => {
  const { formatDate } = useDateFormat();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    staffId: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });

  const [newAppointment, setNewAppointment] = useState({
    customerId: '1',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    staffId: '1',
    title: '',
    description: '',
    appointmentDate: '',
    startTime: '',
    type: 'consultation',
    location: 'المكتب الرئيسي',
    meetingLink: '',
    notes: '',
  });

  useEffect(() => {
    fetchAppointments();
  }, [filters]);

  useEffect(() => {
    if (newAppointment.staffId && newAppointment.appointmentDate) {
      fetchAvailableSlots();
    }
  }, [newAppointment.staffId, newAppointment.appointmentDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`https://www.mokhtarelhenawy.online/api/v1/appointments?${queryParams}` , {
        headers : {
          Authorization : `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setAppointments(data.data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const response = await fetch(
        `https://www.mokhtarelhenawy.online/api/v1/appointments/available-slots?staffId=${newAppointment.staffId}&date=${newAppointment.appointmentDate}`
      );
      const data = await response.json();
      
      if (data.success) {
        setAvailableSlots(data.data);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const createAppointment = async () => {
    try {
      const response = await fetch('https://www.mokhtarelhenawy.online/api/v1/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAppointment),
      });

      const data = await response.json();
      if (data.success) {
        fetchAppointments();
        setShowCreateModal(false);
        setNewAppointment({
          customerId: '1',
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          staffId: '1',
          title: '',
          description: '',
          appointmentDate: '',
          startTime: '',
          type: 'consultation',
          location: 'المكتب الرئيسي',
          meetingLink: '',
          notes: '',
        });
        alert('تم حجز الموعد بنجاح');
      } else {
        alert(data.error || 'فشل في حجز الموعد');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('فشل في حجز الموعد');
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string, notes = '') => {
    try {
      const response = await fetch(`https://www.mokhtarelhenawy.online/api/v1/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, notes }),
      });

      const data = await response.json();
      if (data.success) {
        fetchAppointments();
        if (selectedAppointment && selectedAppointment.id === appointmentId) {
          setSelectedAppointment(data.data);
        }
        alert('تم تحديث حالة الموعد بنجاح');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('فشل في تحديث حالة الموعد');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'confirmed':
        return <CheckIcon className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
      case 'no_show':
        return <XMarkIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'confirmed':
        return 'مؤكد';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      case 'no_show':
        return 'لم يحضر';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'consultation':
        return 'استشارة';
      case 'training':
        return 'تدريب';
      case 'meeting':
        return 'اجتماع';
      case 'demo':
        return 'عرض توضيحي';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-indigo-600 mr-3" />
              إدارة المواعيد والتقويم
            </h1>
            <p className="mt-2 text-gray-600">جدولة ومتابعة المواعيد مع العملاء</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            موعد جديد
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحالة
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع الحالات</option>
              <option value="pending">في الانتظار</option>
              <option value="confirmed">مؤكد</option>
              <option value="completed">مكتمل</option>
              <option value="cancelled">ملغي</option>
              <option value="no_show">لم يحضر</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الموظف
            </label>
            <select
              value={filters.staffId}
              onChange={(e) => setFilters({...filters, staffId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع الموظفين</option>
              <option value="1">أحمد المدير</option>
              <option value="2">سارة المستشارة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              النوع
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع الأنواع</option>
              <option value="consultation">استشارة</option>
              <option value="training">تدريب</option>
              <option value="meeting">اجتماع</option>
              <option value="demo">عرض توضيحي</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              من تاريخ
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setFilters({ status: '', staffId: '', type: '', dateFrom: '', dateTo: '' })}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            إعادة تعيين
          </button>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العنوان
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الموظف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ والوقت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المكان
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {appointment.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {appointment.description.substring(0, 50)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.customerPhone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.staffName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(appointment.appointmentDate)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {appointment.startTime} - {appointment.endTime}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getTypeText(appointment.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {getStatusIcon(appointment.status)}
                      <span className="mr-1">{getStatusText(appointment.status)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                      {appointment.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowAppointmentModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      {appointment.status === 'pending' && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          className="text-green-600 hover:text-green-900"
                        >
                          تأكيد
                        </button>
                      )}
                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          إكمال
                        </button>
                      )}
                      {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          className="text-red-600 hover:text-red-900"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {appointments.length === 0 && (
          <div className="text-center py-12">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مواعيد</h3>
            <p className="mt-1 text-sm text-gray-500">لم يتم العثور على مواعيد تطابق المعايير المحددة.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;
