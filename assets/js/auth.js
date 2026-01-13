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
            console.error("Login Error:", error);
            throw error;
        }
        return false;
    },

    can: (action, modelName) => {
        const user = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (!user || !user.role_name) return false;
        
        
        if (user.role_name === 'admin') return true;

        const perms = user.permissions || [];
        
        const modelPerm = perms.find(p => p.model_name.toLowerCase() === modelName.toLowerCase());

        if (!modelPerm) return false;
        return !!modelPerm[action.toLowerCase()]; 
    },

    getUser: () => JSON.parse(localStorage.getItem('user_data') || '{}'),
    isAuthenticated: () => !!localStorage.getItem('access_token'),
    
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
