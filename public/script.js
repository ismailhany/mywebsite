// --- THEME MANAGER (DARK/LIGHT MODE) ---
// This script is self-contained and runs immediately to prevent theme flashing.
(function() {
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const body = document.body;

    // 1. Function to apply the correct theme class and icon
    const applyTheme = (theme) => {
        body.classList.remove('light', 'dark');
        body.classList.add(theme);
        
        if (themeToggleButton) {
            const icon = themeToggleButton.querySelector('i');
            if (theme === 'dark') {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
        // Save the user's preference
        localStorage.setItem('theme', theme);
    };

    // 2. Set the initial theme on page load
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // 3. Add click listener to the button
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const newTheme = body.classList.contains('dark') ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }
})();


// --- MAIN SCRIPT ---
console.log('script.js loaded!');
// DOM Elements
const body = document.body;
const profile = document.querySelector('.header .flex .profile');
const searchForm = document.querySelector('.header .flex .search-form');
const sideBar = document.querySelector('.side-bar');
const toggleBtn = document.querySelector('#toggle-btn');
const menuBtn = document.querySelector('#menu-btn');
const searchBtn = document.querySelector('#search-btn');
const userBtn = document.querySelector('#user-btn');
const sidebar = document.querySelector('.sidebar');
const searchBox = document.querySelector('#search-box');
const filterSelects = document.querySelectorAll('.filter-select');
const courseCards = document.querySelectorAll('.course-card');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const sidebarOverlay = document.querySelector('.sidebar-overlay');
const closeSidebarBtn = document.querySelector('.close-sidebar');
const backToTopBtn = document.getElementById('back-to-top');
const loadingSpinner = document.getElementById('loading-spinner');
const notification = document.getElementById('notification');

// Toggle profile and search visibility
document.querySelector('#user-btn')?.addEventListener('click', () => {
    profile.classList.toggle('active');
    searchForm.classList.remove('active');
});

document.querySelector('#search-btn')?.addEventListener('click', () => {
    searchForm.classList.toggle('active');
    profile.classList.remove('active');
});

// Sidebar toggle
document.querySelector('#menu-btn')?.addEventListener('click', () => {
    sideBar.classList.toggle('active');
    body.classList.toggle('active');
});

document.querySelector('.side-bar .close-side-bar')?.addEventListener('click', () => {
    sideBar.classList.remove('active');
    body.classList.remove('active');
});

// Close elements on scroll
window.addEventListener('scroll', () => {
    profile.classList.remove('active');
    searchForm.classList.remove('active');

    if (window.innerWidth < 1200) {
        sideBar.classList.remove('active');
        body.classList.remove('active');
    }
});

// Form handling
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const action = form.getAttribute('action');
        const method = form.getAttribute('method') || 'POST';

        try {
            const response = await fetch(action, {
                method,
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.redirected) {
                window.location.href = response.url;
            } else {
                const result = await response.json();
                if (result.success) {
                    showMessage(result.success, 'success');
                } else if (result.error) {
                    showMessage(result.error, 'error');
                }
            }
        } catch (error) {
            showMessage('An error occurred. Please try again.', 'error');
        }
    });
});

// Show message function
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Add message styles
const style = document.createElement('style');
style.textContent = `
    .message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem;
        border-radius: 0.5rem;
        color: white;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    }
    
    .message.success {
        background-color: var(--green);
    }
    
    .message.error {
        background-color: var(--red);
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    
    .error {
        border-color: var(--red) !important;
    }
`;
document.head.appendChild(style);
// validtion
// Validation functions
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

const validatePassword = (password) => {
    return password.length >= 6;
};

const validateName = (name) => {
    return name.length >= 3;
};

const validateConfirmPassword = (password, confirmPassword) => {
    return password === confirmPassword;
};

// Show error message for a specific field
const showFieldError = (field, message) => {
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.color = 'var(--red)';
    errorElement.style.fontSize = '1.4rem';
    errorElement.style.marginTop = '0.5rem';

    // Remove any existing error message
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    field.classList.add('error');
    field.parentElement.appendChild(errorElement);
};

