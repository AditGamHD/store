// App state
let appState = {
    store: null,
    products: [],
    filteredProducts: [],
    currentLanguage: 'id',
    currentView: 'home',
    currentProductId: null,
    currentSellerUsername: null,
    currentCategory: 'all',
    searchQuery: '',
    isLoading: true,
    isError: false
};

// DOM Elements
let domElements = {};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeDOM();
    loadAppData();
    setupEventListeners();
    setupRouting();
});

// Initialize DOM elements
function initializeDOM() {
    domElements = {
        pageContent: document.getElementById('page-content'),
        languageSelect: document.querySelector('.language-select'),
        searchInput: document.querySelector('.search-input'),
        menuToggle: document.querySelector('.menu-toggle'),
        mainNav: document.querySelector('.main-nav'),
        whatsappCta: document.getElementById('whatsapp-cta'),
        whatsappButton: document.getElementById('whatsapp-button'),
        logoText: document.querySelector('.logo-text'),
        footerStoreName: document.querySelector('.footer-store-name'),
        footerTagline: document.querySelector('.footer-tagline'),
        copyright: document.querySelector('.copyright')
    };
}

// Load data from data.json
async function loadAppData() {
    try {
        appState.isLoading = true;
        
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Store the data in app state
        appState.store = data.store;
        appState.products = data.products;
        appState.filteredProducts = data.products;
        
        // Set initial language
        appState.currentLanguage = data.store.default_language || 'id';
        if (domElements.languageSelect) {
            domElements.languageSelect.value = appState.currentLanguage;
        }
        
        // Update store name in UI
        if (domElements.logoText) {
            domElements.logoText.textContent = appState.store.name;
        }
        if (domElements.footerStoreName) {
            domElements.footerStoreName.textContent = appState.store.name;
        }
        
        // Update copyright if provided
        if (appState.store.copyright && domElements.copyright) {
            domElements.copyright.textContent = appState.store.copyright;
        }
        
        appState.isLoading = false;
        appState.isError = false;
        
        // Render initial view based on current hash
        handleHashChange();
        
        // Update UI text based on language
        updateUIText();
        
    } catch (error) {
        console.error('Error loading app data:', error);
        appState.isLoading = false;
        appState.isError = true;
        renderErrorState();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Language selector
    if (domElements.languageSelect) {
        domElements.languageSelect.addEventListener('change', function() {
            appState.currentLanguage = this.value;
            updateUIText();
            renderCurrentView();
        });
    }
    
    // Search input
    if (domElements.searchInput) {
        let searchTimeout;
        domElements.searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                appState.searchQuery = this.value.trim().toLowerCase();
                filterProducts();
                renderCurrentView();
            }, 250);
        });
    }
    
    // Menu toggle for mobile
    if (domElements.menuToggle && domElements.mainNav) {
        domElements.menuToggle.addEventListener('click', function() {
            domElements.mainNav.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking a link
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768 && domElements.mainNav && domElements.mainNav.classList.contains('active')) {
            if (!domElements.mainNav.contains(event.target) && 
                !domElements.menuToggle.contains(event.target)) {
                domElements.mainNav.classList.remove('active');
            }
        }
    });
    
    // WhatsApp button
    if (domElements.whatsappButton) {
        domElements.whatsappButton.addEventListener('click', function() {
            const currentProduct = appState.products.find(p => p.id === appState.currentProductId);
            if (currentProduct) {
                openWhatsApp(currentProduct);
            }
        });
    }
    
    // Hash change
    window.addEventListener('hashchange', handleHashChange);
}

// Setup hash-based routing
function setupRouting() {
    // Initial hash check
    handleHashChange();
}

