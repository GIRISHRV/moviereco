/**
 * Profile page JavaScript
 * Handles user profile display and management
 */

class ProfilePage {
    constructor() {
        // DOM elements
        this.profileUsername = document.getElementById('profile-username');
        this.profileEmail = document.getElementById('profile-email');
        this.moviesRatedCount = document.getElementById('movies-rated-count');
        this.moviesWatchedCount = document.getElementById('movies-watched-count');
        this.favoriteGenres = document.getElementById('favorite-genres');
        this.recentlyWatchedContainer = document.getElementById('recently-watched');
        this.watchlistContainer = document.getElementById('watchlist');
        this.editProfileForm = document.getElementById('edit-profile-form');
        this.loginBtnMain = document.getElementById('login-btn-main');
        this.registerBtnMain = document.getElementById('register-btn-main');
        this.avatarGrid = document.getElementById('avatar-grid');
        this.avatarPreview = document.getElementById('avatar-preview');
        
        // Remove these lines as we're not using them anymore
        // this.avatarPicker = document.getElementById('avatar-picker');
        // this.selectedAvatarInput = document.getElementById('selected-avatar');
        
        // User data
        this.userData = null;
        
        // Base path for avatars
        this.avatarsPath = '../assets/images/avatars';

        // Initialize
        this.init();
    }

    async init() {
        // Load default avatars first
        await this.loadDefaultAvatars();
        
        // Then bind events
        this.bindEvents();
        
        // Finally load user profile if logged in
        const token = localStorage.getItem('token');
        if (token) {
            await this.loadUserProfile();
        }
    }
    
