export const API_URL = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response: Response) {
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Lỗi kết nối API');
  }
  return data;
}

export async function apiGet(endpoint: string) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function apiPost(endpoint: string, body: any) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiPut(endpoint: string, body: any) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiDelete(endpoint: string) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}
