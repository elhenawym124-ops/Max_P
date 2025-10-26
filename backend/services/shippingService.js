const { getSharedPrismaClient } = require('./sharedDatabase');
const prisma = getSharedPrismaClient();

/**
 * Shipping Service for AI Agent
 * يوفر معلومات الشحن للذكاء الاصطناعي
 */

class ShippingService {
  /**
   * البحث عن معلومات الشحن بناءً على المحافظة
   * @param {string} governorate - اسم المحافظة
   * @param {string} companyId - معرف الشركة
   * @returns {Object} معلومات الشحن أو null
   */
  async findShippingInfo(governorate, companyId) {
    try {
      if (!governorate || !companyId) {
        console.log('⚠️ [SHIPPING] Missing governorate or companyId');
        return null;
      }

      // تنظيف اسم المحافظة
      const normalizedInput = this.normalizeGovernorate(governorate);
      console.log(`🔍 [SHIPPING] البحث عن شحن للمحافظة: "${governorate}" (normalized: "${normalizedInput}")`);

      // جلب جميع مناطق الشحن النشطة للشركة
      const zones = await prisma.shippingZone.findMany({
        where: {
          companyId,
          isActive: true
        }
      });

      console.log(`📦 [SHIPPING] تم العثور على ${zones.length} منطقة شحن نشطة`);

      // البحث عن المنطقة المطابقة
      const matchedZone = zones.find(zone => {
        const governorates = zone.governorates;
        return governorates.some(gov => {
          const normalizedGov = this.normalizeGovernorate(gov);
          return normalizedGov === normalizedInput;
        });
      });

      if (matchedZone) {
        console.log(`✅ [SHIPPING] تم العثور على معلومات الشحن:`, {
          price: matchedZone.price,
          deliveryTime: matchedZone.deliveryTime
        });

        return {
          found: true,
          zoneId: matchedZone.id,
          price: parseFloat(matchedZone.price),
          deliveryTime: matchedZone.deliveryTime,
          governorate: matchedZone.governorates[0] // الاسم الرسمي للمحافظة
        };
      }

      console.log(`❌ [SHIPPING] لم يتم العثور على معلومات شحن للمحافظة: ${governorate}`);
      return {
        found: false,
        price: null,
        deliveryTime: null,
        governorate: null
      };
    } catch (error) {
      console.error('❌ [SHIPPING] خطأ في البحث عن معلومات الشحن:', error);
      return null;
    }
  }

  /**
   * استخراج اسم المحافظة من رسالة العميل
   * @param {string} message - رسالة العميل
   * @param {string} companyId - معرف الشركة
   * @returns {Object} معلومات المحافظة المستخرجة
   */
  async extractGovernorateFromMessage(message, companyId) {
    try {
      if (!message || !companyId) {
        return { found: false, governorate: null };
      }

      // جلب جميع المحافظات المتاحة
      const zones = await prisma.shippingZone.findMany({
        where: {
          companyId,
          isActive: true
        }
      });

      // استخراج جميع أسماء المحافظات
      const allGovernorates = [];
      zones.forEach(zone => {
        if (zone.governorates && Array.isArray(zone.governorates)) {
          allGovernorates.push(...zone.governorates);
        }
      });

      // تنظيف الرسالة
      const normalizedMessage = this.normalizeGovernorate(message);

      // البحث عن تطابق
      for (const gov of allGovernorates) {
        const normalizedGov = this.normalizeGovernorate(gov);
        if (normalizedMessage.includes(normalizedGov)) {
          console.log(`✅ [SHIPPING] تم استخراج المحافظة من الرسالة: ${gov}`);
          return {
            found: true,
            governorate: gov,
            normalizedGovernorate: normalizedGov
          };
        }
      }

      console.log(`❌ [SHIPPING] لم يتم العثور على محافظة في الرسالة`);
      return { found: false, governorate: null };
    } catch (error) {
      console.error('❌ [SHIPPING] خطأ في استخراج المحافظة:', error);
      return { found: false, governorate: null };
    }
  }

  /**
   * الحصول على قائمة بجميع المحافظات المتاحة
   * @param {string} companyId - معرف الشركة
   * @returns {Array} قائمة المحافظات
   */
  async getAvailableGovernorates(companyId) {
    try {
      const zones = await prisma.shippingZone.findMany({
        where: {
          companyId,
          isActive: true
        }
      });

      const governorates = [];
      zones.forEach(zone => {
        if (zone.governorates && Array.isArray(zone.governorates)) {
          // أخذ الاسم الأول فقط من كل منطقة (الاسم الرسمي)
          if (zone.governorates.length > 0) {
            governorates.push({
              name: zone.governorates[0],
              price: parseFloat(zone.price),
              deliveryTime: zone.deliveryTime
            });
          }
        }
      });

      return governorates;
    } catch (error) {
      console.error('❌ [SHIPPING] خطأ في جلب المحافظات:', error);
      return [];
    }
  }

  /**
   * تنظيف وتوحيد اسم المحافظة
   * @param {string} governorate - اسم المحافظة
   * @returns {string} الاسم المنظف
   */
  normalizeGovernorate(governorate) {
    if (!governorate) return '';
    
    return governorate
      .trim()
      .toLowerCase()
      .replace(/محافظة/g, '')
      .replace(/ال/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * فحص إذا كان العميل يسأل عن الشحن
   * @param {string} message - رسالة العميل
   * @returns {boolean}
   */
  isAskingAboutShipping(message) {
    if (!message) return false;

    const shippingKeywords = [
      'شحن',
      'توصيل',
      'مصاريف',
      'كام الشحن',
      'سعر الشحن',
      'تكلفة الشحن',
      'هيوصل امتى',
      'مدة التوصيل',
      'كام يوم',
      'shipping',
      'delivery'
    ];

    const normalizedMessage = message.toLowerCase();
    return shippingKeywords.some(keyword => normalizedMessage.includes(keyword));
  }

  /**
   * بناء رد تلقائي عن الشحن
   * @param {Object} shippingInfo - معلومات الشحن
   * @param {string} governorate - اسم المحافظة
   * @returns {string}
   */
  buildShippingResponse(shippingInfo, governorate) {
    if (!shippingInfo || !shippingInfo.found) {
      return `عذراً، للأسف مش عندنا شحن متاح لمحافظة ${governorate} حالياً. ممكن تتواصل معانا على الخاص علشان نشوف حل ليك؟ 🙏`;
    }

    return `الشحن لمحافظة ${shippingInfo.governorate}:\n💰 السعر: ${shippingInfo.price} جنيه\n⏰ مدة التوصيل: ${shippingInfo.deliveryTime}`;
  }
}

module.exports = new ShippingService();
