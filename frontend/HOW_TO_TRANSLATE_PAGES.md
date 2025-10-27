# دليل ترجمة الصفحات | Page Translation Guide

## 🌍 كيفية إضافة الترجمة لأي صفحة

### الخطوة 1: استيراد useTranslation

في أي صفحة أو مكون، أضف:

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  // استخدم t() للترجمة
  return <h1>{t('dashboard.title')}</h1>;
};
```

### الخطوة 2: استبدال النصوص الثابتة

#### ❌ قبل (نص ثابت):
```typescript
<h1>لوحة التحكم</h1>
<button>حفظ</button>
<p>لا توجد بيانات</p>
```

#### ✅ بعد (مع الترجمة):
```typescript
<h1>{t('dashboard.title')}</h1>
<button>{t('common.save')}</button>
<p>{t('pages.noData')}</p>
```

## 📚 المفاتيح المتاحة للاستخدام

### 1. Common (مشترك)
```typescript
t('common.loading')        // جاري التحميل... / Loading...
t('common.save')          // حفظ / Save
t('common.cancel')        // إلغاء / Cancel
t('common.delete')        // حذف / Delete
t('common.edit')          // تعديل / Edit
t('common.add')           // إضافة / Add
t('common.search')        // بحث / Search
t('common.submit')        // إرسال / Submit
```

### 2. Pages (صفحات عامة)
```typescript
t('pages.welcome')         // مرحباً / Welcome
t('pages.noData')         // لا توجد بيانات / No data available
t('pages.loadMore')       // تحميل المزيد / Load More
t('pages.refresh')        // تحديث / Refresh
t('pages.saveSuccess')    // تم الحفظ بنجاح / Saved successfully
t('pages.deleteConfirm')  // هل أنت متأكد من الحذف؟ / Are you sure?
```

### 3. Dashboard
```typescript
t('dashboard.title')           // لوحة التحكم / Dashboard
t('dashboard.welcome')         // مرحباً / Welcome
t('dashboard.totalCustomers')  // إجمالي العملاء / Total Customers
t('dashboard.totalOrders')     // إجمالي الطلبات / Total Orders
```

### 4. Customers
```typescript
t('customers.title')          // العملاء / Customers
t('customers.addCustomer')    // إضافة عميل / Add Customer
t('customers.customerList')   // قائمة العملاء / Customer List
```

### 5. Products
```typescript
t('products.title')           // المنتجات / Products
t('products.addProduct')      // إضافة منتج / Add Product
t('products.productName')     // اسم المنتج / Product Name
t('products.productPrice')    // السعر / Price
```

### 6. Orders
```typescript
t('orders.title')            // الطلبات / Orders
t('orders.orderNumber')      // رقم الطلب / Order Number
t('orders.orderStatus')      // حالة الطلب / Order Status
t('orders.pending')          // قيد الانتظار / Pending
t('orders.completed')        // مكتمل / Completed
```

### 7. Sidebar
```typescript
t('sidebar.dashboard')        // لوحة التحكم / Dashboard
t('sidebar.customers')        // العملاء / Customers
t('sidebar.products')         // المنتجات / Products
t('sidebar.orders')           // الطلبات / Orders
```

## 🎯 أمثلة عملية

### مثال 1: صفحة Dashboard

```typescript
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.welcome')}</p>
      
      <div className="stats">
        <div className="stat-card">
          <h3>{t('dashboard.totalCustomers')}</h3>
          <p>150</p>
        </div>
        <div className="stat-card">
          <h3>{t('dashboard.totalOrders')}</h3>
          <p>320</p>
        </div>
      </div>
      
      <button>{t('common.refresh')}</button>
    </div>
  );
};
```

### مثال 2: صفحة قائمة العملاء

```typescript
import { useTranslation } from 'react-i18next';

