/**
 * Authentication Handler for the Movie Recommendation System
 * Manages user authentication state and UI updates
 */

class AuthHandler {
    constructor() {
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.loginBtn = document.getElementById('login-btn') || document.getElementById('login-btn-main');
        this.registerBtn = document.getElementById('register-btn') || document.getElementById('register-btn-main');
        this.logoutBtn = document.getElementById('logout-btn');
        
        // Initialize modals safely
        this.initializeModals();

        this.isLoggedIn = false;
        this.currentUser = null;
        
        // DOM elements
        this.authButtons = document.getElementById('auth-buttons');
        this.userInfo = document.getElementById('user-info');
        this.usernameEl = document.getElementById('username');
        
        this.init();
    }

    initializeModals() {
        try {
            this.loginModal = document.getElementById('loginModal');
            this.registerModal = document.getElementById('registerModal');
            
            if (this.registerModal) {
                // Do not clone the modal DOM element - this is causing the form reset
                const existingModal = bootstrap.Modal.getInstance(this.registerModal);
                if (existingModal) {
                    existingModal.dispose();
                }
                
                this.registerModalInstance = new bootstrap.Modal(this.registerModal, {
                    backdrop: 'static',
                    keyboard: false
                });
            }
            
            if (this.loginModal) {
                const existingModal = bootstrap.Modal.getInstance(this.loginModal);
                if (existingModal) {
                    existingModal.dispose();
                }
                this.loginModalInstance = new bootstrap.Modal(this.loginModal);
            }
        } catch (error) {
            console.error('Error initializing modals:', error);
        }
    }
    
    async init() {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            try {
                this.currentUser = await apiService.getCurrentUser();
                this.isLoggedIn = true;
                this.updateUI();
            } catch (error) {
                console.error('Error getting current user:', error);
                localStorage.removeItem('token');
                this.isLoggedIn = false;
                this.updateUI();
            }
        } else {
            this.isLoggedIn = false;
            this.updateUI();
        }
        
        this.setupEventListeners();

        // Add global logout handler
        document.querySelectorAll('#logout-btn, #profile-logout-btn').forEach(btn => {
            btn?.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }
    
    setupEventListeners() {
        // Login button click
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => {
                this.loginModalInstance?.show();
            });
        }
        
        // Register button click
        if (this.registerBtn) {
            this.registerBtn.addEventListener('click', () => {
                this.registerModalInstance?.show();
            });
        }
        
        // Logout button click
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Login form submit
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Register form submit - use direct DOM access instead of this.registerForm
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
    }
    
    async handleLogin() {
        try {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            // Form validation
            if (!email || !password) {
                this.showToast(email ? 'Password is required' : 'Email is required', 'danger');
                return;
            }
            
            // Show loading state
            const submitBtn = this.loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';
            
            const response = await apiService.login(email, password);
            
            if (response.access_token) {
                this.currentUser = response.user;
                this.isLoggedIn = true;
                this.updateUI();
                this.loginModalInstance?.hide();
                this.showToast('Login successful!', 'success');
                
                // Calculate correct path for index.html
                const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
                window.location.href = basePath + 'index.html';
            }
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.response?.detail || error.message || 'Login failed';
            this.showToast(errorMessage, 'danger');
        } finally {
            const submitBtn = this.loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Login';
        }
    }

    async handleRegister() {
        try {
            const formData = {
                full_name: document.getElementById('register-fullname')?.value.trim(),
                age: parseInt(document.getElementById('register-age')?.value),
                email: document.getElementById('register-email')?.value.trim(),
                gender: document.getElementById('register-gender')?.value,
                password: document.getElementById('register-password')?.value,
                confirmPassword: document.getElementById('register-confirm-password')?.value,
                location: document.getElementById('register-location')?.value.trim(),
                marital_status: document.getElementById('register-marital-status')?.value,
                favorite_countries: document.getElementById('register-countries')?.value.trim(),
                username: document.getElementById('register-username')?.value.trim()
            };

            // Validation
            if (!formData.full_name) {
                this.showToast('Full name is required', 'danger');
                return;
            }

            if (!formData.age || formData.age < 13) {
                this.showToast('Valid age is required (13+)', 'danger');
                return;
            }

            if (!formData.email) {
                this.showToast('Email is required', 'danger');
                return;
            }

            if (!formData.gender) {
                this.showToast('Please select a gender', 'danger');
                return;
            }

            if (!formData.password) {
                this.showToast('Password is required', 'danger');
                return;
            }

            if (formData.password.length < 6) {
                this.showToast('Password must be at least 6 characters', 'danger');
                return;
            }

            if (formData.password !== formData.confirmPassword) {
                this.showToast('Passwords do not match', 'danger');
                return;
            }

            if (!formData.location) {
                this.showToast('Location is required', 'danger');
                return;
            }

            if (!formData.marital_status) {
                this.showToast('Please select marital status', 'danger');
                return;
            }

            if (!formData.favorite_countries) {
                this.showToast('Please enter favorite countries', 'danger');
                return;
            }

            if (!formData.username) {
                this.showToast('Username is required', 'danger');
                return;
            }

            // Show loading state
            const submitBtn = this.registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';

            // Remove confirm password before sending
            delete formData.confirmPassword;

            const response = await apiService.register(formData);
            
            this.registerForm.reset();
            this.showToast('Registration successful! Please login.', 'success');
            
            this.registerModalInstance?.hide();
            setTimeout(() => {
                this.loginModalInstance?.show();
            }, 1000);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast(error.response?.detail || error.message || 'Registration failed', 'danger');
        } finally {
            const submitBtn = this.registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Register';
        }
    }

    createAlert(type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} mb-3`;
        alert.role = 'alert';
        document.querySelector('#registerModal .modal-body').insertBefore(
            alert,
            document.querySelector('#register-form')
        );
        return alert;
    }

    async fadeTransition(callback) {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';
        await new Promise(resolve => setTimeout(resolve, 300));
        callback();
    }
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use relative path based on current location
        const path = window.location.pathname.includes('/pages/') ? '../landing.html' : 'landing.html';
        window.location.href = path;
    }
    
    updateUI() {
        if (this.authButtons && this.userInfo) {
            if (this.isLoggedIn && this.currentUser) {
                this.authButtons.classList.add('d-none');
                this.userInfo.classList.remove('d-none');
                if (this.usernameEl) {
                    this.usernameEl.textContent = this.currentUser.username;
                }
            } else {
                this.authButtons.classList.remove('d-none');
                this.userInfo.classList.add('d-none');
            }
        }
        
        // Update other UI elements based on authentication state
        const authRequiredElements = document.querySelectorAll('.auth-required');
        const noAuthElements = document.querySelectorAll('.no-auth');
        
        authRequiredElements.forEach(element => {
            if (this.isLoggedIn) {
                element.classList.remove('d-none');
            } else {
                element.classList.add('d-none');
            }
        });
        
        noAuthElements.forEach(element => {
            if (this.isLoggedIn) {
                element.classList.add('d-none');
            } else {
                element.classList.remove('d-none');
            }
        });
    }
    
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0 mb-2`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toastEl);
        
        // Initialize and show toast
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
        toast.show();
        
        // Remove from DOM after hiding
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }
}

// Initialize auth handler safely
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.authHandler = new AuthHandler();
    } catch (error) {
        console.error('Error initializing AuthHandler:', error);
    }
});