// Handle hash changes for routing
function handleHashChange() {
    const hash = window.location.hash || '#/';
    
    // Parse the hash to determine the view
    if (hash === '#/' || hash === '') {
        appState.currentView = 'home';
        appState.currentProductId = null;
        appState.currentSellerUsername = null;
        hideWhatsAppCTA();
    } else if (hash.startsWith('#/product/')) {
        appState.currentView = 'product-detail';
        const id = hash.replace('#/product/', '');
        appState.currentProductId = id;
        appState.currentSellerUsername = null;
        showWhatsAppCTA();
    } else if (hash.startsWith('#/seller/')) {
        appState.currentView = 'seller-profile';
        const username = hash.replace('#/seller/', '');
        appState.currentSellerUsername = username;
        appState.currentProductId = null;
        hideWhatsAppCTA();
    } else if (hash.startsWith('#/about')) {
        appState.currentView = 'about';
        appState.currentProductId = null;
        appState.currentSellerUsername = null;
        hideWhatsAppCTA();
    } else {
        // Default to home
        appState.currentView = 'home';
        appState.currentProductId = null;
        appState.currentSellerUsername = null;
        hideWhatsAppCTA();
    }
    
    // Update active nav link
    updateActiveNavLink();
    
    // Render the current view
    renderCurrentView();
}

// Update active navigation link
function updateActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        
        if (appState.currentView === 'home' && link.getAttribute('href') === '#/') {
            link.classList.add('active');
        } else if (appState.currentView === 'about' && link.getAttribute('href') === '#/about') {
            link.classList.add('active');
        }
    });
}

// Filter products based on search and category
function filterProducts() {
    let filtered = appState.products;
    
    // Apply search filter
    if (appState.searchQuery) {
        filtered = filtered.filter(product => {
            const title = getLocalizedText(product.title, appState.currentLanguage).toLowerCase();
            const description = getLocalizedText(product.description, appState.currentLanguage).toLowerCase();
            const tags = product.tags ? product.tags.join(' ').toLowerCase() : '';
            
            return title.includes(appState.searchQuery) || 
                   description.includes(appState.searchQuery) || 
                   tags.includes(appState.searchQuery);
        });
    }
    
    // Apply category filter
    if (appState.currentCategory && appState.currentCategory !== 'all') {
        filtered = filtered.filter(product => 
            product.category && product.category.toLowerCase() === appState.currentCategory.toLowerCase()
        );
    }
    
    appState.filteredProducts = filtered;
}

// Set category filter
function setCategoryFilter(category) {
    appState.currentCategory = category;
    filterProducts();
    renderCurrentView();
    
    // Update active filter button
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Render current view based on app state
function renderCurrentView() {
    if (appState.isLoading) {
        renderSkeleton();
        return;
    }
    
    if (appState.isError) {
        renderErrorState();
        return;
    }
    
    switch (appState.currentView) {
        case 'home':
            renderHomeView();
            break;
        case 'product-detail':
            renderProductDetailView();
            break;
        case 'seller-profile':
            renderSellerProfileView();
            break;
        case 'about':
            renderAboutView();
            break;
        default:
            renderHomeView();
    }
}

// Render home view with products grid
function renderHomeView() {
    const container = domElements.pageContent;
    if (!container) return;
    
    let html = `
        <div class="page-title" data-i18n="home.title">Produk Terbaru</div>
        <div class="filters-container">
            <button class="filter-btn ${appState.currentCategory === 'all' ? 'active' : ''}" 
                    data-category="all" data-i18n="filter.all">Semua</button>
    `;
    
    // Get unique categories
    const categories = [...new Set(appState.products.map(p => p.category).filter(Boolean))];
    categories.forEach(category => {
        const isActive = appState.currentCategory === category.toLowerCase();
        html += `
            <button class="filter-btn ${isActive ? 'active' : ''}" 
                    data-category="${category.toLowerCase()}">${escapeHtml(category)}</button>
        `;
    });
    
    html += `</div>`;
    
    if (appState.filteredProducts.length === 0) {
        html += `
            <div class="no-products">
                <div class="no-products-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3 class="no-products-title" data-i18n="home.noProductsTitle">Produk tidak ditemukan</h3>
                <p class="no-products-text" data-i18n="home.noProductsText">Coba gunakan kata kunci lain atau pilih kategori berbeda.</p>
            </div>
        `;
    } else {
        html += `<div class="products-grid" id="products-grid">`;
        
        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
            appState.filteredProducts.forEach((product, index) => {
                // Stagger animations
                setTimeout(() => {
                    renderProductCard(product, index);
                }, index * 50);
            });
        });
        
        html += `</div>`;
    }
    
    container.innerHTML = html;
    
    // Add event listeners to filter buttons
    const filterButtons = container.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            setCategoryFilter(this.dataset.category);
        });
    });
    
    // Render product cards
    if (appState.filteredProducts.length > 0) {
        const productsGrid = container.querySelector('#products-grid');
        if (productsGrid) {
            appState.filteredProducts.forEach((product, index) => {
                productsGrid.appendChild(createProductCardElement(product, index));
            });
        }
    }
}

