// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initLoadingScreen();
    initNavigation();
    initSmoothScrolling();
    initPortfolioFilter();
    initContactForm();
    initScrollAnimations();
    initSkillBars();
    initTypingEffect();
    initCursorTrail();
    initThemeToggle();
    initActiveNavigation();
    initAdvancedFormEffects();
    initToastNotifications();
});

// Navigation functionality
function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on nav links
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Navbar background change on scroll with throttling
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                const navbar = document.querySelector('.navbar');
                const isDark = document.body.classList.contains('dark-theme');
                
                if (window.scrollY > 100) {
                    if (isDark) {
                        navbar.style.background = 'rgba(26, 26, 26, 0.98)';
                        navbar.style.boxShadow = '0 2px 30px rgba(0, 0, 0, 0.3)';
                    } else {
                        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                        navbar.style.boxShadow = '0 2px 30px rgba(0, 0, 0, 0.15)';
                    }
                } else {
                    if (isDark) {
                        navbar.style.background = 'rgba(26, 26, 26, 0.95)';
                        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.2)';
                    } else {
                        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    });
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Portfolio filtering
function initPortfolioFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');

            const filterValue = this.getAttribute('data-filter');

            portfolioItems.forEach(item => {
                const category = item.getAttribute('data-category');
                
                if (filterValue === 'all' || category === filterValue) {
                    item.style.display = 'block';
                    item.style.animation = 'fadeInUp 0.6s ease forwards';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

// Contact form handling
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');
            
            // Simple validation
            if (!name || !email || !subject || !message) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            // Simulate form submission
            showNotification('Sending message...', 'info');
            
            setTimeout(() => {
                showNotification('Message sent successfully! I\'ll get back to you soon.', 'success');
                contactForm.reset();
            }, 2000);
        });
    }
}

// Scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.section-header, .about-content, .skills-grid, .portfolio-grid, .contact-content');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(el);
    });
}

// Skill bars animation
function initSkillBars() {
    const skillBars = document.querySelectorAll('.skill-bar');
    
    const skillObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const skillBar = entry.target;
                const level = skillBar.getAttribute('data-level');
                skillBar.style.width = level + '%';
            }
        });
    }, { threshold: 0.5 });

    skillBars.forEach(bar => {
        skillObserver.observe(bar);
    });
}

// Typing effect for hero title
function initTypingEffect() {
    const titleName = document.querySelector('.title-name');
    if (titleName) {
        const text = titleName.textContent;
        titleName.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                titleName.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 150);
            }
        };
        
        // Start typing effect after a delay
        setTimeout(typeWriter, 1000);
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Parallax effect for floating shapes
function initParallaxEffect() {
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const shapes = document.querySelectorAll('.shape');
        
        shapes.forEach((shape, index) => {
            const speed = 0.5 + (index * 0.1);
            const yPos = -(scrolled * speed);
            shape.style.transform = `translateY(${yPos}px)`;
        });
    });
}

// Initialize parallax effect
initParallaxEffect();

// Counter animation for stats
function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number');
    
    const counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.textContent);
                const increment = target / 100;
                let current = 0;
                
                const updateCounter = () => {
                    if (current < target) {
                        current += increment;
                        counter.textContent = Math.ceil(current) + '+';
                        setTimeout(updateCounter, 20);
                    } else {
                        counter.textContent = target + '+';
                    }
                };
                
                updateCounter();
                counterObserver.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

// Initialize counter animation
initCounterAnimation();

// Add loading animation to page
function addLoadingAnimation() {
    const loader = document.createElement('div');
    loader.className = 'page-loader';
    loader.innerHTML = `
        <div class="loader-content">
            <div class="loader-spinner"></div>
            <p>Loading...</p>
        </div>
    `;
    
    // Add loader styles
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        transition: opacity 0.5s ease;
    `;
    
    const loaderContent = loader.querySelector('.loader-content');
    loaderContent.style.cssText = `
        text-align: center;
        color: white;
    `;
    
    const spinner = loader.querySelector('.loader-spinner');
    spinner.style.cssText = `
        width: 50px;
        height: 50px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    `;
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(loader);
    
    // Remove loader after page loads
    window.addEventListener('load', function() {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }, 1000);
    });
}

// Initialize loading animation
addLoadingAnimation();

// Add cursor trail effect
function initCursorTrail() {
    const cursor = document.createElement('div');
    cursor.className = 'cursor-trail';
    cursor.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        opacity: 0.7;
        transition: transform 0.1s ease;
    `;
    
    document.body.appendChild(cursor);
    
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    
    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    function animateCursor() {
        cursorX += (mouseX - cursorX) * 0.1;
        cursorY += (mouseY - cursorY) * 0.1;
        
        cursor.style.transform = `translate(${cursorX - 10}px, ${cursorY - 10}px)`;
        requestAnimationFrame(animateCursor);
    }
    
    animateCursor();
}

