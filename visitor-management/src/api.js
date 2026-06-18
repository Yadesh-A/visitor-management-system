import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.0.100:8000/api/',
});

// Request Interceptor: Add token to headers
api.interceptors.request.use((config) => {
  let token = sessionStorage.getItem('vms_access_token');

  if (token) {
    token = token.replace(/^"|"$/g, "");
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// 🛡️ SECURITY VARIABLES: Traffic jam aagama thadukka
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Handle 401 and refresh token safely
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true; 

      // ✅ FIX: Define refreshToken properly
      let refreshToken = sessionStorage.getItem('vms_refresh_token');

      if (refreshToken) {
        refreshToken = refreshToken.replace(/^"|"$/g, "");

        try {
          console.log("Token expired! Attempting to refresh silently via Interceptor...");
          
          const res = await axios.post(
            'http://192.168.0.100:8000/api/token/refresh/',
            {
              refresh: refreshToken 
            }
          );

          const newAccessToken = res.data.access;
          // 🛑 FIX: newRefreshToken logic completely removed

          // Save the NEW access token ONLY
          sessionStorage.setItem('vms_access_token', newAccessToken);

          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          processQueue(null, newAccessToken);
          
          console.log("Silent refresh successful!");
          
          // 🔄 TIMER RESTART: Interceptor vazhiyaa token puthupikkapattalum timer-ah thirumba start panrom
          // (Make sure to import startTokenRefreshTimer at the top of api.js)
          import('./tokenManager').then(module => module.startTokenRefreshTimer());

          return api(originalRequest);

        } catch (refreshError) {
          console.error("Refresh token failed or expired:", refreshError);

          processQueue(refreshError, null);
          
          sessionStorage.removeItem('vms_access_token');
          sessionStorage.removeItem('vms_refresh_token');
          sessionStorage.setItem('isLoggedIn', 'false');

          window.dispatchEvent(new Event('vms_auth_failed'));
          return Promise.reject(refreshError);

        } finally {
          isRefreshing = false;
        }
      } else {
        window.dispatchEvent(new Event('vms_auth_failed'));
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;