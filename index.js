const MAX_BOOK_PRICE = 200;
const AUTH_USERS_KEY = 'storybloom-users';
const ACTIVE_USER_KEY = 'storybloom-active-user';
const DATABASE_NAME = 'storybloom-database';
const DATABASE_VERSION = 1;
let databasePromise;
const PROTECTED_PAGES = ['create-book.html', 'checkout.html', 'admin.html', 'confirmation.html'];

const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.querySelector('.main-nav');
const navActions = document.querySelector('.nav-actions');
const occasionButtons = document.querySelectorAll('.occasion-card');
const toneButtons = document.querySelectorAll('.chip');
const formatButtons = document.querySelectorAll('.format');
const previewTitle = document.getElementById('preview-title');
const previewPrice = document.getElementById('preview-price');
const recipientSelect = document.getElementById('recipient');
const occasionSelect = document.getElementById('occasion');

const titleMap = {
    Partner: 'Our Love Story',
    Friend: 'The Best of Us',
    Mother: 'A Letter for Mum',
    Father: 'A Tribute to Dad',
    Child: 'Growing Up with You',
    Colleague: 'A Career Full of Wins'
};

const occasionMap = {
    Birthday: 'A Birthday Story to Remember',
    Anniversary: 'Our Love Story',
    Wedding: 'The Story of Us',
    "Valentine's Day": 'My Heart, My Home',
    Graduation: 'A Story of Greatness',
    'Just Because': 'A Little Book of Love'
};

function clampPrice(amount) {
    const numericValue = Number(amount) || MAX_BOOK_PRICE;
    return Math.min(Math.max(numericValue, 0), MAX_BOOK_PRICE);
}

function formatPrice(amount) {
    const safeValue = clampPrice(amount);
    return `GH₵ ${safeValue}`;
}

function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

function openDatabase() {
    if (!databasePromise) {
        databasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;
                database.createObjectStore('users', { keyPath: 'email' });
                const books = database.createObjectStore('books', { keyPath: 'id' });
                books.createIndex('email', 'email', { unique: false });
            };

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const database = request.result;
                let legacyUsers = [];

                try {
                    legacyUsers = JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];
                } catch (error) {
                    legacyUsers = [];
                }

                if (!legacyUsers.length) {
                    resolve(database);
                    return;
                }

                const transaction = database.transaction('users', 'readwrite');
                const userStore = transaction.objectStore('users');
                legacyUsers.forEach((user) => {
                    if (user.email) {
                        userStore.put({...user, email: normalizeEmail(user.email) });
                    }
                });
                transaction.oncomplete = () => {
                    localStorage.removeItem(AUTH_USERS_KEY);
                    resolve(database);
                };
                transaction.onabort = transaction.onerror = () => {
                    database.close();
                    reject(transaction.error || new Error('Could not import saved accounts.'));
                };
            };
        });
    }

    return databasePromise;
}

async function findUserByEmail(email) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = database.transaction('users').objectStore('users').get(normalizeEmail(email));
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

async function addDatabaseRecord(storeName, record) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const request = transaction.objectStore(storeName).add(record);
        transaction.oncomplete = () => resolve();
        transaction.onabort = transaction.onerror = () => reject(transaction.error || request.error);
    });
}

