//-----------------------------------------------------
// Determine API base URL
//-----------------------------------------------------
let API_URL = '';

if (import.meta.env.VITE_API_URL) {
  API_URL = import.meta.env.VITE_API_URL + '/api';
  console.log('🔧 Using VITE_API_URL:', API_URL);
} else if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  console.log('🌐 Current hostname:', host);

  if (host === 'blackhole-workflow.vercel.app' || host.endsWith('.vercel.app')) {
    API_URL = 'https://blackholeworkflow.onrender.com/api';
    console.log('🎯 Using Render backend:', API_URL);
  } else {
    API_URL = `${window.location.origin}/api`;
    console.log('🏠 Using same-origin API:', API_URL);
  }
} else {
  console.log('⚠️ Window not available, API_URL will be empty');
}

console.log('✅ Final API_URL:', API_URL);
export { API_URL };


//-----------------------------------------------------
// Helper function for API requests
//-----------------------------------------------------
async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem("WorkflowToken");

  const headers = {
    "Content-Type": "application/json",
    ...(token && { "x-auth-token": token }),
    ...options.headers,
  };

  try {
    console.log('🔍 API Debug:', {
      fullURL: `${API_URL}${endpoint}`,
      API_URL,
      endpoint,
      method: options.method || 'GET'
    });

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem("WorkflowToken");
      localStorage.removeItem("WorkflowUser");
      throw new Error("Unauthorized: Please log in again");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}


//-----------------------------------------------------
// Auth API (FIXED)
//-----------------------------------------------------
const auth = {
  login: (credentials) =>
    fetchAPI("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (userData) =>
    fetchAPI("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  getCurrentUser: () => fetchAPI("/auth/me"),
};


//-----------------------------------------------------
// Tasks API
//-----------------------------------------------------
const tasks = {
  getTasks: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(val => queryParams.append(key, val));
      } else if (value) queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    return fetchAPI(`/tasks${queryString ? `?${queryString}` : ""}`);
  },

  getTask: (id) => fetchAPI(`/tasks/${id}`),

  createTask: (task) =>
    fetchAPI("/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    }),

  updateTask: (id, task) =>
    fetchAPI(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(task),
    }),

  deleteTask: (id) => fetchAPI(`/tasks/${id}`, { method: "DELETE" }),
};