// Clear field error
const clearFieldError = (field) => {
    field.classList.remove('error');
    const errorElement = field.parentElement.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
};

// Form validation handler
const validateForm = (form) => {
    let isValid = true;
    const fields = form.querySelectorAll('input, textarea, select');

    fields.forEach(field => {
        // Skip hidden fields and buttons
        if (field.type === 'hidden' || field.type === 'submit' || field.type === 'button') return;

        // Required field validation
        if (field.required && !field.value.trim()) {
            showFieldError(field, 'هThis field is required');
            isValid = false;
            return;
        }

        // Specific field validations
        if (field.type === 'email' && field.value.trim() && !validateEmail(field.value.trim())) {
            showFieldError(field, 'Invalid email');
            isValid = false;
            return;
        }

        if (field.name === 'password' && field.value.trim() && !validatePassword(field.value.trim())) {
            showFieldError(field, 'password must be grater than 6 digets');
            isValid = false;
            return;
        }

        if (field.name === 'confirm_password' && field.value.trim()) {
            const password = form.querySelector('input[name="password"]')?.value;
            if (password && !validateConfirmPassword(password, field.value.trim())) {
                showFieldError(field, 'password not match');
                isValid = false;
                return;
            }
        }

        if ((field.name === 'name' || field.id === 'name') && field.value.trim() && !validateName(field.value.trim())) {
            showFieldError(field, 'name must be 3 diget at least');
            isValid = false;
            return;
        }

        // Clear error if field is valid
        clearFieldError(field);
    });

    return isValid;
};

// Add real-time validation for input fields
const addRealTimeValidation = () => {
    document.querySelectorAll('input, textarea, select').forEach(field => {
        field.addEventListener('input', () => {
            if (field.value.trim()) {
                clearFieldError(field);

                // Specific real-time validation
                if (field.type === 'email' && !validateEmail(field.value.trim())) {
                    showFieldError(field, 'email invalid');
                }

                if (field.name === 'password' && !validatePassword(field.value.trim())) {
                    showFieldError(field, 'password must be 6 digets at least');
                }

                if (field.name === 'confirm_password') {
                    const password = field.form?.querySelector('input[name="password"]')?.value;
                    if (password && !validateConfirmPassword(password, field.value.trim())) {
                        showFieldError(field, 'password not match');
                    }
                }

                if ((field.name === 'name' || field.id === 'name') && !validateName(field.value.trim())) {
                    showFieldError(field, 'name must be 3 diget at least');
                }
            }
        });

        field.addEventListener('blur', () => {
            if (field.required && !field.value.trim()) {
                showFieldError(field, 'This field is required');
            }
        });
    });
};

// Modify the existing form handling to include validation
document.querySelectorAll('form').forEach(form => {
    // Add real-time validation
    addRealTimeValidation();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate form before submission
        if (!validateForm(form)) {
            showMessage('Please correct the errors in the form.', 'error');
            return;
        }

        const formData = new FormData(form);
        const action = form.getAttribute('action');
        const method = form.getAttribute('method') || 'POST';

        try {
            const response = await fetch(action, {
                method,
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.redirected) {
                window.location.href = response.url;
            } else {
                const result = await response.json();
                if (result.success) {
                    showMessage(result.success, 'success');
                    form.reset();
                } else if (result.error) {
                    showMessage(result.error, 'error');

                    // Show field-specific errors if they exist
                    if (result.errors) {
                        Object.entries(result.errors).forEach(([fieldName, errorMessage]) => {
                            const field = form.querySelector(`[name="${fieldName}"]`);
                            if (field) {
                                showFieldError(field, errorMessage);
                            }
                        });
                    }
                }
            }
        } catch (error) {
            showMessage('Error tray again!!', 'error');
            console.error('Error:', error);
        }
    });
});

// Toggle Sidebar
menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    document.body.classList.toggle('active');
});

// Toggle Search Form
searchBtn.addEventListener('click', () => {
    searchForm.classList.toggle('active');
    profile.classList.remove('active');
});