// Create product card element
function createProductCardElement(product, index) {
    const card = document.createElement('div');
    card.className = `product-card ${product.available ? '' : 'unavailable'}`;
    card.dataset.id = product.id;
    card.dataset.i18nUnavailable = appState.currentLanguage === 'id' ? 'Habis' : 'Sold out';
    
    const title = getLocalizedText(product.title, appState.currentLanguage);
    const description = getLocalizedText(product.description, appState.currentLanguage);
    const price = formatPrice(product.price);
    
    // Seller info with verified badge if applicable
    let sellerHtml = '';
    if (product.seller) {
        let verifiedBadge = '';
        if (appState.store.show_verified_icon && 
            product.seller.show_verified && 
            product.seller.verified_badge_url) {
            verifiedBadge = `
                <img src="${escapeHtml(product.seller.verified_badge_url)}" 
                     alt="Verified" 
                     class="verified-badge" 
                     onerror="this.style.display='none'">
            `;
        }
        
        sellerHtml = `
            <div class="product-seller">
                <img src="${escapeHtml(product.seller.logo_url || '')}" 
                     alt="${escapeHtml(product.seller.username)}" 
                     class="seller-avatar"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iI0ZGQTExOCIvPjx0ZXh0IHg9IjE2IiB5PSIyMSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+${btoa(product.seller.username.charAt(0).toUpperCase())}</dGV4dD48L3N2Zz4='">
                <div class="seller-info">
                    <span class="seller-username">${escapeHtml(product.seller.username)}</span>
                    ${verifiedBadge}
                </div>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="product-image-container">
            <img src="${escapeHtml(product.icon_url || product.banner_url || '')}" 
                 alt="${escapeHtml(title)}" 
                 class="product-image"
                 loading="lazy"
                 decoding="async"
                 onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNGMUY1RjkiLz48cGF0aCBkPSJNMjAwIDEyMEMyMzEuMDQ2IDEyMCAyNTYgMTQ0Ljk1NCAyNTYgMTc2QzI1NiAyMDcuMDQ2IDIzMS4wNDYgMjMyIDIwMCAyMzJDMTY4Ljk1NCAyMzIgMTQ0IDIwNy4wNDYgMTQ0IDE3NkMxNDQgMTQ0Ljk1NCAxNjguOTU0IDEyMCAyMDAgMTIwWk0yMDAgMjgwQzI2MCAyODAgMzA4IDMwMS4yIDMwOCAzNDRIMTkyQzE5MiAzMDEuMiAyNDAgMjgwIDIwMCAyODBaIiBmaWxsPSIjQ0NEQUUwIiBmaWxsLW9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==';">
        </div>
        <div class="product-info">
            <h3 class="product-title">${escapeHtml(title)}</h3>
            <div class="product-price">${escapeHtml(price)}</div>
            <p class="product-description">${escapeHtml(description)}</p>
            ${sellerHtml}
            <div class="product-actions">
                <button class="btn btn-primary" data-i18n="button.view" data-id="${product.id}">Lihat Detail</button>
            </div>
        </div>
    `;
    
    // Add click event to view button
    const viewButton = card.querySelector('.btn-primary');
    if (viewButton) {
        viewButton.addEventListener('click', function(e) {
            e.stopPropagation();
            window.location.hash = `#/product/${product.id}`;
        });
    }
    
    // Add click event to entire card
    card.addEventListener('click', function(e) {
        if (!e.target.closest('.product-actions')) {
            window.location.hash = `#/product/${product.id}`;
        }
    });
    
    // Add animation delay
    card.style.animationDelay = `${index * 0.05}s`;
    
    return card;
}

// Render product detail view
function renderProductDetailView() {
    const container = domElements.pageContent;
    if (!container) return;
    
    const product = appState.products.find(p => p.id === appState.currentProductId);
    
    if (!product) {
        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 data-i18n="product.notFound">Produk tidak ditemukan</h3>
                <p data-i18n="product.notFoundText">Produk yang Anda cari tidak tersedia atau telah dihapus.</p>
                <button class="back-button" onclick="window.location.hash='#/'">Kembali ke Beranda</button>
            </div>
        `;
        return;
    }
    
    const title = getLocalizedText(product.title, appState.currentLanguage);
    const description = getLocalizedText(product.description, appState.currentLanguage);
    const price = formatPrice(product.price);
    
    // Seller info with verified badge if applicable
    let sellerHtml = '';
    if (product.seller) {
        let verifiedBadge = '';
        if (appState.store.show_verified_icon && 
            product.seller.show_verified && 
            product.seller.verified_badge_url) {
            verifiedBadge = `
                <img src="${escapeHtml(product.seller.verified_badge_url)}" 
                     alt="Verified" 
                     class="verified-badge" 
                     onerror="this.style.display='none'">
            `;
        }
        
        sellerHtml = `
            <div class="product-detail-seller">
                <img src="${escapeHtml(product.seller.logo_url || '')}" 
                     alt="${escapeHtml(product.seller.username)}" 
                     class="seller-detail-avatar"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIyNCIgZmlsbD0iI0ZGQTExOCIvPjx0ZXh0IHg9IjI0IiB5PSIzMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+${btoa(product.seller.username.charAt(0).toUpperCase())}</dGV4dD48L3N2Zz4='">
                <div class="seller-detail-info">
                    <div class="seller-detail-username">
                        ${escapeHtml(product.seller.username)}
                        ${verifiedBadge}
                    </div>
                    <a href="#/seller/${escapeHtml(product.seller.username)}" class="btn btn-secondary" style="margin-top: 8px; width: fit-content;">
                        <i class="fas fa-store"></i>
                        <span data-i18n="button.viewSeller">Lihat Toko</span>
                    </a>
                </div>
            </div>
        `;
    }
    
    // Product images gallery
    const images = product.images || [product.banner_url || product.icon_url || ''];
    const firstImage = images[0] || '';
    
    let galleryThumbnails = '';
    images.forEach((img, index) => {
        galleryThumbnails += `
            <img src="${escapeHtml(img)}" 
                 alt="${escapeHtml(title)} - ${index + 1}" 
                 class="thumbnail ${index === 0 ? 'active' : ''}"
                 data-index="${index}"
                 loading="lazy"
                 onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNGMUY1RjkiLz48cGF0aCBkPSJNNjAgMjBDNjAgMTYuODI0IDU3LjE3NiAxNCA1NCAxNEgyNkMyMi44MjQgMTQgMjAgMTYuODI0IDIwIDIwVjYwQzIwIDYzLjE3NiAyMi44MjQgNjYgMjYgNjZINTNDNTcuMTc2IDY2IDYwIDYzLjE3NiA2MCA2MFYyMFpNNDAgMzJDMzcuNzkwOSAzMiAzNiAzMy43OTA5IDM2IDM2QzM2IDM4LjIwOTEgMzcuNzkwOSA0MCA0MCA0MEM0Mi4yMDkxIDQwIDQ0IDM4LjIwOTEgNDQgMzZDNDQgMzMuNzkwOSA0Mi4yMDkxIDMyIDQwIDMyWiIgZmlsbD0iI0NDREFFMCIgZmlsbC1vcGFjaXR5PSIwLjUiLz48L3N2Zz4=';">
        `;
    });
    
    container.innerHTML = `
        <div class="product-detail-container">
            <div class="product-detail-gallery">
                <img src="${escapeHtml(firstImage)}" 
                     alt="${escapeHtml(title)}" 
                     class="gallery-main-image"
                     id="gallery-main-image"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDYwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiNGMUY1RjkiLz48cGF0aCBkPSJNMzAwIDE4MEMzNzEuNDYgMTgwIDQyMCAyMjguNTQgNDIwIDMwMEM0MjAgMzcxLjQ2IDM3MS40NiA0MjAgMzAwIDQyMEMyMjguNTQgNDIwIDE4MCAzNzEuNDYgMTgwIDMwMEMxODAgMjI4LjU0IDIyOC41NCAxODAgMzAwIDE4MFpNMzAwIDQyMEM0MjAgNDIwIDQyMCA0NjIuOCA0MjAgNTQwSDE4MEMyODAgNDYyLjggNDIwIDQyMCAzMDAgNDIwWiIgZmlsbD0iI0NDREFFMCIgZmlsbC1vcGFjaXR5PSIwLjUiLz48L3N2Zz4=';">
                ${images.length > 1 ? `<div class="gallery-thumbnails" id="gallery-thumbnails">${galleryThumbnails}</div>` : ''}
            </div>
            <div class="product-detail-info">
                <h1 class="product-detail-title">${escapeHtml(title)}</h1>
                <div class="product-detail-price">${escapeHtml(price)}</div>
                <div class="product-detail-description">${escapeHtml(description)}</div>
                ${sellerHtml}
                <div class="product-detail-actions">
                    <button class="btn btn-primary btn-buy" id="buy-button" ${!product.available ? 'disabled' : ''}>
                        <i class="fab fa-whatsapp"></i>
                        <span data-i18n="button.buy">Beli via WhatsApp</span>
                    </button>
                    <button class="btn btn-secondary" onclick="window.location.hash='#/'">
                        <i class="fas fa-arrow-left"></i>
                        <span data-i18n="button.back">Kembali</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners for gallery thumbnails
    if (images.length > 1) {
        const thumbnails = container.querySelectorAll('.thumbnail');
        const mainImage = container.querySelector('#gallery-main-image');
        
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', function() {
                const index = this.dataset.index;
                mainImage.src = images[index];
                
                // Update active thumbnail
                thumbnails.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
    
    // Add event listener to buy button
    const buyButton = container.querySelector('#buy-button');
    if (buyButton) {
        buyButton.addEventListener('click', function() {
            openWhatsApp(product);
        });
    }
}

// Render seller profile view
function renderSellerProfileView() {
    const container = domElements.pageContent;
    if (!container) return;
    
    // Find seller by username
    const sellerProducts = appState.products.filter(p => 
        p.seller && p.seller.username === appState.currentSellerUsername
    );
    
    if (sellerProducts.length === 0) {
        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 data-i18n="seller.notFound">Penjual tidak ditemukan</h3>
                <p data-i18n="seller.notFoundText">Penjual yang Anda cari tidak tersedia atau telah menghapus toko.</p>
                <button class="back-button" onclick="window.location.hash='#/'">Kembali ke Beranda</button>
            </div>
        `;
        return;
    }
    
    const seller = sellerProducts[0].seller;
    
    // Check if seller has verified badge
    let verifiedBadge = '';
    if (appState.store.show_verified_icon && 
        seller.show_verified && 
        seller.verified_badge_url) {
        verifiedBadge = `
            <img src="${escapeHtml(seller.verified_badge_url)}" 
                 alt="Verified" 
                 class="verified-badge" 
                 style="width: 24px; height: 24px;"
                 onerror="this.style.display='none'">
        `;
    }
    
    container.innerHTML = `
        <div class="seller-profile-container">
            <div class="seller-header">
                <img src="${escapeHtml(seller.logo_url || '')}" 
                     alt="${escapeHtml(seller.username)}" 
                     class="seller-profile-avatar"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNjAiIGZpbGw9IiNGRkExMTgiLz48dGV4dCB4PSI2MCIgeT0iODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPnNlbGxlci51c2VybmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKTwvdGV4dD48L3N2Zz4=';">
                <div class="seller-profile-info">
                    <h1 class="seller-profile-username">
                        ${escapeHtml(seller.username)}
                        ${verifiedBadge}
                    </h1>
                    <p class="seller-products-count">
                        ${sellerProducts.length} <span data-i18n="seller.productsCount">produk tersedia</span>
                    </p>
                </div>
            </div>
            <h2 class="seller-products-title" data-i18n="seller.products">Produk dari Penjual</h2>
            <div class="products-grid" id="seller-products-grid"></div>
        </div>
    `;
    
    // Render seller's products
    const sellerProductsGrid = container.querySelector('#seller-products-grid');
    if (sellerProductsGrid) {
        sellerProducts.forEach((product, index) => {
            setTimeout(() => {
                sellerProductsGrid.appendChild(createProductCardElement(product, index));
            }, index * 50);
        });
    }
}

// Render about view
function renderAboutView() {
    const container = domElements.pageContent;
    if (!container) return;
    
    // Check if there's a specific page parameter in the hash
    const hash = window.location.hash;
    const page = hash.includes('?page=') ? hash.split('?page=')[1] : 'about';
    
    if (page === 'privacy') {
        container.innerHTML = `
            <div class="about-container">
                <h1 class="page-title" data-i18n="privacy.title">Kebijakan Privasi</h1>
                <div class="about-section">
                    <h2 class="about-title" data-i18n="privacy.dataCollection">Pengumpulan Data</h2>
                    <p class="about-text" data-i18n="privacy.dataCollectionText">
                        Kami hanya mengumpulkan data yang diperlukan untuk memproses pesanan Anda. 
                        Data yang kami kumpulkan termasuk nama, nomor WhatsApp, dan detail produk yang dibeli.
                    </p>
                </div>
                <div class="about-section">
                    <h2 class="about-title" data-i18n="privacy.dataUsage">Penggunaan Data</h2>
                    <p class="about-text" data-i18n="privacy.dataUsageText">
                        Data Anda hanya digunakan untuk memproses pesanan dan mengirim konfirmasi. 
                        Kami tidak akan membagikan data Anda kepada pihak ketiga tanpa izin Anda.
                    </p>
                </div>
                <div class="about-section">
                    <h2 class="about-title" data-i18n="privacy.contact">Kontak</h2>
                    <p class="about-text" data-i18n="privacy.contactText">
                        Jika Anda memiliki pertanyaan tentang kebijakan privasi kami, 
                        silakan hubungi kami melalui WhatsApp atau email yang tersedia di halaman ini.
                    </p>
                </div>
                <button class="btn btn-secondary" onclick="window.location.hash='#/about'">
                    <i class="fas fa-arrow-left"></i>
                    <span data-i18n="button.backToAbout">Kembali ke Tentang</span>
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="about-container">
                <h1 class="page-title" data-i18n="about.title">Tentang ${escapeHtml(appState.store.name)}</h1>
                <div class="about-section">
                    <h2 class="about-title" data-i18n="about.welcome">Selamat Datang</h2>
                    <p class="about-text" data-i18n="about.welcomeText">
                        ${escapeHtml(appState.store.name)} adalah marketplace sederhana yang menyediakan berbagai produk digital seperti top up game, skin eksklusif, dan produk digital lainnya.
                    </p>
                </div>
                <div class="about-section">
                    <h2 class="about-title" data-i18n="about.howToBuy">Cara Membeli</h2>
                    <p class="about-text" data-i18n="about.howToBuyText">
                        1. Pilih produk yang ingin Anda beli<br>
                        2. Klik tombol "Beli via WhatsApp"<br>
                        3. Anda akan diarahkan ke WhatsApp untuk konfirmasi pesanan<br>
                        4. Lakukan pembayaran sesuai instruksi<br>
                        5. Produk akan dikirim setelah pembayaran dikonfirmasi
                    </p>
                </div>
                <div class="about-section">
                    <h2 class="about-title" data-i18n="about.contactUs">Hubungi Kami</h2>
                    <p class="about-text" data-i18n="about.contactUsText">
                        WhatsApp: ${appState.store.wa_number}<br>
                        Email: support@ditzxstore.com
                    </p>
                </div>
                <div class="about-section">
                    <a href="#/about?page=privacy" class="btn btn-secondary">
                        <i class="fas fa-shield-alt"></i>
                        <span data-i18n="button.privacy">Kebijakan Privasi</span>
                    </a>
                </div>
            </div>
        `;
    }
}

// Render skeleton loading state
function renderSkeleton() {
    const container = domElements.pageContent;
    if (!container) return;
    
    container.innerHTML = `
        <div class="skeleton-container">
            <div class="skeleton-header"></div>
            <div class="skeleton-filters"></div>
            <div class="products-grid">
                <div class="product-card skeleton-card"></div>
                <div class="product-card skeleton-card"></div>
                <div class="product-card skeleton-card"></div>
                <div class="product-card skeleton-card"></div>
            </div>
        </div>
    `;
}

// Render error state
function renderErrorState() {
    const container = domElements.pageContent;
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-message">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 data-i18n="error.loading">Gagal memuat data</h3>
            <p data-i18n="error.loadingText">Terjadi kesalahan saat memuat data toko. Silakan coba lagi nanti.</p>
            <button class="back-button" onclick="location.reload()">
                <i class="fas fa-redo"></i>
                <span data-i18n="button.retry">Coba Lagi</span>
            </button>
        </div>
    `;
}

// Update UI text based on current language
function updateUIText() {
    // This would typically pull from a localization file
    // For now, we'll implement a simple approach
    
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = getUIText(key, appState.currentLanguage);
        if (text) {
            el.textContent = text;
        }
    });
    
    // Update placeholder attributes
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const text = getUIText(key, appState.currentLanguage);
        if (text) {
            el.setAttribute('placeholder', text);
        }
    });
}