const CustomerList = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  
  return (
    <div>
      <div className="header">
        <h1>{t('customers.title')}</h1>
        <button>{t('customers.addCustomer')}</button>
      </div>
      
      <input 
        type="text" 
        placeholder={t('pages.searchPlaceholder')}
      />
      
      {customers.length === 0 ? (
        <p>{t('pages.noData')}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.email')}</th>
              <th>{t('common.phone')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.email}</td>
                <td>{customer.phone}</td>
                <td>
                  <button>{t('common.edit')}</button>
                  <button>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
```

### مثال 3: نموذج مع رسائل التحقق

```typescript
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';

const ProductForm = () => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const onSubmit = (data) => {
    // حفظ البيانات
    toast.success(t('pages.saveSuccess'));
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2>{t('products.addProduct')}</h2>
      
      <div>
        <label>{t('products.productName')}</label>
        <input 
          {...register('name', { required: true })}
          placeholder={t('products.productName')}
        />
        {errors.name && <span>{t('pages.required')}</span>}
      </div>
      
      <div>
        <label>{t('products.productPrice')}</label>
        <input 
          type="number"
          {...register('price', { required: true })}
          placeholder={t('products.productPrice')}
        />
        {errors.price && <span>{t('pages.required')}</span>}
      </div>
      
      <div className="buttons">
        <button type="submit">{t('common.save')}</button>
        <button type="button">{t('common.cancel')}</button>
      </div>
    </form>
  );
};
```

### مثال 4: رسائل التأكيد

```typescript
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const ProductActions = () => {
  const { t } = useTranslation();
  
  const handleDelete = (id) => {
    if (window.confirm(t('pages.deleteConfirm'))) {
      // حذف المنتج
      deleteProduct(id)
        .then(() => {
          toast.success(t('pages.deleteSuccess'));
        })
        .catch(() => {
          toast.error(t('pages.deleteError'));
        });
    }
  };
  
  return (
    <button onClick={() => handleDelete(productId)}>
      {t('common.delete')}
    </button>
  );
};
```

## 🔧 إضافة ترجمات جديدة

### 1. افتح ملف الترجمة العربي:
`frontend/src/locales/ar/translation.json`

### 2. أضف المفتاح والقيمة:
```json
{
  "mySection": {
    "myKey": "النص بالعربية",
    "anotherKey": "نص آخر"
  }
}
```

### 3. افتح ملف الترجمة الإنجليزي:
`frontend/src/locales/en/translation.json`

### 4. أضف نفس المفتاح بالإنجليزية:
```json
{
  "mySection": {
    "myKey": "Text in English",
    "anotherKey": "Another text"
  }
}
```

### 5. استخدمه في المكون:
```typescript
{t('mySection.myKey')}
```

## 📋 قائمة مرجعية سريعة

عند ترجمة صفحة جديدة:

- [ ] استورد `useTranslation`
- [ ] أضف `const { t } = useTranslation();`
- [ ] استبدل جميع النصوص الثابتة بـ `{t('key')}`
- [ ] تأكد من وجود المفاتيح في ملفات الترجمة
- [ ] اختبر الصفحة باللغتين (عربي/إنجليزي)

## 🎨 نصائح مهمة

1. **استخدم مفاتيح واضحة**: `products.addProduct` أفضل من `prod.add`
2. **نظم المفاتيح حسب الصفحات**: كل صفحة لها قسم خاص
3. **استخدم المفاتيح المشتركة**: استخدم `common.*` للنصوص المتكررة
4. **لا تنسَ الترجمتين**: أضف العربي والإنجليزي دائماً
5. **اختبر اللغتين**: تأكد من أن كل شيء يعمل باللغتين

## 🚀 البدء السريع

لترجمة صفحة جديدة في 3 خطوات:

```typescript
// 1. استورد
import { useTranslation } from 'react-i18next';

// 2. استخدم
const MyPage = () => {
  const { t } = useTranslation();
  
  // 3. ترجم
  return <h1>{t('myPage.title')}</h1>;
};
```

## 📞 المساعدة

إذا واجهت مشكلة:
1. تأكد من وجود المفتاح في كلا ملفي الترجمة
2. تحقق من صحة كتابة المفتاح
3. أعد تحميل الصفحة بعد تعديل ملفات الترجمة

---

**ملاحظة**: جميع ملفات الترجمة موجودة في:
- `frontend/src/locales/ar/translation.json` (العربية)
- `frontend/src/locales/en/translation.json` (الإنجليزية)