// Toggle Profile
userBtn.addEventListener('click', () => {
    profile.classList.toggle('active');
    searchForm.classList.remove('active');
});

// Close Sidebar on Click Outside
document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove('active');
        document.body.classList.remove('active');
    }
});

// Search Functionality
searchBox.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    courseCards.forEach(card => {
        const title = card.querySelector('.course-title').textContent.toLowerCase();
        const category = card.querySelector('.course-category').textContent.toLowerCase();
        const instructor = card.querySelector('.course-instructor span').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || category.includes(searchTerm) || instructor.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Filter Functionality
filterSelects.forEach(select => {
    select.addEventListener('change', () => {
        const category = filterSelects[0].value.toLowerCase();
        const level = filterSelects[1].value.toLowerCase();
        const sortBy = filterSelects[2].value;

        courseCards.forEach(card => {
            const cardCategory = card.querySelector('.course-category').textContent.toLowerCase();
            const cardLevel = card.querySelector('.course-badge').textContent.toLowerCase();
            
            const categoryMatch = !category || cardCategory === category;
            const levelMatch = !level || cardLevel === level;
            
            card.style.display = categoryMatch && levelMatch ? 'block' : 'none';
        });

        // Sort functionality
        if (sortBy) {
            const cardsArray = Array.from(courseCards);
            cardsArray.sort((a, b) => {
                switch(sortBy) {
                    case 'popular':
                        return parseInt(b.querySelector('.course-students span').textContent) - 
                               parseInt(a.querySelector('.course-students span').textContent);
                    case 'rating':
                        return parseFloat(b.querySelector('.course-rating span').textContent) - 
                               parseFloat(a.querySelector('.course-rating span').textContent);
                    case 'newest':
                        return new Date(b.dataset.date) - new Date(a.dataset.date);
                    default:
                        return 0;
                }
            });
            
            const container = document.querySelector('.grid');
            cardsArray.forEach(card => container.appendChild(card));
        }
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, observerOptions);

courseCards.forEach(card => observer.observe(card));

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Add smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Add hover effect for course cards
courseCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Add pagination functionality
const paginationLinks = document.querySelectorAll('.pagination a');
paginationLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        paginationLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        // Add your pagination logic here
    });
});

// Mobile Menu Toggle
mobileMenuBtn?.addEventListener('click', () => {
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Close Sidebar
const closeSidebar = () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
};

closeSidebarBtn?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// Back to Top Button
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
});

backToTopBtn?.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Loading Spinner
const showLoading = () => {
    loadingSpinner.classList.add('active');
};

const hideLoading = () => {
    loadingSpinner.classList.remove('active');
};

// Notification System
const showNotification = (message, type = 'success', duration = 3000) => {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
};

// Form Validation
const handleFormSubmit = async (form, endpoint, successMessage) => {
    if (!validateForm(form)) {
        return;
    }
    
    showLoading();
    
    try {
        const formData = new FormData(form);
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(successMessage || 'Operation completed successfully');
            if (data.redirect) {
                window.location.href = data.redirect;
            }
        } else {
            showNotification(data.message || 'An error occurred', 'error');
        }
    } catch (error) {
        showNotification('An error occurred. Please try again.', 'error');
        console.error('Form submission error:', error);
    } finally {
        hideLoading();
    }
};

// File Upload Preview
const handleFileUpload = (input, previewElement) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            previewElement.src = e.target.result;
            previewElement.style.display = 'block';
        };
        
        reader.readAsDataURL(input.files[0]);
    }
};

