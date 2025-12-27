function getApiPrefix() {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "";
    return "/.netlify/functions/main";
}

const API_BASE = `${getApiPrefix()}/api`;

function getToken() {
    return localStorage.getItem('panera_token');
}

function logout() {
    localStorage.removeItem('panera_token');
    window.location.href = '/login';
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(API_BASE + endpoint, options);
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    if (res.status === 401) {
        logout();
        return;
    }
    if (!res.ok) {
        const detail = data.detail || (text && text.trim().startsWith("<") ? "Servidor no disponible" : "API Error");
        throw new Error(detail);
    }
    return data;
}

const api = {
    getSales: () => apiCall('/sales'),
    saveSale: (sale) => apiCall('/sales', 'POST', sale),
    deleteSale: (id) => apiCall(`/sales/${id}`, 'DELETE'),
    
    getClients: () => apiCall('/clients'),
    saveClient: (client) => apiCall('/clients', 'POST', client),
    
    getProducts: () => apiCall('/products'),
    saveProduct: (product) => apiCall('/products', 'POST', product),
    
    // Add other entities as needed
};