//-----------------------------------------------------
// Departments API
//-----------------------------------------------------
const departments = {
  getDepartments: () => fetchAPI("/departments"),
  getDepartment: (id) => fetchAPI(`/departments/${id}`),

  createDepartment: (department) =>
    fetchAPI("/departments", {
      method: "POST",
      body: JSON.stringify(department),
    }),

  updateDepartment: (id, department) =>
    fetchAPI(`/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(department),
    }),

  deleteDepartment: (id) =>
    fetchAPI(`/departments/${id}`, { method: "DELETE" }),

  getDepartmentTasks: (id, filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    return fetchAPI(`/departments/${id}/tasks${queryString ? `?${queryString}` : ""}`);
  },
};


//-----------------------------------------------------
// Users API
//-----------------------------------------------------
const users = {
  getUsers: () => fetchAPI("/users"),
  getUser: (id) => fetchAPI(`/users/${id}`),

  createUser: (user) =>
    fetchAPI("/users", {
      method: "POST",
      body: JSON.stringify(user),
    }),

  updateUser: (id, user) =>
    fetchAPI(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(user),
    }),

  deleteUser: (id) =>
    fetchAPI(`/users/${id}`, { method: "DELETE" }),

  getUserTasks: (id, filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    return fetchAPI(`/users/${id}/tasks${queryString ? `?${queryString}` : ""}`);
  },

  changePassword: (id, passwordData) =>
    fetchAPI(`/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify(passwordData),
    }),

  updateUserStatus: (id, stillExist) =>
    fetchAPI(`/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ stillExist }),
    }),

  getAllUsersIncludingExited: () => fetchAPI("/admin/users/all"),
};


//-----------------------------------------------------
// AI Optimization API
//-----------------------------------------------------
const ai = {
  getInsights: () => fetchAPI("/new/ai/insights"),
  optimizeWorkflow: () => fetchAPI("/new/ai/optimize", { method: "POST" }),
  getDependencyAnalysis: () => fetchAPI("/new/ai/dependencies"),
};


//-----------------------------------------------------
// Admin API
//-----------------------------------------------------
const admin = {
  getUsers: (includeExited = false) =>
    fetchAPI(`/admin/users${includeExited ? "?includeExited=true" : ""}`),

  getAllUsers: () => fetchAPI("/admin/users/all"),
  getUser: (id) => fetchAPI(`/admin/users/${id}`),

  createUser: (userData) =>
    fetchAPI("/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  updateUser: (id, userData) =>
    fetchAPI(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    }),

  updateUserStatus: (id, stillExist) =>
    fetchAPI(`/admin/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ stillExist }),
    }),

  deleteUser: (id) =>
    fetchAPI(`/admin/users/${id}`, { method: "DELETE" }),

  getDepartments: () => fetchAPI("/admin/departments"),
  getDepartment: (id) => fetchAPI(`/admin/departments/${id}`),

  createDepartment: (data) =>
    fetchAPI("/admin/departments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateDepartment: (id, data) =>
    fetchAPI(`/admin/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteDepartment: (id) =>
    fetchAPI(`/admin/departments/${id}`, { method: "DELETE" }),

  getDepartmentTasks: (id, filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    return fetchAPI(`/admin/departments/${id}/tasks${queryString ? `?${queryString}` : ""}`);
  },
};


//-----------------------------------------------------
// Progress API
//-----------------------------------------------------
const progress = {
  getTaskProgress: (taskId) => fetchAPI(`/progress/task/${taskId}`),
  getUserProgress: (userId) => fetchAPI(`/progress/user/${userId}`),

  createProgress: (data) =>
    fetchAPI("/progress", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProgress: (id, data) =>
    fetchAPI(`/progress/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProgress: (id) =>
    fetchAPI(`/progress/${id}`, { method: "DELETE" }),
};


//-----------------------------------------------------
// Notifications API
//-----------------------------------------------------
const notifications = {
  broadcastReminders: () =>
    fetchAPI("/notifications/broadcast-reminders", {
      method: "POST",
    }),

  broadcastAimReminders: () =>
    fetchAPI("/notifications/broadcast-aim-reminders", {
      method: "POST",
    }),

  generateReports: () =>
    fetchAPI("/notifications/generate-reports", {
      method: "POST",
    }),

  toggleAutomation: (settings) =>
    fetchAPI("/notifications/toggle-automation", {
      method: "POST",
      body: JSON.stringify(settings),
    }),
};


//-----------------------------------------------------
// Dashboard API
//-----------------------------------------------------
const dashboard = {
  getStats: () => fetchAPI("/dashboard/stats"),
  getRecentActivity: () => fetchAPI("/dashboard/activity"),
  getDepartmentStats: () => fetchAPI("/dashboard/departments"),
  getTasksOverview: () => fetchAPI("/dashboard/tasks-overview"),
  getUserStats: (userId) => fetchAPI(`/dashboard/user-stats/${userId}`),
  getAIInsights: () => fetchAPI("/new/ai/insights"),
};


//-----------------------------------------------------
// Aims API
//-----------------------------------------------------
const aims = {
  getAims: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    return fetchAPI(`/aims${queryString ? `?${queryString}` : ""}`);
  },

  getTodayAim: (userId) => fetchAPI(`/aims/today/${userId}`),

  getUserAims: (userId, filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    return fetchAPI(`/aims/user/${userId}${queryString ? `?${queryString}` : ""}`);
  },

  createAim: (aim, userId) =>
    fetchAPI(`/aims/postaim/${userId}`, {
      method: "POST",
      body: JSON.stringify(aim),
    }),

  updateAim: (id, aim) =>
    fetchAPI(`/aims/${id}`, {
      method: "PUT",
      body: JSON.stringify(aim),
    }),

  deleteAim: (id) =>
    fetchAPI(`/aims/${id}`, { method: "DELETE" }),

  getAimsWithProgress: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    return fetchAPI(`/aims/with-progress${queryString ? `?${queryString}` : ""}`);
  },
};


//-----------------------------------------------------
// Generic HTTP Methods
//-----------------------------------------------------
const httpMethods = {
  get: (endpoint, options = {}) => fetchAPI(endpoint, { method: "GET", ...options }),
  post: (endpoint, data, options = {}) =>
    fetchAPI(endpoint, { method: "POST", body: JSON.stringify(data), ...options }),
  put: (endpoint, data, options = {}) =>
    fetchAPI(endpoint, { method: "PUT", body: JSON.stringify(data), ...options }),
  delete: (endpoint, options = {}) =>
    fetchAPI(endpoint, { method: "DELETE", ...options }),
  patch: (endpoint, data, options = {}) =>
    fetchAPI(endpoint, { method: "PATCH", body: JSON.stringify(data), ...options }),
};


//-----------------------------------------------------
// Combine All API Modules
//-----------------------------------------------------
export const api = {
  ...httpMethods,
  auth,
  tasks,
  departments,
  users,
  ai,
  progress,
  notifications,
  admin,
  dashboard,
  aims,
};

export default api;