// Search Functionality
const handleSearch = (input, endpoint, resultsContainer) => {
    let timeout;
    
    input.addEventListener('input', (e) => {
        clearTimeout(timeout);
        
        timeout = setTimeout(async () => {
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                resultsContainer.innerHTML = '';
                return;
            }
            
            try {
                const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (response.ok) {
                    resultsContainer.innerHTML = data.results.map(result => `
                        <div class="search-result">
                            <a href="${result.url}">
                                <img src="${result.image}" alt="${result.title}">
                                <div class="result-info">
                                    <h4>${result.title}</h4>
                                    <p>${result.description}</p>
                                </div>
                            </a>
                        </div>
                    `).join('');
                }
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);
    });
};

// Course Progress Tracking
const updateProgress = async (courseId, videoId) => {
    try {
        const response = await fetch('/api/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ courseId, videoId })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update progress');
        }
    } catch (error) {
        console.error('Progress update error:', error);
    }
};

// Video Player Controls
const initializeVideoPlayer = (videoElement) => {
    if (!videoElement) return;
    
    const controls = document.createElement('div');
    controls.className = 'video-controls';
    
    const playPauseBtn = document.createElement('button');
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progress = document.createElement('div');
    progress.className = 'progress';
    
    const volumeControl = document.createElement('input');
    volumeControl.type = 'range';
    volumeControl.min = 0;
    volumeControl.max = 1;
    volumeControl.step = 0.1;
    volumeControl.value = 1;
    
    controls.appendChild(playPauseBtn);
    controls.appendChild(progressBar);
    controls.appendChild(volumeControl);
    
    videoElement.parentNode.appendChild(controls);
    
    // Play/Pause
    playPauseBtn.addEventListener('click', () => {
        if (videoElement.paused) {
            videoElement.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            videoElement.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    
    // Progress Bar
    videoElement.addEventListener('timeupdate', () => {
        const percent = (videoElement.currentTime / videoElement.duration) * 100;
        progress.style.width = `${percent}%`;
    });
    
    progressBar.addEventListener('click', (e) => {
        const percent = e.offsetX / progressBar.offsetWidth;
        videoElement.currentTime = percent * videoElement.duration;
    });
    
    // Volume Control
    volumeControl.addEventListener('input', (e) => {
        videoElement.volume = e.target.value;
    });
};

// Initialize Components
document.addEventListener('DOMContentLoaded', () => {
    // Initialize video players
    document.querySelectorAll('video').forEach(initializeVideoPlayer);
    
    // Initialize search functionality
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results');
    if (searchInput && searchResults) {
        handleSearch(searchInput, '/api/search', searchResults);
    }
    
    // Initialize file upload previews
    document.querySelectorAll('input[type="file"]').forEach(input => {
        const preview = document.querySelector(input.dataset.preview);
        if (preview) {
            input.addEventListener('change', () => handleFileUpload(input, preview));
        }
    });
    
    // Initialize form submissions
    document.querySelectorAll('form[data-endpoint]').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(
                form,
                form.dataset.endpoint,
                form.dataset.successMessage
            );
        });
    });
});

// Login Page Functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('.auth-form');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('input[type="password"]');
    
    if (loginForm) {
        // Toggle password visibility
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.querySelector('i').classList.toggle('fa-eye');
                this.querySelector('i').classList.toggle('fa-eye-slash');
            });
        }
        
        // Form validation
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = this.querySelector('input[type="email"]');
            const password = this.querySelector('input[type="password"]');
            let isValid = true;
            
            // Reset previous errors
            this.querySelectorAll('.error-message').forEach(el => el.remove());
            this.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
            
            // Validate email
            if (!email.value.trim()) {
                showError(email, 'Email is required');
                isValid = false;
            } else if (!isValidEmail(email.value)) {
                showError(email, 'Please enter a valid email address');
                isValid = false;
            }
            
            // Validate password
            if (!password.value.trim()) {
                showError(password, 'Password is required');
                isValid = false;
            }
            
            if (isValid) {
                // Show loading state
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
                submitBtn.disabled = true;
                
                // Submit form
                fetch(this.dataset.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email.value,
                        password: password.value,
                        remember: this.querySelector('#remember').checked
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotification('success', 'Login successful! Redirecting...');
                        setTimeout(() => {
                            window.location.href = data.redirect || '/';
                        }, 1500);
                    } else {
                        showNotification('error', data.message || 'Login failed. Please try again.');
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }
                })
                .catch(error => {
                    showNotification('error', 'An error occurred. Please try again.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                });
            }
        });
    }
    
    // Social login buttons
    const socialButtons = document.querySelectorAll('.btn-social');
    socialButtons.forEach(button => {
        button.addEventListener('click', function() {
            const provider = this.classList.contains('btn-google') ? 'google' : 'facebook';
            showNotification('info', `Redirecting to ${provider} login...`);
            // Add your social login logic here
        });
    });
});

