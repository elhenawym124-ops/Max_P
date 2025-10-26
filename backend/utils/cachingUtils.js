
/**
 * Advanced Caching Utilities for Performance Optimization
 */

class ConversationCache {
  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.customers = new Map();
    this.TTL = 5 * 60 * 1000; // 5 minutes
  }
  
  // Cache conversation list for a company
  setConversations(companyId, conversations) {
    const key = `conversations_${companyId}`;
    this.conversations.set(key, {
      data: conversations,
      timestamp: Date.now()
    });
  }
  
  getConversations(companyId) {
    const key = `conversations_${companyId}`;
    const cached = this.conversations.get(key);
    
    if (!cached || Date.now() - cached.timestamp > this.TTL) {
      this.conversations.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  // Cache messages for a conversation
  setMessages(conversationId, messages) {
    const key = `messages_${conversationId}`;
    this.messages.set(key, {
      data: messages,
      timestamp: Date.now()
    });
  }
  
  getMessages(conversationId) {
    const key = `messages_${conversationId}`;
    const cached = this.messages.get(key);
    
    if (!cached || Date.now() - cached.timestamp > this.TTL) {
      this.messages.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  // Invalidate cache when new message is added
  invalidateConversation(conversationId, companyId) {
    this.messages.delete(`messages_${conversationId}`);
    this.conversations.delete(`conversations_${companyId}`);
    //console.log(`💾 [CACHE] Invalidated cache for conversation ${conversationId}`);
  }
  
  // Get cache statistics
  getStats() {
    return {
      conversations: this.conversations.size,
      messages: this.messages.size,
      customers: this.customers.size,
      totalCached: this.conversations.size + this.messages.size + this.customers.size
    };
  }
  
  // Clear expired entries
  cleanup() {
    const now = Date.now();
    
    for (const [key, value] of this.conversations.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.conversations.delete(key);
      }
    }
    
    for (const [key, value] of this.messages.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.messages.delete(key);
      }
    }
    
    for (const [key, value] of this.customers.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.customers.delete(key);
      }
    }
  }
}

// Global cache instance
const conversationCache = new ConversationCache();

// Cleanup interval - every 2 minutes
setInterval(() => {
  conversationCache.cleanup();
}, 2 * 60 * 1000);

module.exports = {
  ConversationCache,
  conversationCache
};
