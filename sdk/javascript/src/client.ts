import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { SISConfig, APIResponse, SISError, AuthResponse } from './types';

export class SISClient {
  private axiosInstance: AxiosInstance;
  private config: SISConfig;
  private token?: string;
  private refreshToken?: string;

  constructor(config: SISConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      }
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        if (this.config.tenantSlug) {
          config.headers['X-Tenant-Slug'] = this.config.tenantSlug;
        }
        if (this.config.apiKey) {
          config.headers['X-API-Key'] = this.config.apiKey;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling and token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.refreshToken) {
            try {
              await this.refreshAccessToken();
              originalRequest.headers.Authorization = `Bearer ${this.token}`;
              return this.axiosInstance(originalRequest);
            } catch (refreshError) {
              // Refresh failed, redirect to login or handle as needed
              throw new SISError('Authentication failed', 'AUTH_FAILED', 401);
            }
          }
        }

        // Convert axios errors to SIS errors
        if (error.response) {
          const errorData = error.response.data;
          throw new SISError(
            errorData?.error?.message || error.message,
            errorData?.error?.code || 'API_ERROR',
            error.response.status,
            errorData?.error?.details
          );
        }

        throw new SISError(error.message, 'NETWORK_ERROR');
      }
    );
  }

  /**
   * Authenticate user and get tokens
   */
  async login(email: string, password: string, tenantSlug?: string): Promise<AuthResponse> {
    const response = await this.axiosInstance.post<APIResponse<AuthResponse['data']>>('/auth/login', {
      email,
      password,
      tenantSlug: tenantSlug || this.config.tenantSlug
    });

    const { data } = response.data;
    this.token = data.accessToken;
    this.refreshToken = data.refreshToken;

    return {
      success: true,
      data,
      message: 'Login successful'
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new SISError('No refresh token available', 'NO_REFRESH_TOKEN');
    }

    const response = await this.axiosInstance.post<APIResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', {
      refreshToken: this.refreshToken
    });

    const { data } = response.data;
    this.token = data.accessToken;
    this.refreshToken = data.refreshToken;
  }

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await this.axiosInstance.post('/auth/logout', {
          refreshToken: this.refreshToken
        });
      } catch (error) {
        // Ignore logout errors
      }
    }

    this.token = undefined;
    this.refreshToken = undefined;
  }

  /**
   * Set authentication token manually
   */
  setToken(token: string, refreshToken?: string): void {
    this.token = token;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
  }

  /**
   * Get current authentication token
   */
  getToken(): string | undefined {
    return this.token;
  }

  /**
   * Set tenant slug for multi-tenant requests
   */
  setTenantSlug(tenantSlug: string): void {
    this.config.tenantSlug = tenantSlug;
  }

  /**
   * Get current tenant slug
   */
  getTenantSlug(): string | undefined {
    return this.config.tenantSlug;
  }

  /**
   * Make a raw API request
   */
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.request<APIResponse<T>>(config);
    return response.data.data;
  }

  /**
   * Make a GET request
   */
  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.axiosInstance.get<APIResponse<T>>(url, { params });
    return response.data.data;
  }

  /**
   * Make a POST request
   */
  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.post<APIResponse<T>>(url, data);
    return response.data.data;
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.put<APIResponse<T>>(url, data);
    return response.data.data;
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.patch<APIResponse<T>>(url, data);
    return response.data.data;
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(url: string): Promise<T> {
    const response = await this.axiosInstance.delete<APIResponse<T>>(url);
    return response.data.data;
  }

  /**
   * Upload a file
   */
  async uploadFile<T = any>(url: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await this.axiosInstance.post<APIResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data.data;
  }

  /**
   * Download a file
   */
  async downloadFile(url: string, filename?: string): Promise<Blob> {
    const response = await this.axiosInstance.get(url, {
      responseType: 'blob'
    });

    if (filename && typeof window !== 'undefined') {
      // Browser environment - trigger download
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }

    return response.data;
  }

  /**
   * Get axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: Partial<SISConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance
    if (newConfig.baseUrl) {
      this.axiosInstance.defaults.baseURL = newConfig.baseUrl;
    }
    if (newConfig.timeout) {
      this.axiosInstance.defaults.timeout = newConfig.timeout;
    }
    if (newConfig.headers) {
      this.axiosInstance.defaults.headers = {
        ...this.axiosInstance.defaults.headers,
        ...newConfig.headers
      };
    }
  }
}