// Helper functions
function showError(input, message) {
    const formGroup = input.closest('.form-group');
    formGroup.classList.add('input-error');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    formGroup.appendChild(errorDiv);
}

function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// === COURSE FILTERS & SEARCH FOR COURSES PAGE ===
// Only run this block if we are on the courses page
if (document.querySelector('.courses-container') && document.querySelector('.course-card')) {
    const filterSelects = document.querySelectorAll('.filter-select');
    const searchInput = document.getElementById('search-input');
    const courseCards = document.querySelectorAll('.course-card');

    function filterCourses() {
        const category = document.getElementById('category-filter').value.toLowerCase();
        const level = document.getElementById('level-filter').value.toLowerCase();
        const price = document.getElementById('price-filter').value.toLowerCase();
        const rating = document.getElementById('rating-filter').value;
        const search = searchInput.value.trim().toLowerCase();

        let visibleCount = 0;
        courseCards.forEach(card => {
            const cardCategory = card.getAttribute('data-category')?.toLowerCase() || '';
            const cardLevel = card.getAttribute('data-level')?.toLowerCase() || '';
            const cardPrice = card.getAttribute('data-price')?.toLowerCase() || '';
            const cardRating = parseFloat(card.getAttribute('data-rating')) || 0;
            const cardTitle = card.querySelector('h3')?.textContent.toLowerCase() || '';

            // Filter logic
            const matchCategory = !category || cardCategory === category;
            const matchLevel = !level || cardLevel === level;
            const matchPrice = !price || cardPrice === price;
            const matchRating = !rating || cardRating >= parseFloat(rating);
            const matchSearch = !search || cardTitle.includes(search) || cardCategory.includes(search);

            if (matchCategory && matchLevel && matchPrice && matchRating && matchSearch) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show/hide the 'No Courses Found' message
        const noCoursesDiv = document.querySelector('.no-courses');
        if (noCoursesDiv) {
            if (visibleCount === 0) {
                noCoursesDiv.style.display = '';
            } else {
                noCoursesDiv.style.display = 'none';
            }
        }
    }

    filterSelects.forEach(select => {
        select.addEventListener('change', filterCourses);
    });
    searchInput.addEventListener('input', filterCourses);
}

// === LIKE BUTTON LOGIC FOR COURSES ===
function getLikedCourses() {
    return JSON.parse(localStorage.getItem('likedCourses') || '[]');
}

function setLikedCourses(ids) {
    localStorage.setItem('likedCourses', JSON.stringify(ids));
}

function updateLikeButtons() {
    const liked = getLikedCourses();
    document.querySelectorAll('.like-btn').forEach(btn => {
        const courseId = btn.getAttribute('data-course-id');
        const icon = btn.querySelector('i');
        icon.classList.remove('fa-regular', 'fa-solid', 'fa-heart');
        icon.classList.add('fa-heart');
        if (liked.includes(courseId)) {
            icon.classList.add('fa-solid');
            icon.style.color = 'red';
        } else {
            icon.classList.add('fa-regular');
            icon.style.color = '';
        }
    });
}

document.addEventListener('click', function(e) {
    if (e.target.closest('.like-btn')) {
        const btn = e.target.closest('.like-btn');
        const courseId = btn.getAttribute('data-course-id');
        let liked = getLikedCourses();
        if (liked.includes(courseId)) {
            liked = liked.filter(id => id !== courseId);
        } else {
            liked.push(courseId);
        }
        setLikedCourses(liked);
        updateLikeButtons();
    }
});

document.addEventListener('DOMContentLoaded', updateLikeButtons);