class LandingPage {
    constructor() {
        this.checkAuthStatus();
    }

    checkAuthStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            window.location.href = 'index.html'; // Remove /frontend/ prefix
        }
    }
}

// Initialize landing page
document.addEventListener('DOMContentLoaded', () => {
    new LandingPage();
});