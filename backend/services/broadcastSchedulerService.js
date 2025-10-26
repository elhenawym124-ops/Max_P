/**
 * خدمة جدولة البرودكاست
 * Broadcast Scheduler Service
 * 
 * تقوم بفحص الحملات المجدولة وإرسالها تلقائياً في الموعد المحدد
 */

const cron = require('node-cron');
const { getSharedPrismaClient } = require('./sharedDatabase');
const prisma = getSharedPrismaClient();

class BroadcastSchedulerService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.stats = {
      totalChecks: 0,
      campaignsSent: 0,
      lastCheck: null,
      errors: 0
    };
    
    console.log('📡 [BroadcastScheduler] Service initialized');
  }

  /**
   * بدء خدمة الجدولة
   */
  start() {
    if (this.cronJob) {
      console.log('⚠️ [BroadcastScheduler] Service already running');
      return;
    }

    console.log('🚀 [BroadcastScheduler] Starting broadcast scheduler...');

    // فحص كل دقيقة للحملات المجدولة
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkScheduledCampaigns();
    });

    console.log('✅ [BroadcastScheduler] Scheduler started - checking every minute');
  }

  /**
   * إيقاف خدمة الجدولة
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 [BroadcastScheduler] Scheduler stopped');
    }
  }

  /**
   * فحص الحملات المجدولة وإرسالها
   */
  async checkScheduledCampaigns() {
    if (this.isRunning) {
      console.log('⏳ [BroadcastScheduler] Previous check still running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      this.stats.totalChecks++;
      this.stats.lastCheck = new Date();

      const now = new Date();
      console.log(`🔍 [BroadcastScheduler] Checking for scheduled campaigns at ${now.toISOString()}`);

      // البحث عن الحملات المجدولة التي حان وقت إرسالها
      const scheduledCampaigns = await prisma.broadcastCampaign.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: {
            lte: now // الوقت المحدد <= الآن
          }
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          }
        }
      });

      if (scheduledCampaigns.length === 0) {
        console.log('✅ [BroadcastScheduler] No campaigns to send');
        return;
      }

      console.log(`📨 [BroadcastScheduler] Found ${scheduledCampaigns.length} campaign(s) ready to send`);

      // إرسال كل حملة
      for (const campaign of scheduledCampaigns) {
        // تحقق من أن الشركة نشطة
        if (!campaign.company.isActive) {
          console.log(`⚠️ [BroadcastScheduler] Skipping campaign ${campaign.id} - Company inactive`);
          
          // تحديث حالة الحملة إلى failed
          await prisma.broadcastCampaign.update({
            where: { id: campaign.id },
            data: {
              status: 'failed',
              failureReason: 'Company is inactive'
            }
          });
          
          continue;
        }

        console.log(`🚀 [BroadcastScheduler] Sending campaign: ${campaign.name} (${campaign.id}) for company ${campaign.company.name}`);
        
        try {
          await this.sendScheduledCampaign(campaign);
          this.stats.campaignsSent++;
          console.log(`✅ [BroadcastScheduler] Campaign ${campaign.id} sent successfully`);
        } catch (error) {
          this.stats.errors++;
          console.error(`❌ [BroadcastScheduler] Error sending campaign ${campaign.id}:`, error.message);
          
          // تحديث حالة الحملة إلى failed
          await prisma.broadcastCampaign.update({
            where: { id: campaign.id },
            data: {
              status: 'failed',
              failureReason: error.message
            }
          }).catch(err => console.error('Error updating campaign status:', err));
        }
      }

    } catch (error) {
      console.error('❌ [BroadcastScheduler] Error in scheduler:', error.message);
      this.stats.errors++;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * إرسال حملة مجدولة
   */
  async sendScheduledCampaign(campaign) {
    const { sendFacebookMessage } = require('../utils/allFunctions');
    const socketService = require('./socketService');

    console.log(`📊 [BroadcastScheduler] Starting to send campaign ${campaign.id}`);

    // تحديث حالة الحملة إلى "sending"
    await prisma.broadcastCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'sending',
        sentAt: new Date()
      }
    });

    // حساب وقت آخر 24 ساعة
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log(`⏰ [BroadcastScheduler] Filtering conversations with activity after: ${twentyFourHoursAgo.toISOString()}`);

    // جلب المحادثات النشطة (آخر رسالة من العميل في آخر 24 ساعة)
    let conversations = [];

    if (campaign.targetAudience === 'all') {
      console.log('🌐 [BroadcastScheduler] Fetching all active conversations');
      conversations = await prisma.conversation.findMany({
        where: {
          companyId: campaign.companyId,
          status: 'ACTIVE',
          messages: {
            some: {
              isFromCustomer: true,
              createdAt: {
                gte: twentyFourHoursAgo
              }
            }
          }
        },
        include: {
          customer: true,
          messages: {
            where: {
              isFromCustomer: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      });
    } else {
      // منطق للجمهور المستهدف المخصص
      conversations = await prisma.conversation.findMany({
        where: {
          companyId: campaign.companyId,
          status: 'ACTIVE',
          messages: {
            some: {
              isFromCustomer: true,
              createdAt: {
                gte: twentyFourHoursAgo
              }
            }
          }
        },
        include: {
          customer: true,
          messages: {
            where: {
              isFromCustomer: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      });
    }

    console.log(`📊 [BroadcastScheduler] Found ${conversations.length} active conversations`);

    // تحديث عدد المستلمين في الحملة
    await prisma.broadcastCampaign.update({
      where: { id: campaign.id },
      data: {
        recipientCount: conversations.length
      }
    });

    // إنشاء سجلات المستلمين
    const recipients = conversations.map(conv => ({
      campaignId: campaign.id,
      conversationId: conv.id,
      customerPhone: conv.customer.phone || '',
      customerName: `${conv.customer.firstName} ${conv.customer.lastName}`,
      messengerUserId: conv.customer.facebookId,
      status: 'pending'
    }));

    if (recipients.length > 0) {
      await prisma.broadcastRecipient.createMany({
        data: recipients
      });
    } else {
      console.log('⚠️ [BroadcastScheduler] No recipients found for campaign');
      
      await prisma.broadcastCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'failed',
          failureReason: 'No active recipients found'
        }
      });
      
      return;
    }

    // إرسال الرسائل
    let sentCount = 0;
    let failedCount = 0;
    const totalRecipients = conversations.length;

    const io = socketService.getIO();
    
    // إرسال إشعار بدء الحملة
    if (io) {
      io.emit('campaign:progress', {
        campaignId: campaign.id,
        status: 'started',
        total: totalRecipients,
        sent: 0,
        failed: 0,
        progress: 0
      });
    }

    // إرسال رسالة لكل عميل
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      
      try {
        if (!conv.customer.facebookId) {
          console.log(`⚠️ [BroadcastScheduler] Skipping customer ${conv.customer.firstName} - No Facebook ID`);
          failedCount++;

          await prisma.broadcastRecipient.updateMany({
            where: {
              campaignId: campaign.id,
              conversationId: conv.id
            },
            data: {
              status: 'failed',
              failureReason: 'No Facebook ID',
              sentAt: new Date()
            }
          });

          continue;
        }

        // جلب Page ID من metadata المحادثة
        let conversationPageId = null;
        if (conv.metadata) {
          try {
            const metadata = JSON.parse(conv.metadata);
            if (metadata.pageId) {
              conversationPageId = metadata.pageId;
            }
          } catch (error) {
            console.log(`⚠️ [BroadcastScheduler] Error parsing metadata: ${error.message}`);
          }
        }

        // إذا لم يتم العثور على Page ID، استخدم أول صفحة متصلة
        if (!conversationPageId) {
          const defaultPage = await prisma.facebookPage.findFirst({
            where: {
              companyId: campaign.companyId,
              status: 'connected'
            },
            orderBy: {
              connectedAt: 'desc'
            }
          });

          if (defaultPage) {
            conversationPageId = defaultPage.pageId;
          } else {
            console.log(`❌ [BroadcastScheduler] No connected Facebook page for customer ${conv.customer.firstName}`);
            failedCount++;

            await prisma.broadcastRecipient.updateMany({
              where: {
                campaignId: campaign.id,
                conversationId: conv.id
              },
              data: {
                status: 'failed',
                failureReason: 'No connected Facebook page',
                sentAt: new Date()
              }
            });

            continue;
          }
        }

        // حفظ الرسائل في database قبل الإرسال
        const savedMessages = [];
        if (campaign.message && campaign.message.trim().length > 0) {
          const textMessage = await prisma.message.create({
            data: {
              conversationId: conv.id,
              content: campaign.message,
              isFromCustomer: false,
              type: 'TEXT',
              senderId: null,
              metadata: JSON.stringify({
                isBroadcast: true,
                campaignId: campaign.id,
                campaignName: campaign.name,
                sentAt: new Date().toISOString()
              })
            }
          });
          savedMessages.push(textMessage);
        }

        let sendResult;
        
        // إرسال الصور إن وجدت
        if (campaign.images && Array.isArray(campaign.images) && campaign.images.length > 0) {
          for (const imageUrl of campaign.images) {
            const imageMessage = await prisma.message.create({
              data: {
                conversationId: conv.id,
                content: imageUrl,
                isFromCustomer: false,
                type: 'IMAGE',
                senderId: null,
                metadata: JSON.stringify({
                  isBroadcast: true,
                  campaignId: campaign.id,
                  campaignName: campaign.name,
                  sentAt: new Date().toISOString()
                })
              }
            });
            savedMessages.push(imageMessage);
          }

          // إرسال النص أولاً
          if (campaign.message && campaign.message.trim().length > 0) {
            sendResult = await sendFacebookMessage(
              conv.customer.facebookId,
              campaign.message,
              'TEXT',
              conversationPageId
            );
          }
          
          // إرسال الصور
          for (const imageUrl of campaign.images) {
            const imageResult = await sendFacebookMessage(
              conv.customer.facebookId,
              imageUrl,
              'IMAGE',
              conversationPageId
            );
            
            if (!imageResult.success) {
              sendResult = imageResult;
              break;
            }
            sendResult = imageResult;
          }
        } else {
          // إرسال النص فقط
          sendResult = await sendFacebookMessage(
            conv.customer.facebookId,
            campaign.message,
            'TEXT',
            conversationPageId
          );
        }

        if (sendResult.success) {
          sentCount++;

          await prisma.broadcastRecipient.updateMany({
            where: {
              campaignId: campaign.id,
              conversationId: conv.id
            },
            data: {
              status: 'sent',
              sentAt: new Date()
            }
          });
        } else {
          failedCount++;

          // حذف الرسائل المحفوظة لأن الإرسال فشل
          for (const msg of savedMessages) {
            await prisma.message.delete({
              where: { id: msg.id }
            });
          }

          await prisma.broadcastRecipient.updateMany({
            where: {
              campaignId: campaign.id,
              conversationId: conv.id
            },
            data: {
              status: 'failed',
              failureReason: sendResult.error || sendResult.message || 'Unknown error',
              sentAt: new Date()
            }
          });
        }

        // إرسال تحديث التقدم
        if (io) {
          const progress = Math.round(((i + 1) / totalRecipients) * 100);
          io.emit('campaign:progress', {
            campaignId: campaign.id,
            status: 'sending',
            total: totalRecipients,
            sent: sentCount,
            failed: failedCount,
            progress: progress,
            currentRecipient: `${conv.customer.firstName} ${conv.customer.lastName}`
          });
        }

        // تأخير صغير لتجنب rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ [BroadcastScheduler] Error sending to ${conv.customer.firstName}:`, error.message);
        failedCount++;

        await prisma.broadcastRecipient.updateMany({
          where: {
            campaignId: campaign.id,
            conversationId: conv.id
          },
          data: {
            status: 'failed',
            failureReason: error.message,
            sentAt: new Date()
          }
        }).catch(err => console.error('Error updating recipient status:', err));
      }
    }

    console.log(`📊 [BroadcastScheduler] Campaign results - Sent: ${sentCount}, Failed: ${failedCount}`);

    // إرسال إشعار الإتمام
    if (io) {
      io.emit('campaign:progress', {
        campaignId: campaign.id,
        status: 'completed',
        total: totalRecipients,
        sent: sentCount,
        failed: failedCount,
        progress: 100
      });
    }

    // تحديث إحصائيات الحملة
    await prisma.broadcastCampaign.update({
      where: { id: campaign.id },
      data: {
        recipientCount: recipients.length,
        sentCount: sentCount,
        failedCount: failedCount,
        deliveredCount: sentCount,
        status: sentCount > 0 ? 'sent' : 'failed'
      }
    });

    console.log(`✅ [BroadcastScheduler] Campaign ${campaign.id} completed - Recipients: ${recipients.length}, Sent: ${sentCount}, Failed: ${failedCount}`);
  }

  /**
   * الحصول على إحصائيات الخدمة
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      schedulerActive: this.cronJob !== null
    };
  }
}

// إنشاء instance واحد للخدمة
const broadcastScheduler = new BroadcastSchedulerService();

module.exports = broadcastScheduler;