// Get UI text for localization
function getUIText(key, lang) {
    // Simple localization dictionary
    const translations = {
        'id': {
            'nav.home': 'Beranda',
            'nav.about': 'Tentang',
            'nav.privacy': 'Privasi',
            'search.placeholder': 'Cari produk...',
            'home.title': 'Produk Terbaru',
            'home.noProductsTitle': 'Produk tidak ditemukan',
            'home.noProductsText': 'Coba gunakan kata kunci lain atau pilih kategori berbeda.',
            'filter.all': 'Semua',
            'button.view': 'Lihat Detail',
            'button.buy': 'Beli via WhatsApp',
            'button.viewSeller': 'Lihat Toko',
            'button.back': 'Kembali',
            'button.backToAbout': 'Kembali ke Tentang',
            'button.privacy': 'Kebijakan Privasi',
            'button.retry': 'Coba Lagi',
            'product.notFound': 'Produk tidak ditemukan',
            'product.notFoundText': 'Produk yang Anda cari tidak tersedia atau telah dihapus.',
            'seller.notFound': 'Penjual tidak ditemukan',
            'seller.notFoundText': 'Penjual yang Anda cari tidak tersedia atau telah menghapus toko.',
            'seller.productsCount': 'produk tersedia',
            'seller.products': 'Produk dari Penjual',
            'about.title': 'Tentang DitzXstore',
            'about.welcome': 'Selamat Datang',
            'about.welcomeText': 'DitzXstore adalah marketplace sederhana yang menyediakan berbagai produk digital seperti top up game, skin eksklusif, dan produk digital lainnya.',
            'about.howToBuy': 'Cara Membeli',
            'about.howToBuyText': `1. Pilih produk yang ingin Anda beli
2. Klik tombol "Beli via WhatsApp"
3. Anda akan diarahkan ke WhatsApp untuk konfirmasi pesanan
4. Lakukan pembayaran sesuai instruksi
5. Produk akan dikirim setelah pembayaran dikonfirmasi`,
            'about.contactUs': 'Hubungi Kami',
            'about.contactUsText': 'WhatsApp: 6281234567890\nEmail: support@ditzxstore.com',
            'privacy.title': 'Kebijakan Privasi',
            'privacy.dataCollection': 'Pengumpulan Data',
            'privacy.dataCollectionText': 'Kami hanya mengumpulkan data yang diperlukan untuk memproses pesanan Anda. Data yang kami kumpulkan termasuk nama, nomor WhatsApp, dan detail produk yang dibeli.',
            'privacy.dataUsage': 'Penggunaan Data',
            'privacy.dataUsageText': 'Data Anda hanya digunakan untuk memproses pesanan dan mengirim konfirmasi. Kami tidak akan membagikan data Anda kepada pihak ketiga tanpa izin Anda.',
            'privacy.contact': 'Kontak',
            'privacy.contactText': 'Jika Anda memiliki pertanyaan tentang kebijakan privasi kami, silakan hubungi kami melalui WhatsApp atau email yang tersedia di halaman ini.',
            'footer.tagline': 'Marketplace sederhana untuk kebutuhan digital Anda.',
            'footer.links': 'Tautan',
            'footer.contact': 'Kontak',
            'footer.wa': 'WhatsApp: +62 812-3456-7890',
            'footer.email': 'Email: support@ditzxstore.com',
            'error.loading': 'Gagal memuat data',
            'error.loadingText': 'Terjadi kesalahan saat memuat data toko. Silakan coba lagi nanti.'
        },
        'en': {
            'nav.home': 'Home',
            'nav.about': 'About',
            'nav.privacy': 'Privacy',
            'search.placeholder': 'Search products...',
            'home.title': 'Latest Products',
            'home.noProductsTitle': 'No products found',
            'home.noProductsText': 'Try different keywords or select another category.',
            'filter.all': 'All',
            'button.view': 'View Details',
            'button.buy': 'Buy via WhatsApp',
            'button.viewSeller': 'View Store',
            'button.back': 'Back',
            'button.backToAbout': 'Back to About',
            'button.privacy': 'Privacy Policy',
            'button.retry': 'Try Again',
            'product.notFound': 'Product not found',
            'product.notFoundText': 'The product you are looking for is not available or has been removed.',
            'seller.notFound': 'Seller not found',
            'seller.notFoundText': 'The seller you are looking for is not available or has removed their store.',
            'seller.productsCount': 'products available',
            'seller.products': 'Products from Seller',
            'about.title': 'About DitzXstore',
            'about.welcome': 'Welcome',
            'about.welcomeText': 'DitzXstore is a simple marketplace that provides various digital products such as game top ups, exclusive skins, and other digital products.',
            'about.howToBuy': 'How to Buy',
            'about.howToBuyText': `1. Select the product you want to buy
2. Click the "Buy via WhatsApp" button
3. You will be directed to WhatsApp for order confirmation
4. Make payment according to instructions
5. Product will be sent after payment is confirmed`,
            'about.contactUs': 'Contact Us',
            'about.contactUsText': 'WhatsApp: 6281234567890\nEmail: support@ditzxstore.com',
            'privacy.title': 'Privacy Policy',
            'privacy.dataCollection': 'Data Collection',
            'privacy.dataCollectionText': 'We only collect data necessary to process your order. The data we collect includes name, WhatsApp number, and details of purchased products.',
            'privacy.dataUsage': 'Data Usage',
            'privacy.dataUsageText': 'Your data is only used to process orders and send confirmations. We will not share your data with third parties without your permission.',
            'privacy.contact': 'Contact',
            'privacy.contactText': 'If you have questions about our privacy policy, please contact us via WhatsApp or email available on this page.',
            'footer.tagline': 'Simple marketplace for your digital needs.',
            'footer.links': 'Links',
            'footer.contact': 'Contact',
            'footer.wa': 'WhatsApp: +62 812-3456-7890',
            'footer.email': 'Email: support@ditzxstore.com',
            'error.loading': 'Failed to load data',
            'error.loadingText': 'An error occurred while loading store data. Please try again later.'
        }
    };
    
    return translations[lang]?.[key] || key;
}

