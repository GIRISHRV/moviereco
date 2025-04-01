function toggleSidebar() {
    const sidebar = document.getElementById("mySidebar");
    const mainContent = document.getElementById("main-content");
    const overlay = document.querySelector(".sidebar-overlay");

    // Check if elements exist before manipulating them
    if (!sidebar || !mainContent || !overlay) {
        console.warn('Sidebar elements not found. Make sure the sidebar HTML is present in your document.');
        return;
    }

    try {
        if (sidebar.classList.contains("active")) {
            // Close sidebar
            sidebar.classList.remove("active");
            mainContent.classList.remove("shifted");
            overlay.style.display = "none";
            document.body.style.overflow = "auto";
        } else {
            // Open sidebar
            sidebar.classList.add("active");
            mainContent.classList.add("shifted");
            overlay.style.display = "block";
            document.body.style.overflow = "hidden";
        }
    } catch (error) {
        console.error('Error toggling sidebar:', error);
    }
}

class DiscoverPage {
    constructor() {
        this.genresGrid = document.getElementById('genre-filters');
        this.moviesGrid = document.getElementById('movies-grid');
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.resultsCount = document.getElementById('results-count');
        
        this.filters = {
            genres: new Set(),
            year: null,
            sort_by: 'popularity.desc',
            includeAdult: false,
            page: 1,
            vote_average: null,
            vote_count: null,
            language: 'en-US',
            with_watch_providers: null,
            with_runtime: {
                gte: null,
                lte: null
            }
        };

        this.initializeFilters();
        this.loadGenres();
    }

