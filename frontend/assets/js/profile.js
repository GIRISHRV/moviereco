/**
 * Profile page JavaScript
 * Handles user profile display and management
 */

// Add at the top of the file
function toggleSidebar() {
    const sidebar = document.getElementById("mySidebar");
    const mainContent = document.getElementById("main-content");
    const overlay = document.querySelector(".sidebar-overlay");
    
    if (sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
        mainContent.classList.remove("shifted");
        overlay.style.display = "none";
    } else {
        sidebar.classList.add("active");
        mainContent.classList.add("shifted");
        overlay.style.display = "block";
    }
}

class ProfilePage {
    constructor() {
        console.log('🎬 Initializing ProfilePage...');
        
        // Initialize state first
        this.watchHistory = [];
        this.stats = {
            moviesWatched: 0,
            averageRating: 0,
            totalWatchTime: 0
        };
        
        // Bind all methods that use 'this'
        this.init = this.init.bind(this);
        this.loadUserProfile = this.loadUserProfile.bind(this);
        this.updateProfileDisplay = this.updateProfileDisplay.bind(this);
        this.loadWatchHistory = this.loadWatchHistory.bind(this);
        this.calculateStats = this.calculateStats.bind(this);
        this.updateStatsDisplay = this.updateStatsDisplay.bind(this);
        this.renderWatchHistory = this.renderWatchHistory.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
        this.removeFromHistory = this.removeFromHistory.bind(this);

        // Initialize DOM elements
        this.elements = {
            profileUsername: document.getElementById('username-display'),
            memberSince: document.getElementById('member-since'),
            moviesWatchedCount: document.getElementById('movies-watched-count'),
            averageRating: document.getElementById('average-rating'),
            totalWatchTime: document.getElementById('total-watch-time'),
            watchHistoryContainer: document.getElementById('watch-history'),
            logoutButton: document.getElementById('profile-logout-btn'),
            sortDateButton: document.getElementById('sort-date'),
            sortRatingButton: document.getElementById('sort-rating'),
            profileAvatar: document.querySelector('.user-avatar')
        };

        // Set default avatar
        if (this.elements.profileAvatar) {
            this.elements.profileAvatar.src = '../assets/images/avatars/default.png';
        }

        // Start initialization
        this.init();
    }

