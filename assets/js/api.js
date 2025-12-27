const API_BASE = "/api";

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
    if (res.status === 401) {
        logout();
        return;
    }
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'API Error');
    }
    return res.json();
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
