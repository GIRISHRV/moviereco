function toggleSidebar() {
    const sidebar = document.getElementById("mySidebar");
    const mainContent = document.getElementById("main-content");
    const overlay = document.querySelector(".sidebar-overlay");
    
    if (sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
        mainContent.classList.remove("shifted");
        overlay.style.display = "none";
        document.body.style.overflow = "auto";
    } else {
        sidebar.classList.add("active");
        mainContent.classList.add("shifted");
        overlay.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

class DiscoverPage {
    constructor() {
        this.genresGrid = document.getElementById('genres-grid');
        this.loadingSpinner = document.getElementById('loading-spinner');
        
        // Initialize search form
        this.initializeSearch();
        this.loadGenres();
    }

    initializeSearch() {
        const searchForm = document.getElementById('search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = document.getElementById('search-input').value.trim();
                if (query) {
                    window.location.href = `search-results.html?query=${encodeURIComponent(query)}`;
                }
            });
        }
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

    showError(message = 'Failed to load genres. Please try again later.') {
        this.genresGrid.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    ${message}
                </div>
            </div>
        `;
    }

    async loadGenres() {
        try {
            this.showLoading();
            const response = await apiService.getGenres();
            console.log('Genres response:', response);
            
            const genres = response.genres || [];
            if (!genres.length) {
                this.showError('No genres available.');
                return;
            }

            this.genresGrid.innerHTML = genres.map(genre => `
                <div class="col-lg-3 col-md-4 col-sm-6">
                    <div class="genre-card" onclick="window.location.href='genre.html?id=${genre.id}&name=${encodeURIComponent(genre.name)}'">
                        <div class="genre-card-inner">
                            <h5 class="genre-title">${genre.name}</h5>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading genres:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }
}

// Add some CSS styles programmatically for the genre cards
const style = document.createElement('style');
style.textContent = `
    .genre-card {
        background: linear-gradient(45deg, var(--netflix-dark) 0%, #2a2a2a 100%);
        border-radius: 8px;
        padding: 2rem;
        height: 150px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        position: relative;
        overflow: hidden;
    }

    .genre-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        background: linear-gradient(45deg, var(--netflix-red) 0%, #b71c1c 100%);
    }

    .genre-card-inner {
        position: relative;
        z-index: 1;
    }

    .genre-title {
        color: white;
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }
`;
document.head.appendChild(style);

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    new DiscoverPage();
});