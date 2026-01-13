
const API_BASE_URL = 'http://127.0.0.1:9000/api';

async function parseError(response) {
    try {
        const data = await response.json();
        
        if (data.detail) return data.detail;
        if (typeof data === 'object') {
            return Object.entries(data).map(([key, val]) => `${key}: ${val}`).join(', ');
        }
        return "حدث خطأ غير معروف في السيرفر";
    } catch (e) {
        return `خطأ في الاتصال: ${response.statusText}`;
    }
}

async function apiFetch(endpoint, { method = 'GET', body = null, params = null, useRefresh = false } = {}) {
    let urlString = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    if (!urlString.endsWith('/')) urlString += '/';

    if (params) {
        const query = new URLSearchParams(params).toString();
        urlString += `?${query}`;
    }

    const token = localStorage.getItem(useRefresh ? 'refresh_token' : 'access_token');
    const headers = { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json' 
    };
    
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const response = await fetch(urlString, config);
        
       
        if (response.status === 401 && !useRefresh && localStorage.getItem('refresh_token')) {
            const success = await auth.refreshToken();
            if (success) {
            
                return apiFetch(endpoint, { method, body, params });
            }
            auth.logout(); 
            return null;
        }

        if (!response.ok) {
            const msg = await parseError(response);
            throw { status: response.status, message: msg };
        }
        
        if (response.status === 204) return true;
        
        return await response.json();
    } catch (error) {
        console.error(`[API Error]`, error);
        throw error;
    }
}


const auth = {
    
    login: async (email, password) => {
        try {
            const data = await apiFetch('/login/', {
                method: 'POST',
                body: { email, password }
            });

            if (data && data.access) {
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);
                
            
                if (data.user_data) {
                    localStorage.setItem('user_data', JSON.stringify(data.user_data));
                }
                return true;
            }
        } catch (error) {
            throw error; 
        }
        return false;
    },

    /**
     * @param {string} action 
     * @param {string} modelName 
     */
    can: (action, modelName) => {
        const user = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (!user || !user.role_name) return false;
        
       
        if (user.role_name.toLowerCase() === 'admin') return true;

        const perms = user.permissions || [];
       
        const modelPerm = perms.find(p => p.model_name.toLowerCase() === modelName.toLowerCase());
        
        if (!modelPerm) return false;

        
        const hasPermission = modelPerm[action.toLowerCase()];
        return hasPermission === true || hasPermission === 1 || hasPermission === "1";
    },

   
    getUser: () => JSON.parse(localStorage.getItem('user_data') || '{}'),
    

    isAuthenticated: () => {
        const token = localStorage.getItem('access_token');
        if (!token) return false;
        
        try {

            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
           
            return (payload.exp * 1000) > Date.now();
        } catch (e) {
            return false;
        }
    },
    
  
    logout: () => {
        localStorage.clear();
        window.location.href = 'index.html';
    },
    

    refreshToken: async () => {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) return false;
        try {
            const data = await apiFetch('/token/refresh/', {
                method: 'POST', body: { refresh }, useRefresh: true
            });
            if (data && data.access) {
                localStorage.setItem('access_token', data.access);
                return true;
            }
        } catch (e) { return false; }
        return false;
    }
};

window.auth = auth;