    validateElements() {
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.error('❌ Missing DOM elements:', missingElements);
        }
    }

    async init() {
        try {
            console.log('🚀 Initializing profile data...');
            await this.loadUserProfile();
            await this.loadWatchHistory();
            this.setupEventListeners();
            console.log('✅ Profile initialized successfully');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Failed to load profile data. Please refresh the page.');
        }
    }

    async loadUserProfile() {
        try {
            console.log('📥 Loading user profile...');
            const profile = await apiService.getUserProfile();
            
            if (!profile) {
                throw new Error('No profile data received');
            }
            
            console.log('📦 Profile loaded:', profile);
            this.updateProfileDisplay(profile);
            return profile;
        } catch (error) {
            console.error('❌ Profile loading error:', error);
            // Show a more specific error message
            const message = error.message === 'No auth token found' 
                ? 'Please log in to view your profile'
                : 'Failed to load profile data';
            throw new Error(message);
        }
    }

    async loadWatchHistory() {
        try {
            console.log('📥 Loading watch history...');
            this.watchHistory = await apiService.getWatchHistory();
            console.log('📦 Watch history:', this.watchHistory);
            
            this.calculateStats();
            this.renderWatchHistory();
        } catch (error) {
            console.error('❌ Error loading watch history:', error);
            throw error;
        }
    }

    async updateProfileDisplay(profile) {
        if (!profile) return;

        const { profileUsername, memberSince, profileAvatar } = this.elements;
        
        if (profileUsername && profile.username) {
            profileUsername.textContent = profile.username;
        }
        
        if (memberSince && profile.created_at) {
            const date = new Date(profile.created_at).toLocaleDateString();
            memberSince.textContent = `Member since: ${date}`;
        }

        if (profileAvatar && profile.avatar) {
            profileAvatar.src = profile.avatar;
        }
    }

    calculateStats() {
        if (!this.watchHistory) return;

        // Calculate total movies watched
        this.stats.moviesWatched = this.watchHistory.length;
        
        // Calculate average rating
        const totalRating = this.watchHistory.reduce((sum, movie) => 
            sum + (movie.vote_average || 0), 0);
        this.stats.averageRating = this.watchHistory.length ? 
            (totalRating / this.watchHistory.length).toFixed(1) : 0;
        
        // Calculate total watch time from movie runtimes
        this.stats.totalWatchTime = this.watchHistory.reduce((sum, movie) => {
            const runtime = movie.runtime || 0; // Get runtime in minutes
            return sum + runtime;
        }, 0);

        this.updateStatsDisplay();
        console.log('📊 Updated stats:', this.stats);
    }

    updateStatsDisplay() {
        const { moviesWatchedCount, averageRating, totalWatchTime } = this.elements;

        if (moviesWatchedCount) {
            moviesWatchedCount.textContent = this.stats.moviesWatched;
        }
        if (averageRating) {
            averageRating.textContent = this.stats.averageRating;
        }
        if (totalWatchTime) {
            totalWatchTime.textContent = this.formatWatchTime(this.stats.totalWatchTime);
        }
    }

    formatWatchTime(minutes) {
        if (!minutes) return '0h 0m';
        
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h`;
        }
        
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    renderWatchHistory(sortBy = 'date') {
        const { watchHistoryContainer } = this.elements;

        if (!watchHistoryContainer || !this.watchHistory) return;

        console.log('🎨 Rendering watch history...');

        const sortedHistory = [...this.watchHistory].sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.watched_at) - new Date(a.watched_at);
            }
            return b.vote_average - a.vote_average;
        });

        watchHistoryContainer.innerHTML = sortedHistory.length ? 
            sortedHistory.map(movie => this.createHistoryCard(movie)).join('') :
            `<div class="col-12 text-center">
                <div class="alert alert-info">No movies in watch history</div>
            </div>`;
    }

    createHistoryCard(movie) {
        return `
            <div class="col-6 col-sm-4 col-md-3 col-lg-2 mb-4">
                <div class="card bg-dark h-100 position-relative">
                    <img src="${apiService.getImageUrl(movie.poster_path)}" 
                         class="card-img-top" 
                         alt="${movie.title}"
                         title="${movie.title}"
                         onerror="this.src='../assets/images/placeholder.jpg'">
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const { sortDateButton, sortRatingButton, watchHistoryContainer, logoutButton } = this.elements;

        // Sort buttons
        sortDateButton?.addEventListener('click', () => {
            this.renderWatchHistory('date');
        });
        
        sortRatingButton?.addEventListener('click', () => {
            this.renderWatchHistory('rating');
        });

        // Remove buttons
        watchHistoryContainer?.addEventListener('click', async (e) => {
            const removeBtn = e.target.closest('.remove-btn');
            if (removeBtn) {
                const movieId = removeBtn.dataset.movieId;
                await this.removeFromHistory(movieId);
            }
        });

        // Logout button
        logoutButton?.addEventListener('click', () => {
            this.handleLogout();
        });
    }

    async removeFromHistory(movieId) {
        try {
            await apiService.removeFromWatchHistory(movieId);
            this.watchHistory = this.watchHistory.filter(m => m.id !== movieId);
            this.calculateStats();
            this.renderWatchHistory();
            this.showToast('Movie removed from history', 'success');
        } catch (error) {
            console.error('❌ Error removing movie:', error);
            this.showToast('Failed to remove movie', 'danger');
        }
    }

    handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../landing.html';
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container') || this.createToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        new bootstrap.Toast(toast).show();
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
        return container;
    }

    showError(message) {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                </div>
            `;
        }
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check for API service
        if (typeof apiService === 'undefined') {
            throw new Error('API service not initialized');
        }

        // Initialize profile page
        const profilePage = new ProfilePage();
        window.profilePage = profilePage;

    } catch (error) {
        console.error('❌ Failed to initialize profile page:', error);
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to initialize profile page. Please refresh and try again.
                    <br><small class="text-muted">${error.message}</small>
                </div>
            `;
        }
    }
});