    bindEvents() {
        // Edit profile form submit
        if (this.editProfileForm) {
            this.editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile(e);
            });
        }
        
        // Login button click (in the main content)
        if (this.loginBtnMain) {
            this.loginBtnMain.addEventListener('click', () => {
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            });
        }
        
        // Register button click (in the main content)
        if (this.registerBtnMain) {
            this.registerBtnMain.addEventListener('click', () => {
                const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
                registerModal.show();
            });
        }

        // Add preview for profile picture
        const avatarInput = document.getElementById('edit-avatar');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const preview = document.querySelector('.user-avatar');
                        if (preview) {
                            preview.src = e.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }
    
    async loadUserProfile() {
        try {
            this.userData = await apiService.getCurrentUser();
            
            // Update profile information
            this.updateProfileDisplay();
            
            // Load watch history and watchlist
            this.loadWatchHistory();
            this.loadWatchlist();
            
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Show an error message or handle as appropriate
        }
    }
    
    
    
    async loadWatchHistory() {
        if (!this.recentlyWatchedContainer || !this.userData) return;
        
        const watchHistory = this.userData.watch_history || [];
        
        // Clear container
        this.recentlyWatchedContainer.innerHTML = '';
        
        if (watchHistory.length === 0) {
            this.recentlyWatchedContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p>You haven't watched any movies yet.</p>
                    <a href="../index.html" class="btn btn-primary">Browse Movies</a>
                </div>
            `;
            return;
        }
        
        // Display recent watch history (last 6 movies)
        watchHistory.slice(0, 6).forEach(movie => {
            this.recentlyWatchedContainer.appendChild(this.createMovieCard(movie));
        });
    }
    
    async loadWatchlist() {
        if (!this.watchlistContainer || !this.userData) return;
        
        const watchlist = this.userData.watchlist || [];
        
        // Clear container
        this.watchlistContainer.innerHTML = '';
        
        if (watchlist.length === 0) {
            this.watchlistContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p>Your watchlist is empty.</p>
                    <a href="../index.html" class="btn btn-primary">Browse Movies</a>
                </div>
            `;
            return;
        }
        
        // Display watchlist (up to 6 movies)
        watchlist.slice(0, 6).forEach(movie => {
            const movieCard = this.createMovieCard(movie);
            
            // Add remove from watchlist button
            const cardBody = movieCard.querySelector('.movie-card-body');
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-sm btn-outline-danger mt-2';
            removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Remove';
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removeFromWatchlist(movie.id);
            });
            
            cardBody.appendChild(removeBtn);
            
            this.watchlistContainer.appendChild(movieCard);
        });
    }
    
    
    
    async removeFromWatchlist(movieId) {
        // In a real app, this would call the backend to remove the movie from watchlist
        
        // For this demo, we'll just simulate the removal
        if (this.userData && this.userData.watchlist) {
            this.userData.watchlist = this.userData.watchlist.filter(movie => movie.id !== movieId);
            
            // Reload watchlist
            this.loadWatchlist();
            
            // Show success message
            this.showToast('Movie removed from watchlist', 'success');
        }
    }
    
    createMovieCard(movie) {
        const movieCol = document.createElement('div');
        movieCol.className = 'col-lg-4 col-sm-6 mb-4';
        
        // Format release date
        const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString() : 'Unknown';
        
        // Format genres (if available)
        let genresHtml = '';
        if (movie.genres && movie.genres.length > 0) {
            genresHtml = movie.genres.map(genre => genre.name).join(', ');
        }
        
        movieCol.innerHTML = `
            <div class="movie-card">
                <div class="position-relative">
                    <img src="${apiService.getImageUrl(movie.poster_path)}" class="movie-poster" alt="${movie.title}">
                    <span class="movie-rating">${movie.vote_average?.toFixed(1) || 'N/A'}</span>
                </div>
                <div class="movie-card-body">
                    <h5 class="movie-title">${movie.title}</h5>
                    <div class="movie-genres">${genresHtml || releaseDate}</div>
                    <div class="movie-card-footer">
                        <small class="text-muted">${releaseDate}</small>
                        <a href="movie.html?id=${movie.tmdb_id || movie.id}" class="btn btn-sm btn-primary">Details</a>
                    </div>
                </div>
            </div>
        `;
        
        return movieCol;
    }
    
    showLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = `
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        document.body.appendChild(spinner);
        return spinner;
    }
    
    hideLoadingSpinner(spinner) {
        if (spinner && spinner.parentNode) {
            spinner.parentNode.removeChild(spinner);
        }
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

    loadDefaultAvatars() {
        const defaultAvatars = [
            'avatar1.png',
            'avatar2.png',
            'avatar3.png',
            'avatar4.png',
            'avatar5.png',
            'avatar6.png'
        ];

        // Use absolute paths for avatars
        this.renderAvatarGrid(defaultAvatars.map(filename => ({
            filename,
            url: `${this.avatarsPath}/${filename}`
        })));
    }

    async loadAvatars() {
        try {
            const response = await apiService.getAvatars();
            this.renderAvatarGrid(response.avatars);
        } catch (error) {
            console.error('Error loading avatars:', error);
        }
    }

    renderAvatarGrid(avatars) {
        if (!this.avatarGrid) return;

        this.avatarGrid.innerHTML = avatars.map(avatar => `
            <div class="avatar-item">
                <img src="${avatar.url}" 
                     class="avatar-option ${this.userData?.avatar_url === avatar.url ? 'selected' : ''}" 
                     data-avatar="${avatar.filename}"
                     alt="Avatar option">
            </div>
        `).join('');

        // Add click handlers
        this.avatarGrid.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', () => this.selectAvatar(option));
        });
    }

    async selectAvatar(element) {
        try {
            const avatarFilename = element.dataset.avatar;
            console.log('Selected avatar:', avatarFilename);

            if (!avatarFilename) {
                throw new Error('No avatar filename provided');
            }

            const formData = new FormData();
            formData.append('avatar', avatarFilename);

            // Keep existing user data
            formData.append('username', this.userData.username);
            formData.append('email', this.userData.email);

            const response = await apiService.updateProfile(formData);
            console.log('Profile update response:', response);
            
            // Update userData with the response
            if (response) {
                this.userData = {
                    ...this.userData,
                    avatar_url: avatarFilename // Use the filename directly
                };
                
                // Update UI
                this.updateProfileDisplay();
                
                // Update selected state in grid
                this.avatarGrid.querySelectorAll('.avatar-option').forEach(opt => {
                    opt.classList.toggle('selected', opt.dataset.avatar === avatarFilename);
                });
                
                // Close modal
                const modalElement = document.getElementById('avatarModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    modal?.hide();
                }
                
                this.showToast('Profile picture updated successfully', 'success');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
            this.showToast(error.message || 'Failed to update profile picture', 'danger');
        }
    }

    setupAvatarHandlers() {
        // Handle file upload
        if (this.avatarUpload) {
            this.avatarUpload.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                try {
                    const response = await apiService.uploadProfilePicture(file);
                    this.userData.avatar_url = response.url;
                    this.updateProfileDisplay();
                    this.loadAvatars(); // Refresh avatar grid
                    
                    // Close modal
                    bootstrap.Modal.getInstance(document.getElementById('avatarModal'))?.hide();
                } catch (error) {
                    console.error('Error uploading avatar:', error);
                    this.showToast('Failed to upload avatar', 'danger');
                }
            });
        }
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    window.profilePage = new ProfilePage();

    // Add logout button event listener
    const logoutBtn = document.getElementById('profile-logout-btn');
    const dropdownLogoutBtn = document.getElementById('logout-btn');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../landing.html';
    };

    logoutBtn?.addEventListener('click', handleLogout);
    dropdownLogoutBtn?.addEventListener('click', handleLogout);
});

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