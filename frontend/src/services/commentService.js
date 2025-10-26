import axios from 'axios';
import { authService } from '../services/authService';

const API_BASE_URL = '/api/v1/comments';

class CommentService {
  // Get all Facebook comments with filtering and pagination
  static async getFacebookComments(filters = {}) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/facebook-comments`, {
        params: filters,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch comments');
    }
  }

  // NEW: Get all Facebook posts (comments grouped by postId)
  static async getFacebookPosts(filters = {}) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/facebook-posts`, {
        params: filters,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch posts');
    }
  }

  // NEW: Get comments for a specific post
  static async getCommentsByPostId(postId, filters = {}) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/facebook-posts/${postId}/comments`, {
        params: filters,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch comments');
    }
  }

  // Get a specific Facebook comment by ID
  static async getFacebookCommentById(id) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/facebook-comments/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch comment');
    }
  }

  // Update a Facebook comment response
  static async updateFacebookComment(id, responseText) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.put(`${API_BASE_URL}/facebook-comments/${id}`, {
        response: responseText
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update comment');
    }
  }

  // NEW: Set response method for a post
  static async setPostResponseMethod(postId, settings) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.post(`${API_BASE_URL}/facebook-posts/${postId}/response-method`, settings, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to set post response method');
    }
  }

  // NEW: Get response method for a post
  static async getPostResponseMethod(postId) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/facebook-posts/${postId}/response-method`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get post response method');
    }
  }

  // NEW: Apply response method to all pending comments of a post
  static async applyPostResponseMethod(postId) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.post(`${API_BASE_URL}/facebook-posts/${postId}/apply-response-method`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to apply post response method');
    }
  }

  // NEW: Send manual response to Facebook
  static async sendManualResponseToFacebook(id, responseText) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.post(`${API_BASE_URL}/facebook-comments/${id}/send-response`, {
        response: responseText
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to send response to Facebook');
    }
  }

  // Delete a Facebook comment
  static async deleteFacebookComment(id) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.delete(`${API_BASE_URL}/facebook-comments/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete comment');
    }
  }

  // Bulk delete Facebook comments
  static async bulkDeleteFacebookComments(ids) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.delete(`${API_BASE_URL}/facebook-comments`, {
        data: { ids },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete comments');
    }
  }

  // Get comment statistics
  static async getCommentStats() {
    try {
      const token = authService.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/facebook-comments/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch statistics');
    }
  }

  // NEW: Get all Facebook pages
  static async getFacebookPages() {
    try {
      const token = authService.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/facebook-pages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch pages');
    }
  }

  // NEW: Get posts by page ID
  static async getPostsByPageId(pageId) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/facebook-pages/${pageId}/posts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch posts');
    }
  }

  // NEW: Set page response method
  static async setPageResponseMethod(pageId, settings) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.post(`${API_BASE_URL}/facebook-pages/${pageId}/response-method`, settings, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to set page response method');
    }
  }

  // NEW: Get page response method
  static async getPageResponseMethod(pageId) {
    try {
      const token = authService.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/facebook-pages/${pageId}/response-method`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get page response method');
    }
  }
}

export default CommentService;