// Initialize cursor trail (optional - can be disabled)
// initCursorTrail();

// Add scroll progress indicator
function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        z-index: 10001;
        transition: width 0.1s ease;
    `;
    
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', function() {
        const scrolled = (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

// Initialize scroll progress
initScrollProgress();

// Add floating action button
function initFloatingActionButton() {
    const fab = document.createElement('button');
    fab.className = 'floating-action-btn';
    fab.innerHTML = '<i class="fas fa-arrow-up"></i>';
    fab.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        transition: all 0.3s ease;
        z-index: 1000;
        opacity: 0;
        transform: scale(0);
    `;
    
    document.body.appendChild(fab);
    
    // Show/hide based on scroll position
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            fab.style.opacity = '1';
            fab.style.transform = 'scale(1)';
        } else {
            fab.style.opacity = '0';
            fab.style.transform = 'scale(0)';
        }
    });
    
    // Scroll to top functionality
    fab.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Hover effects
    fab.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
        this.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.4)';
    });
    
    fab.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.3)';
    });
}

// Initialize floating action button
initFloatingActionButton();

// Add particle background effect
function initParticleBackground() {
    const canvas = document.createElement('canvas');
    canvas.className = 'particle-background';
    canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
        opacity: 0.3;
    `;
    
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let particles = [];
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 1;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
        
        draw() {
            ctx.fillStyle = '#667eea';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Create particles
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Initialize particle background (optional - can be disabled)
// initParticleBackground();

// Add text reveal animation
function initTextReveal() {
    const textElements = document.querySelectorAll('h1, h2, h3, p');
    
    const textObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'textReveal 0.8s ease forwards';
            }
        });
    }, { threshold: 0.5 });
    
    // Add text reveal animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes textReveal {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    textElements.forEach(element => {
        element.style.opacity = '0';
        textObserver.observe(element);
    });
}

// Initialize text reveal
initTextReveal();

// ===== ADVANCED UI FUNCTIONALITY =====

// Loading Screen
function initLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const progressBar = document.querySelector('.progress-bar');
    
    if (loadingScreen) {
        // Simulate loading progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                // Hide loading screen after a short delay
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 500);
                }, 500);
            }
            
            if (progressBar) {
                progressBar.style.width = progress + '%';
            }
        }, 100);
    }
}

// Cursor Trail Effect
function initCursorTrail() {
    const cursorTrail = document.getElementById('cursorTrail');
    const dots = [];
    const numDots = 12;
    
    if (cursorTrail) {
        // Create trail dots
        for (let i = 0; i < numDots; i++) {
            const dot = document.createElement('div');
            dot.className = 'cursor-dot';
            dot.style.opacity = 1 - (i / numDots);
            dot.style.transform = `scale(${1 - (i / numDots) * 0.5})`;
            cursorTrail.appendChild(dot);
            dots.push(dot);
        }
        
        let mouseX = 0;
        let mouseY = 0;
        let dotX = 0;
        let dotY = 0;
        
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        function animateTrail() {
            dotX += (mouseX - dotX) * 0.1;
            dotY += (mouseY - dotY) * 0.1;
            
            dots.forEach((dot, index) => {
                const x = dotX - (index * 2);
                const y = dotY - (index * 2);
                dot.style.left = x + 'px';
                dot.style.top = y + 'px';
            });
            
            requestAnimationFrame(animateTrail);
        }
        
        animateTrail();
    }
}

// Theme Toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    if (themeToggle) {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            body.classList.add('dark-theme');
            themeToggle.classList.add('dark');
        }
        
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-theme');
            themeToggle.classList.toggle('dark');
            
            // Save theme preference
            const isDark = body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Show toast notification
            showToast('Theme changed to ' + (isDark ? 'dark' : 'light') + ' mode', 'success');
        });
    }
}

// Active Navigation
function initActiveNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    function updateActiveNav() {
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav(); // Initial call
}

// Advanced Form Effects
function initAdvancedFormEffects() {
    const formInputs = document.querySelectorAll('.form-group input, .form-group textarea');
    
    formInputs.forEach(input => {
        // Add floating label effect
        const label = document.createElement('label');
        label.textContent = input.placeholder;
        label.className = 'floating-label';
        input.parentNode.appendChild(label);
        
        // Remove placeholder and add label
        input.placeholder = '';
        
        // Handle focus and blur events
        input.addEventListener('focus', () => {
            label.classList.add('active');
        });
        
        input.addEventListener('blur', () => {
            if (!input.value) {
                label.classList.remove('active');
            }
        });
        
        // Check if input has value on load
        if (input.value) {
            label.classList.add('active');
        }
    });
}

// Toast Notifications
function initToastNotifications() {
    window.showToast = function(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const iconMap = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };
            
            toast.innerHTML = `
                <div class="toast-content">
                    <i class="toast-icon ${iconMap[type] || iconMap.info}"></i>
                    <span class="toast-message">${message}</span>
                    <button class="toast-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            toastContainer.appendChild(toast);
            
            // Show toast
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);
            
            // Auto remove toast
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, duration);
            
            // Close button functionality
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            });
        }
    };
}

