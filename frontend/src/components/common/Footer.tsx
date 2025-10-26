import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">MaxP AI</h3>
            <p className="text-gray-300 mb-4">
              منصة ذكية لإدارة المحادثات والعملاء باستخدام تقنيات الذكاء الاصطناعي المتقدمة.
            </p>
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} MaxP AI. جميع الحقوق محفوظة.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-md font-semibold mb-4">روابط سريعة</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                  لوحة التحكم
                </Link>
              </li>
              <li>
                <Link to="/customers" className="text-gray-300 hover:text-white transition-colors">
                  العملاء
                </Link>
              </li>
              <li>
                <Link to="/conversations" className="text-gray-300 hover:text-white transition-colors">
                  المحادثات
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-300 hover:text-white transition-colors">
                  المنتجات
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-md font-semibold mb-4">الشروط والأحكام</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-gray-300 hover:text-white transition-colors">
                  سياسة الخصوصية
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-300 hover:text-white transition-colors">
                  شروط الاستخدام
                </Link>
              </li>
              <li>
                <a href="mailto:support@maxp-ai.site" className="text-gray-300 hover:text-white transition-colors">
                  الدعم الفني
                </a>
              </li>
              <li>
                <a href="mailto:legal@maxp-ai.site" className="text-gray-300 hover:text-white transition-colors">
                  الشؤون القانونية
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm mb-4 sm:mb-0">
            تم التطوير بواسطة فريق MaxP AI
          </div>
          <div className="flex space-x-4 space-x-reverse">
            <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
              الخصوصية
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
              الشروط
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