    initializeFilters() {
        // Sort filter
        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', () => {
                this.filters.sort_by = sortFilter.value;
                this.filters.page = 1;
                this.loadMovies();
            });
        }

        // Year filter
        const yearFilter = document.getElementById('year-filter');
        if (yearFilter) {
            yearFilter.addEventListener('input', () => {
                const year = yearFilter.value;
                this.filters.year = year ? parseInt(year) : null;
                this.filters.page = 1;
                this.loadMovies();
            });
        }

        // Rating filter
        const ratingFilter = document.getElementById('rating-filter');
        if (ratingFilter) {
            ratingFilter.addEventListener('change', () => {
                this.filters.vote_average = ratingFilter.value ? parseFloat(ratingFilter.value) : null;
                this.filters.page = 1;
                this.loadMovies();
            });
        }

        // Vote count filter
        const voteCountFilter = document.getElementById('vote-count-filter');
        if (voteCountFilter) {
            voteCountFilter.addEventListener('change', () => {
                this.filters.vote_count = voteCountFilter.value ? parseInt(voteCountFilter.value) : null;
                this.filters.page = 1;
                this.loadMovies();
            });
        }

        // Language filter
        const languageFilter = document.getElementById('language-filter');
        if (languageFilter) {
            languageFilter.addEventListener('change', () => {
                this.filters.language = languageFilter.value;
                this.filters.page = 1;
                this.loadMovies();
            });
        }

        // Runtime filters
        const runtimeMinFilter = document.getElementById('runtime-min');
        const runtimeMaxFilter = document.getElementById('runtime-max');
        if (runtimeMinFilter && runtimeMaxFilter) {
            const updateRuntime = () => {
                this.filters.with_runtime.gte = runtimeMinFilter.value ? parseInt(runtimeMinFilter.value) : null;
                this.filters.with_runtime.lte = runtimeMaxFilter.value ? parseInt(runtimeMaxFilter.value) : null;
                this.filters.page = 1;
                this.loadMovies();
            };
            runtimeMinFilter.addEventListener('input', updateRuntime);
            runtimeMaxFilter.addEventListener('input', updateRuntime);
        }

        // Adult content filter
        
        const adultFilter = document.getElementById('adult-filter');
        if (adultFilter) {
            adultFilter.checked = this.filters.includeAdult;
            
            adultFilter.addEventListener('change', () => {
                this.filters.includeAdult = adultFilter.checked;  // ✅ Store boolean value
                console.log('🔄 Adult filter toggled:', adultFilter.checked);
                console.log('✅ Updated filters:', this.filters);
                this.filters.page = 1;
                this.loadMovies();  // Reload movies with updated filters
            });
        }
    }

    async loadGenres() {
        try {
            console.log('🎬 Loading genres...');
            const response = await apiService.getGenres();
            console.log('📩 Genres Response:', response);

            if (!this.genresGrid) {
                console.error('❌ Genres grid not found');
                return;
            }

            if (!response?.genres?.length) {
                this.showError('No genres available.');
                return;
            }

            this.genresGrid.innerHTML = response.genres.map(genre => `
                <div class="col-12">
                    <button class="genre-btn" data-genre-id="${genre.id}">
                        ${genre.name}
                    </button>
                </div>
            `).join('');

            // Add event listeners
            this.genresGrid.querySelectorAll('.genre-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const genreId = button.dataset.genreId;
                    button.classList.toggle('active');
                    
                    if (button.classList.contains('active')) {
                        this.filters.genres.add(genreId);
                    } else {
                        this.filters.genres.delete(genreId);
                    }
                    
                    this.loadMovies();
                });
            });
        } catch (error) {
            console.error('❌ Error loading genres:', error);
            this.showError('Failed to load genres');
        }
    }

    async loadMovies() {
        try {
            this.showLoading();
            console.log('🎬 Loading movies with filters:', this.filters);
            
            // Build complete params object
            const params = {
                sort_by: this.filters.sort_by,
                page: this.filters.page,
                language: this.filters.language,
                include_adult: this.filters.includeAdult
            };

            // Add year filter
            if (this.filters.year) {
                params.primary_release_year = parseInt(this.filters.year);
            }

            // Add rating filter
            if (this.filters.vote_average) {
                params['vote_average.gte'] = parseFloat(this.filters.vote_average);
            }

            // Add vote count filter
            if (this.filters.vote_count) {
                params['vote_count.gte'] = parseInt(this.filters.vote_count);
            }

            // Add runtime filters
            if (this.filters.with_runtime.gte) {
                params['with_runtime.gte'] = parseInt(this.filters.with_runtime.gte);
            }
            if (this.filters.with_runtime.lte) {
                params['with_runtime.lte'] = parseInt(this.filters.with_runtime.lte);
            }

            // Add genres
            if (this.filters.genres.size > 0) {
                params.with_genres = Array.from(this.filters.genres).join(',');
            }

            console.log('📨 Final request params:', params);
            const response = await apiService.discoverMovies(params);
            console.log('📩 Movies response:', response);

            if (!response.results?.length) {
                this.moviesGrid.innerHTML = `
                    <div class="col-12 text-center">
                        <div class="alert alert-info">
                            No movies found matching your criteria.
                            <button class="btn btn-link" onclick="location.reload()">Reset Filters</button>
                        </div>
                    </div>
                `;
                return;
            }

            this.renderMovies(response.results);
            this.renderPagination(response.page, response.total_pages);

        } catch (error) {
            console.error('❌ Error loading movies:', error);
            this.showError('Failed to load movies. Please try again later.');
        } finally {
            this.hideLoading();
        }
    }
    

    renderMovies(movies) {
        if (!movies?.length) return;

        this.moviesGrid.innerHTML = movies.map(movie => `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card h-100 bg-dark movie-card">
                    <img src="${apiService.getImageUrl(movie.poster_path)}" 
                         class="card-img-top" 
                         alt="${movie.title}"
                         onerror="this.src='../assets/images/placeholder.jpg'">
                    <div class="card-body">
                        <h5 class="card-title text-truncate" title="${movie.title}">${movie.title}</h5>
                        <p class="card-text">
                            <small class="text-muted">
                                ${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                            </small>
                            <span class="float-end">
                                <i class="fas fa-star text-warning"></i> 
                                ${movie.vote_average?.toFixed(1) || 'N/A'}
                            </span>
                        </p>
                        <a href="movie.html?id=${movie.id}" class="btn btn-primary stretched-link">
                            View Details
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPagination(currentPage, totalPages) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer || totalPages <= 1) return;

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        let html = `
            <nav aria-label="Movie navigation">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${currentPage - 1}">&laquo;</button>
                    </li>
        `;

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <button class="page-link" data-page="${i}">${i}</button>
                </li>
            `;
        }

        html += `
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${currentPage + 1}">&raquo;</button>
                    </li>
                </ul>
            </nav>
        `;

        paginationContainer.innerHTML = html;

        // Add pagination event listeners
        paginationContainer.querySelectorAll('.page-link').forEach(button => {
            button.addEventListener('click', () => {
                const page = parseInt(button.dataset.page);
                if (!isNaN(page) && page > 0) {
                    this.filters.page = page;
                    this.loadMovies();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    showLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.classList.remove('d-none');
        }
    }

    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.classList.add('d-none');
        }
    }

    showError(message = 'Failed to load content. Please try again later.') {
        if (this.moviesGrid) {
            this.moviesGrid.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        ${message}
                    </div>
                </div>
            `;
        }
    }
}

// Add these styles to fix genre button appearance
const style = document.createElement('style');
style.textContent = `
/* Enhanced Genre Filter Section */
.filter-category {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Scrollable genre container */
#genre-filters {
    max-height: 400px;
    overflow-y: auto;
    padding-right: 10px;
    margin: 1rem 0;
    scrollbar-width: thin;
    scrollbar-color: var(--bs-danger) rgba(0, 0, 0, 0.2);
}

#genre-filters::-webkit-scrollbar {
    width: 6px;
}

#genre-filters::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
}

#genre-filters::-webkit-scrollbar-thumb {
    background-color: var(--bs-danger);
    border-radius: 3px;
}

#genre-filters::-webkit-scrollbar-thumb:hover {
    background-color: #bb2d3b;
}

/* Enhanced Genre Button Styles */
.genre-btn {
    width: 100%;
    padding: 0.8rem 1.2rem;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    text-align: left;
    border: 2px solid rgba(220, 53, 69, 0.5);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
    color: #fff;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
}

.genre-btn::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 3px;
    background-color: var(--bs-danger);
    transform: scaleY(0);
    transition: transform 0.2s;
}

.genre-btn:hover {
    transform: translateX(5px);
    background: rgba(220, 53, 69, 0.1);
    border-color: var(--bs-danger);
}

.genre-btn:hover::before {
    transform: scaleY(1);
}

.genre-btn.active {
    background-color: var(--bs-danger);
    border-color: var(--bs-danger);
    color: white;
    transform: translateX(5px);
}

.genre-btn.active::before {
    transform: scaleY(1);
}
`;
document.head.appendChild(style);

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    new DiscoverPage();
});