// Enhanced Contact Form
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');
            
            // Simple validation
            if (!name || !email || !subject || !message) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showToast('Please enter a valid email address', 'error');
                return;
            }
            
            // Simulate form submission
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            setTimeout(() => {
                showToast('Message sent successfully!', 'success');
                this.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                
                // Reset floating labels
                const labels = this.querySelectorAll('.floating-label');
                labels.forEach(label => label.classList.remove('active'));
            }, 2000);
        });
    }
}

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Enhanced Scroll Progress
function initScrollProgress() {
    const scrollProgress = document.getElementById('scrollProgress');
    const progressCircle = document.querySelector('.progress-circle path:last-child');
    const progressText = document.querySelector('.progress-text');
    
    if (scrollProgress && progressCircle) {
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.body.offsetHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            
            if (scrollPercent > 5) {
                scrollProgress.classList.add('visible');
            } else {
                scrollProgress.classList.remove('visible');
            }
            
            // Update progress circle
            const circumference = 2 * Math.PI * 15.9155; // Based on SVG path
            const offset = circumference - (scrollPercent / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset;
            
            if (progressText) {
                progressText.textContent = Math.round(scrollPercent) + '%';
            }
        });
    }
}

// Enhanced Floating Action Button
function initFloatingActionButton() {
    const fabButton = document.getElementById('fabButton');
    const fabOptions = document.querySelectorAll('.fab-option');
    
    if (fabButton) {
        fabButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    fabOptions.forEach(option => {
        option.addEventListener('click', () => {
            const tooltip = option.getAttribute('data-tooltip');
            
            // Handle different FAB options
            if (tooltip === 'Download CV') {
                downloadCV();
            } else if (tooltip === 'Contact Me') {
                // Scroll to contact section
                const contactSection = document.getElementById('contact');
                if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                }
                showToast('Scrolled to contact section', 'info');
            } else if (tooltip === 'View Projects') {
                // Scroll to portfolio section
                const portfolioSection = document.getElementById('portfolio');
                if (portfolioSection) {
                    portfolioSection.scrollIntoView({ behavior: 'smooth' });
                }
                showToast('Scrolled to portfolio section', 'info');
            } else {
                showToast(tooltip + ' clicked!', 'info');
            }
        });
    });
}

// CV Download Function
function downloadCV() {
    try {
        // Create a link element
        const link = document.createElement('a');
        link.href = 'photos/Rahul Ranjan.pdf';
        link.download = 'Rahul_Ranjan_CV.pdf';
        link.target = '_blank';
        
        // Add link to document
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        
        showToast('CV download started!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Download failed. Please try again.', 'error');
    }
}