// Get localized text from product data
function getLocalizedText(textObj, lang) {
    if (!textObj) return '';
    
    if (typeof textObj === 'string') return textObj;
    
    return textObj[lang] || textObj[appState.store.default_language] || 
           textObj['id'] || textObj['en'] || 
           Object.values(textObj)[0] || '';
}

// Format price with currency
function formatPrice(price) {
    if (!price) return '';
    
    const amount = price.amount || 0;
    const currency = price.currency || 'IDR';
    
    if (currency === 'IDR') {
        return `Rp ${amount.toLocaleString('id-ID')}`;
    } else {
        return `${currency} ${amount.toLocaleString()}`;
    }
}

// Open WhatsApp with product info
function openWhatsApp(product) {
    if (!appState.store || !appState.store.wa_number) {
        alert('WhatsApp number is not configured.');
        return;
    }
    
    const template = product.whatsapp_message_template || appState.store.wa_message_default;
    const title = getLocalizedText(product.title, appState.currentLanguage);
    const price = formatPrice(product.price);
    const seller = product.seller?.username || '';
    
    // Replace placeholders in template
    let message = template
        .replace(/{id}/g, product.id)
        .replace(/{title}/g, title)
        .replace(/{price}/g, price)
        .replace(/{seller}/g, seller);
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${appState.store.wa_number}?text=${encodedMessage}`;
    
    window.open(url, '_blank');
}

// Show WhatsApp CTA button
function showWhatsAppCTA() {
    if (domElements.whatsappCta) {
        domElements.whatsappCta.style.display = 'block';
    }
}

// Hide WhatsApp CTA button
function hideWhatsAppCTA() {
    if (domElements.whatsappCta) {
        domElements.whatsappCta.style.display = 'none';
    }
}

// Render individual product card (for animation)
function renderProductCard(product, index) {
    // This is handled by createProductCardElement
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for global use (for onclick handlers in HTML)
window.openWhatsApp = openWhatsApp;
