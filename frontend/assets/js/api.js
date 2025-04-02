/**
 * API Service for the Movie Recommendation System
 * Handles all API calls to the backend
 */

class ApiService {
    constructor() {
        // Use environment-aware base URL
        this.baseUrl = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'  // Local development
            : 'https://moviereco-hh5q.onrender.com';  // Production
        this.imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
        this.isRefreshing = false;
        this.failedQueue = [];
        this.loadingStates = new Map();
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.requestQueue = [];
        this.maxConcurrentRequests = 4;
        this.activeRequests = 0;
        this.tmdbBaseUrl = 'https://api.themoviedb.org/3';
        this.tmdbToken = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiNDdlY2EyMTgyMzBmNTA2MGMzYjYwY2UxMWYzYTA3MCIsIm5iZiI6MTc0MzUzMDI3OS4wNDksInN1YiI6IjY3ZWMyOTI3NmI1NzA0MDE2MzJmYmQ4NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.d8IgDiUdaiXjHwIN5lAY5d--OekpeHpscEF_UDiVLRs';
    }

    setLoading(key, state) {
        this.loadingStates.set(key, state);
        this.notifyLoadingListeners(key, state);
    }

    isLoading(key) {
        return this.loadingStates.get(key) || false;
    }

    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // Generic API call method with error handling
    async apiCall(endpoint, options = {}) {
        if (!navigator.onLine) {
            throw new Error('No internet connection');
        }

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...this.getAuthHeaders(),
            },
        };
        
        // Special handling for form data
        if (options.body instanceof URLSearchParams) {
            defaultOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, finalOptions);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw {
                    status: response.status,
                    message: errorData?.detail || 'An error occurred',
                    data: errorData
                };
            }
            return response.json();
        } catch (error) {
            if (!navigator.onLine) {
                // Handle offline state
                this.notifyOffline();
            }
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // Helper method for TMDB image URLs
    getImageUrl(path) {
        if (!path) return '../assets/images/placeholder.jpg';
        return `https://image.tmdb.org/t/p/w500${path}`;
    }

    getBackdropUrl(path) {
        if (!path) {
            return 'assets/images/placeholder-backdrop.jpg'; // Fallback image if no backdrop is available
        }
        return `https://image.tmdb.org/t/p/original${path}`; // TMDB's base URL for backdrops
    }

    // Core movie methods
    async getPopularMovies(page = 1) {
        try {
            const response = await this.apiCall(`/movies/popular?page=${page}`);
            return {
                movies: response.movies || [],
                current_page: page,
                total_pages: Math.ceil((response.total_results || 0) / 20) // Assuming 20 movies per page
            };
        } catch (error) {
            console.error('Error fetching popular movies:', error);
            return {
                movies: [],
                current_page: 1,
                total_pages: 1
            };
        }
    }

    async getGenres() {
        return this.apiCall('/movies/genres');
    }

    async getMovieDetails(movieId) {
        try {
            const response = await this.apiCall(`/movies/${movieId}`, {
                headers: this.getAuthHeaders()
            });
            
            // Log the full response to see runtime
            console.log('Movie details response:', response);
            
            // Make sure runtime is included in the returned data
            return {
                ...response,
                runtime: response.runtime || 0 // Add runtime field
            };
        } catch (error) {
            console.error('Error fetching movie details:', error);
            throw error;
        }
    }

    async getSimilarMovies(movieId) {
        try {
            console.log('Fetching similar movies for:', movieId);
            const response = await this.apiCall(`/movies/${movieId}/similar?limit=25`);
            console.log('Similar movies response:', response);
            return {
                movies: response.movies || [],
                total_results: response.total_results || 0
            };
        } catch (error) {
            console.error('Error fetching similar movies:', error);
            return { movies: [], total_results: 0 };
        }
    }

    async login(email, password) {
        // FastAPI OAuth expects x-www-form-urlencoded format
        const formData = new URLSearchParams();
        formData.append('username', email); // FastAPI OAuth uses username field
        formData.append('password', password);

        try {
            const response = await this.apiCall('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            // Store token if successful
            if (response.access_token) {
                localStorage.setItem('token', response.access_token);
                localStorage.setItem('user', JSON.stringify(response.user));
            }

            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await this.apiCall('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            return response;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async getCurrentUser() {
        const token = localStorage.getItem('token');
        if (!token) return null;

        return this.apiCall('/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    async searchMovies(query, page = 1) {
        try {
            console.log(`Searching movies with query: ${query}, page: ${page}`);
            
            if (!query?.trim()) {
                return {
                    page: 1,
                    results: [],
                    total_pages: 0,
                    total_results: 0
                };
            }
            
            const encodedQuery = encodeURIComponent(query.trim());
            const response = await this.apiCall(`/movies/search?query=${encodedQuery}&page=${page}`);
            
            console.log('Search response:', response);
            return response;
            
        } catch (error) {
            console.error('Error searching movies:', error);
            return {
                page: 1,
                results: [],
                total_pages: 0,
                total_results: 0
            };
        }
    }

    async getMoviesByGenre(genreId, page = 1) {
        try {
            const response = await this.apiCall(`/movies/genre/${genreId}?page=${page}`);
            return {
                results: response.results || [],
                page: response.page || 1,
                total_pages: response.total_pages || 1,
                total_results: response.total_results || 0
            };
        } catch (error) {
            console.error('Error fetching genre movies:', error);
            return {
                results: [],
                page: 1,
                total_pages: 1,
                total_results: 0
            };
        }
    }
    
    async uploadProfilePicture(file) {
        const formData = new FormData();
        formData.append('avatar', file);

        return this.apiCall('/users/avatar', {
            method: 'POST',
            headers: {
                // Remove Content-Type to let browser set it with boundary
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
    }

    async updateProfile(formData) {
        const token = localStorage.getItem('token');
        
        console.log('Updating profile with data:', Object.fromEntries(formData));
        
        try {
            const response = await this.apiCall('/users/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            console.log('Profile update response:', response);
            
            if (!response) {
                throw new Error('No response from server');
            }
            
            return response;
        } catch (error) {
            console.error('Error in updateProfile:', error);
            throw error;
        }
    }

    async getAvatars() {
        return this.apiCall('/users/avatars');
    }

    async getPersonalizedRecommendations(limit = 12) {
        try {
            const response = await this.apiCall(`/recommendations/personalized?limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response || [];
        } catch (error) {
            console.error('Error getting recommendations:', error);
            return [];
        }
    }

    async getRecommendationsByGenre(genreId, limit = 8) {
        try {
            const response = await this.apiCall(`/recommendations/by-genre/${genreId}?limit=${limit}`);
            return response;
        } catch (error) {
            console.error('Error fetching genre recommendations:', error);
            throw error;
        }
    }

    async toggleWatchlist(movieId) {
        try {
            const response = await this.apiCall(`/users/watch-list/toggle`, {  // Changed from /users/watchlist
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ movie_id: movieId })
            });
            return response;
        } catch (error) {
            console.error('Error toggling watchlist:', error);
            throw error;
        }
    }

    async getWatchlist() {
        try {
            const response = await this.apiCall(`/users/watch-list`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.watchlist || [];
        } catch (error) {
            console.error('Error getting watchlist:', error);
            return []; // Return empty array instead of throwing
        }
    }

    async addToWatchHistory(movieId) {
        try {
            console.log('📝 Adding movie to watch history:', movieId);
            const response = await this.apiCall('/users/watch-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ movie_id: parseInt(movieId) })
            });
            console.log('✅ Movie added to watch history:', response);
            return response;
        } catch (error) {
            console.error('❌ Error adding to watch history:', error);
            throw error;
        }
    }

    async getWatchHistory(limit = 12) {
        try {
            const response = await this.apiCall(`/users/watch-history?limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.history || [];
        } catch (error) {
            console.error('Error getting watch history:', error);
            return [];
        }
    }

    async removeFromWatchHistory(movieId) {
        try {
            const response = await this.apiCall(`/users/watch-history/${movieId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response;
        } catch (error) {
            console.error('Error removing from watch history:', error);
            throw error;
        }
    }

    async getMovieReviews(movieId, page = 1) {
        try {
            console.log(`Fetching reviews for movie ${movieId}, page ${page}`);
            const response = await this.apiCall(`/movies/${movieId}/reviews?page=${page}`);
            console.log('Reviews API response:', response);
            return response;
        } catch (error) {
            console.error('Error fetching movie reviews:', error);
            return {
                results: [],
                page: 1,
                total_pages: 1,
                total_results: 0
            };
        }
    }

    async refreshToken() {
        try {
            const response = await this.apiCall('/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({
                    refresh_token: localStorage.getItem('refresh_token')
                })
            });
            localStorage.setItem('token', response.access_token);
            return response.access_token;
        } catch (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/landing.html';
            throw error;
        }
    }

    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    async queueRequest(request) {
        this.requestQueue.push(request);
        await this.processQueue();
    }

    async processQueue() {
        if (this.activeRequests >= this.maxConcurrentRequests) return;
        
        while (this.requestQueue.length && this.activeRequests < this.maxConcurrentRequests) {
            const request = this.requestQueue.shift();
            this.activeRequests++;
            try {
                await request();
            } finally {
                this.activeRequests--;
                this.processQueue();
            }
        }
    }

    destroy() {
        this.cache.clear();
        this.loadingStates.clear();
        this.failedQueue = [];
    }

    async getMovieVideos(movieId) {
        try {
            const response = await this.apiCall(`/movies/${movieId}/videos`);
            return response.videos || [];
        } catch (error) {
            console.error('Error fetching movie videos:', error);
            return [];
        }
    }

    async discoverMovies(params = {}) {
        try {
            console.log('📨 Original params:', params);

            // Build clean params object
            const cleanParams = {
                // Required params
                sort_by: params.sort_by || 'popularity.desc',
                page: Number(params.page) || 1,
                language: params.language || 'en-US',
                include_adult: Boolean(params.include_adult),
                include_video: false,

                // Optional filters
                with_genres: params.with_genres,
                primary_release_year: params.primary_release_year,
                'vote_average.gte': params['vote_average.gte'],
                'vote_count.gte': params['vote_count.gte'],
                'with_runtime.gte': params['with_runtime.gte'],
                'with_runtime.lte': params['with_runtime.lte']
            };

            // Remove undefined/null values
            Object.keys(cleanParams).forEach(key => {
                if (cleanParams[key] === undefined || cleanParams[key] === null) {
                    delete cleanParams[key];
                }
            });

            console.log('🧹 Clean params:', cleanParams);

            // Create query string
            const queryString = new URLSearchParams(cleanParams).toString();

            // Make API request
            const response = await fetch(`${this.tmdbBaseUrl}/discover/movie?${queryString}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.tmdbToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('📩 TMDb API Response:', data);

            return {
                results: data.results || [],
                page: data.page || 1,
                total_pages: data.total_pages || 1,
                total_results: data.total_results || 0
            };

        } catch (error) {
            console.error('❌ Error discovering movies:', error);
            throw error;
        }
    }

    async getUserProfile() {
        try {
            console.log('📥 Fetching user profile...');
            const token = localStorage.getItem('token');
            
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await this.apiCall('/users/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response) {
                throw new Error('No response from server');
            }

            console.log('📦 Profile response:', response);

            return {
                id: response.id,
                username: response.username,
                email: response.email,
                created_at: response.created_at,
                avatar: response.avatar_url || null
            };

        } catch (error) {
            console.error('❌ Error fetching user profile:', error);
            if (error.status === 405) {
                console.error('Method not allowed. Check API endpoint implementation.');
            }
            throw new Error('Failed to load user profile');
        }
    }

    async rateMovie(movieId, rating) {
        try {
            const response = await this.apiCall('/users/ratings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ movie_id: movieId, rating })
            });
            return response;
        } catch (error) {
            console.error('Error rating movie:', error);
            throw error;
        }
    }

    async getMovieRating(movieId) {
        try {
            const response = await this.apiCall(`/users/ratings/${movieId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.rating;
        } catch (error) {
            console.error('Error getting movie rating:', error);
            return null;
        }
    }

    async getUserRatings() {
        try {
            console.log('📥 Fetching user ratings...');
            const response = await this.apiCall('/users/ratings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            console.log('📦 Ratings response:', response);
            return response;
        } catch (error) {
            console.error('❌ Error getting user ratings:', error);
            throw error;
        }
    }
}    
// Create a singleton instance
const apiService = new ApiService();

// Add to your page cleanup code
window.addEventListener('unload', () => {
    apiService.destroy();
});