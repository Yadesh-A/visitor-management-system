import axios from 'axios';

let refreshTimeout = null;

export const startTokenRefreshTimer = () => {
  // Clear old timer
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }

  const access = sessionStorage.getItem('vms_access_token');
  if (!access) return;

  try {
    // Decode JWT to find exact expiration time
    const payload = JSON.parse(atob(access.split('.')[1]));
    const expiryTime = payload.exp * 1000; // convert to ms
    const currentTime = Date.now();

    // Refresh 30 seconds before expiry
    const refreshTime = expiryTime - currentTime - 30000;

    if (refreshTime <= 0) {
      console.log("Token already expired → Interceptor will handle it on next click");
      return;
    }

    console.log(`⏱ Scheduling token refresh in ${Math.floor(refreshTime / 1000)} seconds`);

    refreshTimeout = setTimeout(async () => {
      console.log("🔄 Proactive refresh triggered");
      
      let refreshToken = sessionStorage.getItem('vms_refresh_token');
      if (refreshToken) {
        refreshToken = refreshToken.replace(/^"|"$/g, "");

        try {
          // 🚀 DIRECT API CALL: Dummy error-kku wait pannama direct-ah token vaangurom
          const res = await axios.post('http://192.168.0.100:8000/api/token/refresh/', {
            refresh: refreshToken 
          });

          if (res.data.access) {
            sessionStorage.setItem('vms_access_token', res.data.access);
            console.log("✅ Proactive Auto-Refresh Success!");
            
            // 🔄 LOOP: Puthu token vanthathum, adutha cycle-kku timer-ah thirumba start panrom!
            startTokenRefreshTimer(); 
          }
        } catch (err) {
          console.error("❌ Proactive refresh failed:", err);
          // Inga fail aanaalum kavalai illai, user click pannum pothu namma api.js interceptor paathukkum.
        }
      }
    }, refreshTime);

  } catch (err) {
    console.error("Token decode error:", err);
  }
};
// Add this at the end of your tokenManager.js file

export const stopTokenRefreshTimer = () => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
    console.log("🛑 Token refresh timer stopped.");
  }
};