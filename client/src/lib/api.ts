import { apiRequest } from "./queryClient";

export const api = {
  // System metrics
  async getMetrics() {
    const response = await apiRequest('GET', '/api/v1/metrics');
    return response.json();
  },

  // Vendors
  async getVendors() {
    const response = await apiRequest('GET', '/api/v1/vendors');
    return response.json();
  },

  async createVendor(vendor: any) {
    const response = await apiRequest('POST', '/api/v1/vendors', vendor);
    return response.json();
  },

  // Products
  async getProducts(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    const response = await apiRequest('GET', `/api/v1/products${query}`);
    return response.json();
  },

  async searchProducts(query: string, params?: any) {
    const searchParams = new URLSearchParams({ q: query, ...params });
    const response = await apiRequest('GET', `/api/v1/search/products?${searchParams}`);
    return response.json();
  },

  async createProducts(products: any[]) {
    const response = await apiRequest('POST', '/api/v1/products', products);
    return response.json();
  },

  async getProduct(id: string) {
    const response = await apiRequest('GET', `/api/v1/products/${id}`);
    return response.json();
  },

  async updateProduct(id: string, updates: any) {
    const response = await apiRequest('PATCH', `/api/v1/products/${id}`, updates);
    return response.json();
  },

  async deleteProduct(id: string) {
    const response = await apiRequest('DELETE', `/api/v1/products/${id}`);
    return response.ok;
  },

  // Customers
  async getCustomers(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    const response = await apiRequest('GET', `/api/v1/customers${query}`);
    return response.json();
  },

  async searchCustomers(query: string, params?: any) {
    const searchParams = new URLSearchParams({ q: query, ...params });
    const response = await apiRequest('GET', `/api/v1/customers?${searchParams}`);
    return response.json();
  },

  async createCustomers(customers: any[]) {
    const response = await apiRequest('POST', '/api/v1/customers', customers);
    return response.json();
  },

  async getCustomer(id: string) {
    const response = await apiRequest('GET', `/api/v1/customers/${id}`);
    return response.json();
  },

  async updateCustomer(id: string, updates: any) {
    const response = await apiRequest('PATCH', `/api/v1/customers/${id}`, updates);
    return response.json();
  },

  async getCustomerHealth(id: string) {
    const response = await apiRequest('GET', `/api/v1/customers/${id}/health`);
    return response.json();
  },

  async updateCustomerHealth(id: string, healthData: any) {
    const response = await apiRequest('PUT', `/api/v1/customers/${id}/health`, healthData);
    return response.json();
  },

  // Ingestion Jobs
  async getJobs(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    const response = await apiRequest('GET', `/api/v1/jobs${query}`);
    return response.json();
  },

  async getJob(id: string) {
    const response = await apiRequest('GET', `/api/v1/jobs/${id}`);
    return response.json();
  },

  async startCsvIngestion(mode: 'products' | 'customers', params?: any) {
    const response = await apiRequest('POST', `/api/v1/ingest/csv?mode=${mode}`, params);
    return response.json();
  },

  // Matching
  async getMatches(customerId: string, k = 20) {
    const response = await apiRequest('GET', `/api/v1/matches/${customerId}?k=${k}`);
    return response.json();
  },

  // Audit Logs
  async getAuditLogs(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    const response = await apiRequest('GET', `/api/v1/audit${query}`);
    return response.json();
  },

  // Webhooks
  async createWebhookEndpoint(endpoint: any) {
    const response = await apiRequest('POST', '/api/v1/webhooks/endpoints', endpoint);
    return response.json();
  },

  async getWebhookEndpoints() {
    const response = await apiRequest('GET', '/api/v1/webhooks/endpoints');
    return response.json();
  },

  // Health check
  async getHealth() {
    const response = await apiRequest('GET', '/api/v1/health');
    return response.json();
  }
};
