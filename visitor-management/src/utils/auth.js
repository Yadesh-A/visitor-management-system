// src/utils/auth.js

// GOAL 2: Secure Storage (Browser Local Storage)
export const storeAuthTokens = ({ access, refresh }) => {
  // Puthu JWT tokens-ah save panrom
  localStorage.setItem('vms_access_token', access);
  localStorage.setItem('vms_refresh_token', refresh);
};

export const getAccessToken = () => {
  return localStorage.getItem('vms_access_token');
};

export const clearAuthTokens = () => {
  localStorage.removeItem('vms_access_token');
  localStorage.removeItem('vms_refresh_token');
};