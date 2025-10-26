import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Filter, Calendar, Clock, Star, Target, X } from 'lucide-react';

interface FilterOptions {
  dateRange: {
    start: string;
    end: string;
  };
  ratingType: 'all' | 'positive' | 'negative';
  responseTime: 'all' | 'fast' | 'slow';
  confidence: 'all' | 'high' | 'medium' | 'low';
  intent: 'all' | 'price_inquiry' | 'product_inquiry' | 'shipping_inquiry' | 'general';
  model: 'all' | 'gemini-2.5-pro' | 'gemini-2.0-flash';
}

interface QualityFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const QualityFilters: React.FC<QualityFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onResetFilters,
  isOpen,
  onToggle
}) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApplyFilters();
  };

  const handleReset = () => {
    const defaultFilters: FilterOptions = {
      dateRange: { start: '', end: '' },
      ratingType: 'all',
      responseTime: 'all',
      confidence: 'all',
      intent: 'all',
      model: 'all'
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    onResetFilters();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.dateRange.start || localFilters.dateRange.end) count++;
    if (localFilters.ratingType !== 'all') count++;
    if (localFilters.responseTime !== 'all') count++;
    if (localFilters.confidence !== 'all') count++;
    if (localFilters.intent !== 'all') count++;
    if (localFilters.model !== 'all') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Filter className="w-4 h-4" />
        <span>فلاتر</span>
        {activeFiltersCount > 0 && (
          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <Card className="absolute top-12 left-0 z-50 w-96 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">فلاتر البحث</CardTitle>
              <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                نطاق التاريخ
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={localFilters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...localFilters.dateRange,
                    start: e.target.value
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="من"
                />
                <input
                  type="date"
                  value={localFilters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...localFilters.dateRange,
                    end: e.target.value
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="إلى"
                />
              </div>
            </div>

            {/* Rating Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Star className="w-4 h-4 inline mr-2" />
                نوع التقييم
              </label>
              <select
                value={localFilters.ratingType}
                onChange={(e) => handleFilterChange('ratingType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">جميع التقييمات</option>
                <option value="positive">إيجابي فقط</option>
                <option value="negative">سلبي فقط</option>
              </select>
            </div>

            {/* Response Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                وقت الاستجابة
              </label>
              <select
                value={localFilters.responseTime}
                onChange={(e) => handleFilterChange('responseTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">جميع الأوقات</option>
                <option value="fast">سريع (&lt; 5s)</option>
                <option value="slow">بطيء (&gt; 5s)</option>
              </select>
            </div>

            {/* AI Confidence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Star className="w-4 h-4 inline mr-2" />
                مستوى الثقة
              </label>
              <select
                value={localFilters.confidence}
                onChange={(e) => handleFilterChange('confidence', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">جميع المستويات</option>
                <option value="high">عالي (&gt; 90%)</option>
                <option value="medium">متوسط (70-90%)</option>
                <option value="low">منخفض (&lt; 70%)</option>
              </select>
            </div>

            {/* Intent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4 inline mr-2" />
                نوع الاستفسار
              </label>
              <select
                value={localFilters.intent}
                onChange={(e) => handleFilterChange('intent', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">جميع الأنواع</option>
                <option value="price_inquiry">استفسارات الأسعار</option>
                <option value="product_inquiry">استفسارات المنتجات</option>
                <option value="shipping_inquiry">استفسارات الشحن</option>
                <option value="general">استفسارات عامة</option>
              </select>
            </div>

            {/* AI Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نموذج الذكاء الاصطناعي
              </label>
              <select
                value={localFilters.model}
                onChange={(e) => handleFilterChange('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">جميع النماذج</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 space-x-reverse pt-4 border-t">
              <button
                onClick={handleApply}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                تطبيق الفلاتر
              </button>
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm"
              >
                إعادة تعيين
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QualityFilters;