async function saveBookDraft() {
    const readValue = (selector) => {
        const field = document.querySelector(selector);
        return field ? field.value.trim() : '';
    };
    const currentUser = getCurrentUser();
    const selectedValue = (selector, fallback) => {
        const field = document.querySelector(selector);
        return field ? field.value : fallback;
    };

    await addDatabaseRecord('books', {
        id: `book-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        email: currentUser ? normalizeEmail(currentUser.email) : null,
        recipient: selectedValue('input[name="recipient"]:checked', 'Partner'),
        occasion: readValue('#occasion'),
        recipientName: readValue('#recipient-name'),
        relationship: readValue('#relationship'),
        memories: readValue('#memories'),
        special: readValue('#special'),
        photos: Array.from(uploadInput ? uploadInput.files : []).map((file) => ({
            name: file.name,
            type: file.type,
            blob: file
        })),
        style: selectedValue('input[name="style"]:checked', 'Romantic'),
        format: readValue('#book-format'),
        extras: readValue('#extras'),
        status: 'draft',
        createdAt: new Date().toISOString()
    });
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(ACTIVE_USER_KEY));
    } catch (error) {
        return null;
    }
}

function setCurrentUser(user) {
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
}

function logoutUser() {
    localStorage.removeItem(ACTIVE_USER_KEY);
    window.location.href = 'kp.html';
}

function redirectToAuth() {
    const page = window.location.pathname.split('/').pop() || 'kp.html';
    const redirectTarget = page === 'auth.html' ? 'kp.html' : page;
    const search = new URLSearchParams({ redirect: redirectTarget }).toString();
    window.location.href = `auth.html?${search}`;
}

function enforceAuth() {
    const page = window.location.pathname.split('/').pop() || 'kp.html';

    if (page === 'auth.html') {
        if (getCurrentUser()) {
            const redirectTarget = new URLSearchParams(window.location.search).get('redirect') || 'kp.html';
            window.location.href = redirectTarget;
        }
        return;
    }

    if (PROTECTED_PAGES.includes(page) && !getCurrentUser()) {
        redirectToAuth();
    }
}

function applyAuthUI() {
    const user = getCurrentUser();
    const authLinks = Array.from(document.querySelectorAll('a'));
    const signInLink = authLinks.find((link) => link.textContent && link.textContent.toLowerCase().includes('sign in'));

    if (!signInLink) return;

    if (user) {
        signInLink.textContent = 'Sign out';
        signInLink.setAttribute('aria-label', `Sign out ${user.name || 'your account'}`);
        signInLink.href = '#';
        signInLink.addEventListener('click', (event) => {
            event.preventDefault();
            logoutUser();
        });
    } else {
        signInLink.textContent = 'Sign in';
        signInLink.href = 'auth.html';
    }
}

function protectSensitiveLinks() {
    Array.from(document.querySelectorAll('a[href]')).forEach((link) => {
        const fileName = link.getAttribute('href') && link.getAttribute('href').split('?')[0].split('#')[0].split('/').pop();
        if (!fileName || !PROTECTED_PAGES.includes(fileName)) return;

        link.addEventListener('click', (event) => {
            if (!getCurrentUser()) {
                event.preventDefault();
                redirectToAuth();
            }
        });
    });
}

function initializeAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async(event) => {
            event.preventDefault();
            const emailInput = loginForm.querySelector('input[name="login-email"]');
            const passwordInput = loginForm.querySelector('input[name="login-password"]');
            const message = document.getElementById('auth-message');

            if (!emailInput || !passwordInput) return;

            try {
                const user = await findUserByEmail(emailInput.value);

                if (!user || user.password !== passwordInput.value.trim()) {
                    if (message) {
                        message.textContent = 'Invalid email or password.';
                        message.style.display = 'block';
                    }
                    return;
                }

                setCurrentUser({ name: user.name, email: user.email });
                const redirectTarget = new URLSearchParams(window.location.search).get('redirect') || 'kp.html';
                window.location.href = redirectTarget;
            } catch (error) {
                if (message) {
                    message.textContent = 'Unable to access saved accounts. Please try again.';
                    message.style.display = 'block';
                }
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async(event) => {
            event.preventDefault();
            const nameInput = registerForm.querySelector('input[name="register-name"]');
            const emailInput = registerForm.querySelector('input[name="register-email"]');
            const passwordInput = registerForm.querySelector('input[name="register-password"]');
            const message = document.getElementById('auth-message');

            if (!nameInput || !emailInput || !passwordInput) return;

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!name || !email || !password) {
                if (message) {
                    message.textContent = 'Please fill in your name, email, and password.';
                    message.style.display = 'block';
                }
                return;
            }

            const account = { name, email: normalizeEmail(email), password };

            try {
                const existingUser = await findUserByEmail(account.email);
                if (existingUser) {
                    if (message) {
                        message.textContent = 'This email already has an account. Please log in instead.';
                        message.style.display = 'block';
                    }
                    return;
                }

                await addDatabaseRecord('users', account);
                setCurrentUser({ name, email: account.email });
                const redirectTarget = new URLSearchParams(window.location.search).get('redirect') || 'kp.html';
                window.location.href = redirectTarget;
            } catch (error) {
                if (message) {
                    message.textContent = error.name === 'ConstraintError' ?
                        'This email already has an account. Please log in instead.' :
                        'Unable to save your account. Please try again.';
                    message.style.display = 'block';
                }
            }
        });
    }
}

function initializeAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.authTab;
            tabs.forEach((button) => button.classList.toggle('active', button === tab));
            forms.forEach((form) => {
                const isActive = form.dataset.authForm === target;
                form.classList.toggle('active', isActive);
                form.style.display = isActive ? 'grid' : 'none';
            });
        });
    });
}

function updateCheckoutSummary() {
    const totalElement = document.querySelector('.total-row span:last-child');
    if (totalElement) totalElement.textContent = formatPrice(MAX_BOOK_PRICE);

    const subtotalElement = document.querySelectorAll('.order-row strong')[2] || document.querySelector('.order-row strong');
    if (subtotalElement) subtotalElement.textContent = formatPrice(MAX_BOOK_PRICE);

    const deliveryElement = [...document.querySelectorAll('.order-row span')].find((span) => span.textContent && span.textContent.trim() === 'Delivery');
    if (deliveryElement && deliveryElement.nextElementSibling) {
        deliveryElement.nextElementSibling.textContent = formatPrice(0);
    }
}

function setupPriceGuard() {
    const payNowButton = document.getElementById('pay-now-button');
    if (payNowButton) {
        payNowButton.addEventListener('click', (event) => {
            const totalElement = document.querySelector('.total-row span:last-child');
            const totalValue = Number((totalElement && totalElement.textContent).replace(/[^0-9.]/g, '')) || MAX_BOOK_PRICE;

            if (totalValue > MAX_BOOK_PRICE) {
                event.preventDefault();
                if (totalElement) totalElement.textContent = formatPrice(MAX_BOOK_PRICE);
                window.alert('The total amount cannot exceed GH₵ 200.');
                return;
            }

            event.preventDefault();
            window.location.href = 'confirmation.html';
        });
    }
}

function updatePreview() {
    if (!recipientSelect || !occasionSelect || !previewTitle || !previewPrice) return;

    const recipient = recipientSelect.value;
    const occasion = occasionSelect.value;
    const selectedTone = (document.querySelector('.chip.active') || {}).textContent || 'Romantic';
    const selectedFormat = document.querySelector('.format.active');
    const formatPriceValue = clampPrice(selectedFormat ? selectedFormat.dataset.price : MAX_BOOK_PRICE);

    const title = titleMap[recipient] || 'Our Story';
    const subtitle = occasionMap[occasion] || 'A Story to Remember';
    previewTitle.textContent = title;
    previewPrice.textContent = `GHS ${formatPriceValue}`;

    const previewCopy = document.getElementById('preview-copy');
    if (previewCopy) {
        previewCopy.textContent = `${selectedTone} storytelling for ${recipient.toLowerCase()}s, capturing the moments, milestones, and memories that make this celebration truly unforgettable.`;
    }

    document.title = `${subtitle} | StoryBloom`;
}

if (navToggle) {
    navToggle.addEventListener('click', () => {
        mainNav.classList.toggle('mobile-open');
        navActions.classList.toggle('mobile-open');
    });
}

function bindToggleGroup(buttons, updateCallback) {
    buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.classList.contains('active')));
        button.addEventListener('click', () => {
            buttons.forEach((btn) => {
                const isActive = btn === button;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-pressed', String(isActive));
            });
            if (updateCallback) updateCallback();
        });
    });
}

bindToggleGroup(occasionButtons);
bindToggleGroup(toneButtons, updatePreview);
bindToggleGroup(formatButtons, updatePreview);

if (recipientSelect) recipientSelect.addEventListener('change', updatePreview);
if (occasionSelect) occasionSelect.addEventListener('change', updatePreview);

const steps = Array.from(document.querySelectorAll('.form-step'));
const progressFill = document.getElementById('progress-fill');
const stepIndicator = document.getElementById('step-indicator');
const progressLabel = document.getElementById('progress-label');
const nextBtn = document.getElementById('next-step');
const prevBtn = document.getElementById('prev-step');
const summaryRecipient = document.getElementById('summary-recipient');
const summaryOccasion = document.getElementById('summary-occasion');
const summaryStyle = document.getElementById('summary-style');
const summaryFormat = document.getElementById('summary-format');
const uploadInput = document.getElementById('photo-upload');
const fileList = document.getElementById('file-list');
const faqItems = document.querySelectorAll('.faq-item');

let currentStep = 0;
const progressLabels = ['Recipient', 'Story', 'Photos', 'Style'];

function updateWizard() {
    if (!steps.length) return;

    steps.forEach((step, index) => {
        step.classList.toggle('active', index === currentStep);
    });

    const percentage = ((currentStep + 1) / steps.length) * 100;
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (stepIndicator) stepIndicator.textContent = String(currentStep + 1);
    if (progressLabel) progressLabel.textContent = progressLabels[currentStep];

    if (prevBtn) prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.textContent = currentStep === steps.length - 1 ? 'Proceed to checkout' : 'Next';

    const selectedRecipient = (document.querySelector('input[name="recipient"]:checked') || {}).value || 'Partner';
    const selectedOccasion = (document.getElementById('occasion') || {}).value || 'Birthday';
    const selectedStyle = (document.querySelector('input[name="style"]:checked') || {}).value || 'Romantic';
    const selectedFormat = (document.getElementById('book-format') || {}).value || 'Paperback';

    if (summaryRecipient) summaryRecipient.textContent = selectedRecipient;
    if (summaryOccasion) summaryOccasion.textContent = selectedOccasion;
    if (summaryStyle) summaryStyle.textContent = selectedStyle;
    if (summaryFormat) summaryFormat.textContent = selectedFormat;
}

if (nextBtn) {
    nextBtn.addEventListener('click', async() => {
        if (currentStep < steps.length - 1) {
            currentStep += 1;
            updateWizard();
            return;
        }

        nextBtn.disabled = true;
        try {
            await saveBookDraft();
            window.location.href = 'checkout.html';
        } catch (error) {
            window.alert('Your book could not be saved. Please try again.');
            nextBtn.disabled = false;
        }
    });
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep -= 1;
            updateWizard();
        }
    });
}

document.querySelectorAll('input[name="recipient"], input[name="style"]').forEach((input) => {
    input.addEventListener('change', updateWizard);
});

const occasionField = document.getElementById('occasion');
const formatField = document.getElementById('book-format');
if (occasionField) occasionField.addEventListener('change', updateWizard);
if (formatField) formatField.addEventListener('change', updateWizard);

if (uploadInput) {
    uploadInput.addEventListener('change', (event) => {
        const files = Array.from(event.target.files || []);
        if (fileList) fileList.innerHTML = '';
        files.forEach((file) => {
            const item = document.createElement('li');
            item.textContent = file.name;
            if (fileList) fileList.appendChild(item);
        });
    });
}

if (faqItems.length) {
    faqItems.forEach((item) => {
        const button = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        if (!button || !answer) return;

        button.addEventListener('click', () => {
            const isOpen = item.classList.contains('active');

            faqItems.forEach((faq) => {
                faq.classList.remove('active');
                const faqAnswer = faq.querySelector('.faq-answer');
                if (faqAnswer) faqAnswer.style.maxHeight = null;
            });

            if (!isOpen) {
                item.classList.add('active');
                answer.style.maxHeight = `${answer.scrollHeight}px`;
            }
        });
    });
}

enforceAuth();
applyAuthUI();
protectSensitiveLinks();
initializeAuthForms();
initializeAuthTabs();
setupPriceGuard();
updateCheckoutSummary();
updatePreview();
updateWizard();

const firstFaq = document.querySelector('.faq-item');
if (firstFaq) {
    const firstAnswer = firstFaq.querySelector('.faq-answer');
    if (firstAnswer) firstAnswer.style.maxHeight = `${firstAnswer.scrollHeight}px`;
}