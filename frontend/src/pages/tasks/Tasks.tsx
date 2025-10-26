import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/urlHelper';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  EyeIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  UserIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface Task {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: string;
  assignedTo: string;
  assignedToName: string;
  createdBy: string;
  createdByName: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  tags: string[];
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  endDate: string;
  budget: number;
  spentBudget: number;
  progress: number;
  managerId: string;
  managerName: string;
  teamMembers: string[];
  tags: string[];
  createdAt: string;
}

const Tasks: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'projects'>('tasks');
  const [filters, setFilters] = useState({
    projectId: '',
    status: '',
    priority: '',
    assignedTo: '',
  });

  const [newTask, setNewTask] = useState({
    projectId: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    type: 'general',
    assignedTo: '1',
    assignedToName: 'أحمد المدير',
    createdBy: '1',
    createdByName: 'أحمد المدير',
    dueDate: '',
    estimatedHours: 0,
    tags: [] as string[],
  });

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [filters]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
        const token = localStorage.getItem('accessToken');

      const response = await fetch(buildApiUrl(`tasks?${queryParams}`) , {
        headers : {
          Authorization : `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
              const token = localStorage.getItem('accessToken');

      const response = await fetch(buildApiUrl('projects') , {
        headers : {
          Authorization : `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const createTask = async () => {
    try {
      const response = await fetch(buildApiUrl('tasks'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        setShowCreateTaskModal(false);
        setNewTask({
          projectId: '',
          title: '',
          description: '',
          priority: 'medium',
          type: 'general',
          assignedTo: '1',
          assignedToName: 'أحمد المدير',
          createdBy: '1',
          createdByName: 'أحمد المدير',
          dueDate: '',
          estimatedHours: 0,
          tags: [],
        });
        alert('تم إنشاء المهمة بنجاح');
      } else {
        alert(data.error || 'فشل في إنشاء المهمة');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('فشل في إنشاء المهمة');
    }
  };

  const updateTaskStatus = async (taskId: string, status: string, progress?: number) => {
    try {
      const response = await fetch(buildApiUrl(`tasks/${taskId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, progress }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(data.data);
        }
        alert('تم تحديث حالة المهمة بنجاح');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('فشل في تحديث حالة المهمة');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'in_progress':
        return 'قيد التنفيذ';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'عاجل';
      case 'high':
        return 'عالي';
      case 'medium':
        return 'متوسط';
      case 'low':
        return 'منخفض';
      default:
        return priority;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return dueDate && new Date(dueDate) < new Date() && status !== 'completed';
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
              <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600 mr-3" />
              إدارة المهام والمشاريع
            </h1>
            <p className="mt-2 text-gray-600">تنظيم ومتابعة المهام والمشاريع</p>
          </div>
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            مهمة جديدة
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 space-x-reverse">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              المهام ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'projects'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              المشاريع ({projects.length})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'tasks' && (
        <>
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المشروع
                </label>
                <select
                  value={filters.projectId}
                  onChange={(e) => setFilters({...filters, projectId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">جميع المشاريع</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

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
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الأولوية
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">جميع الأولويات</option>
                  <option value="urgent">عاجل</option>
                  <option value="high">عالي</option>
                  <option value="medium">متوسط</option>
                  <option value="low">منخفض</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المسؤول
                </label>
                <select
                  value={filters.assignedTo}
                  onChange={(e) => setFilters({...filters, assignedTo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">جميع المسؤولين</option>
                  <option value="1">أحمد المدير</option>
                  <option value="2">سارة المستشارة</option>
                  <option value="3">محمد المطور</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setFilters({ projectId: '', status: '', priority: '', assignedTo: '' })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                إعادة تعيين
              </button>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المهمة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المشروع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المسؤول
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الأولوية
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التقدم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ الاستحقاق
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task.id} className={`hover:bg-gray-50 ${isOverdue(task.dueDate, task.status) ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {task.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {task.description.substring(0, 50)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <FolderIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {task.projectName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {task.assignedToName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          <span className="mr-1">{getStatusText(task.status)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {getPriorityText(task.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900 mr-2">
                            {task.progress}%
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center text-sm ${isOverdue(task.dueDate, task.status) ? 'text-red-600' : 'text-gray-900'}`}>
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {task.dueDate ? 
                            formatDate(task.dueDate) : 
                            'غير محدد'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2 space-x-reverse">
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setShowTaskModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          {task.status === 'pending' && (
                            <button
                              onClick={() => updateTaskStatus(task.id, 'in_progress')}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              بدء
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <button
                              onClick={() => updateTaskStatus(task.id, 'completed')}
                              className="text-green-600 hover:text-green-900"
                            >
                              إكمال
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {tasks.length === 0 && (
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مهام</h3>
                <p className="mt-1 text-sm text-gray-500">لم يتم العثور على مهام تطابق المعايير المحددة.</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'projects' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {projects.map((project) => (
              <div key={project.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'active' ? 'bg-green-100 text-green-800' :
                    project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status === 'active' ? 'نشط' :
                     project.status === 'completed' ? 'مكتمل' :
                     project.status === 'planning' ? 'تخطيط' : 'متوقف'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{project.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">التقدم:</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>المدير:</span>
                    <span>{project.managerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الميزانية:</span>
                    <span>{formatPrice(project.budget || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المنفق:</span>
                    <span>{formatPrice(project.spentBudget || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاريخ الانتهاء:</span>
                    <span>{formatDate(project.endDate)}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1">
                  {project.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {projects.length === 0 && (
            <div className="text-center py-12">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مشاريع</h3>
              <p className="mt-1 text-sm text-gray-500">لم يتم إنشاء أي مشاريع بعد.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tasks;
