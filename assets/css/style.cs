
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

body {
    font-family: 'Cairo', sans-serif;
    background-color: #f3f4f6; 
}

/* Sidebar Styles */
.sidebar-link {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    margin-bottom: 8px;
    border-radius: 12px;
    color: #94a3b8; 
    transition: all 0.3s ease;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
}

.sidebar-link:hover {
    background-color: #1e293b; 
    color: white;
    transform: translateX(-4px); 
}

.sidebar-link.active {
    background-color: #2563eb; 
    color: white;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.sidebar-link i {
    width: 24px;
    margin-left: 12px;
    font-size: 1.1rem;
}

/* Toolbar Styles */
.toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    transition: all 0.2s;
    border: 1px solid transparent;
    cursor: pointer;
}

.toolbar-btn i {
    margin-left: 8px;
}

/* Specific Toolbar Buttons */
.btn-create { background-color: #16a34a; color: white; } 
.btn-create:hover { background-color: #15803d; }

.btn-read { background-color: #3b82f6; color: white; } 
.btn-read:hover { background-color: #1d4ed8; }

.btn-update { background-color: #f59e0b; color: white; } 
.btn-update:hover { background-color: #d97706; }

.btn-delete { background-color: #ef4444; color: white; } 
.btn-delete:hover { background-color: #b91c1c; }

/* Disabled State */
.toolbar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(100%);
}