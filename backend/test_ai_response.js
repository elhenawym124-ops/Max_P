const axios = require('axios');

async function testAIResponse() {
  try {
    console.log('🧪 اختبار رد الذكاء الاصطناعي...');
    
    const response = await axios.post('http://localhost:3001/api/v1/test-rag', {
      message: 'مرحبا كيف الحال؟'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWVtOGF6bHYwMDRldWZha2JrbzB3bW4xIiwiZW1haWwiOiJhbGlAYWxpLmNvbSIsInJvbGUiOiJDT01QQU5ZX0FETUlOIiwiY29tcGFueUlkIjoiY21lbThheXlyMDA0Y3VmYWtxa2NzeW45NyIsImlhdCI6MTc1ODY1ODQyMywiZXhwIjoxNzU4NzQ0ODIzfQ.EywGCMr3V7mFfVsBtueiNFfHghnPB5oe-T8IxAkG_Bg'
      }
    });
    
    console.log('✅ نجح الطلب!');
    console.log('📝 الرسالة:', response.data.message);
    console.log('🤖 رد الذكاء الاصطناعي:', response.data.result?.content || response.data.result);
    console.log('💾 تم الحفظ في قاعدة البيانات:', response.data.savedInDatabase);
    
  } catch (error) {
    console.error('❌ فشل الطلب:', error.response?.status, error.response?.statusText);
    console.error('📄 التفاصيل:', error.response?.data || error.message);
  }
}

testAIResponse();