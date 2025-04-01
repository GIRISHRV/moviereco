class AuthGuard {
    static async checkAuth() {
        const token = localStorage.getItem('token');
        const currentPath = window.location.pathname;
        const isLandingPage = currentPath.endsWith('landing.html');
        const isRoot = currentPath.endsWith('/') || currentPath.endsWith('index.html');
        
        if (!token && !isLandingPage) {
            // If no token and not on landing, redirect to landing
            await this.fadeAndRedirect();
        } else if (token && isLandingPage) {
            // If has token and on landing, redirect to index
            await this.fadeAndRedirect('index.html');
        }
    }

    static async fadeAndRedirect(path = 'landing.html') {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Calculate relative path based on current location
        const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
        window.location.href = basePath + path;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Set initial opacity
    document.body.style.opacity = '1';
    AuthGuard.checkAuth();
});