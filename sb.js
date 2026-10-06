const MAX_BOOK_PRICE = 200;
const PROTECTED_PAGES = new Set(['create-book.html', 'checkout.html', 'admin.html', 'confirmation.html']);
const REDIRECT_PAGES = new Set(['index.html', ...PROTECTED_PAGES]);
const DEMO_USER_KEY = 'storybloom-demo-user';
const DEMO_BOOKS_KEY = 'storybloom-demo-books';

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

let currentUser = null;

const titleMap = {
    Partner: 'Our Love Story',
    Friend: 'The Best of Us',
    Mum: 'A Letter for Mum',
    Dad: 'A Tribute to Dad',
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

function getPageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
}

function safeRedirectTarget() {
    const requested = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
    return REDIRECT_PAGES.has(requested) ? requested : 'index.html';
}

function showMessage(message, type = 'error', elementId = 'auth-message') {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = message;
    element.dataset.type = type;
    element.hidden = false;
}

function clearMessage(elementId = 'auth-message') {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = '';
    element.hidden = true;
}

function getDemoUser() {
    try {
        return JSON.parse(localStorage.getItem(DEMO_USER_KEY)) || null;
    } catch (error) {
        console.error('Could not read the demo sign-in state.', error);
        return null;
    }
}

function setDemoUser(user) {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
    currentUser = user;
}

function redirectToAuth() {
    const requestedPage = getPageName();
    const redirect = PROTECTED_PAGES.has(requestedPage) ? requestedPage : 'index.html';
    window.location.replace(`auth.html?${new URLSearchParams({ redirect })}`);
}

function formatPrice(amount) {
    return `GH₵ ${Math.min(Math.max(Number(amount) || MAX_BOOK_PRICE, 0), MAX_BOOK_PRICE)}`;
}

function bindToggleGroup(buttons, updateCallback) {
    buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.classList.contains('active')));
        button.addEventListener('click', () => {
            buttons.forEach((item) => {
                const isActive = item === button;
                item.classList.toggle('active', isActive);
                item.setAttribute('aria-pressed', String(isActive));
            });
            if (updateCallback) updateCallback();
        });
    });
}

function updatePreview() {
    if (!recipientSelect || !occasionSelect || !previewTitle || !previewPrice) return;

    const recipient = recipientSelect.value;
    const occasion = occasionSelect.value;
    const tone = document.querySelector('.chip.active')?.textContent || 'Romantic';
    const selectedFormat = document.querySelector('.format.active');
    const price = Math.min(Number(selectedFormat?.dataset.price) || MAX_BOOK_PRICE, MAX_BOOK_PRICE);
    const previewCopy = document.getElementById('preview-copy');

    previewTitle.textContent = titleMap[recipient] || 'Our Story';
    previewPrice.textContent = formatPrice(price);
    if (previewCopy) {
        previewCopy.textContent = `${tone} storytelling for ${recipient.toLowerCase()}s, capturing the moments, milestones, and memories that make this celebration truly unforgettable.`;
    }
    document.title = `${occasionMap[occasion] || 'A Story to Remember'} | StoryBloom`;
}

function updateWizard(stepIndex) {
    const steps = Array.from(document.querySelectorAll('.form-step'));
    if (!steps.length) return;

    const progressLabels = ['Recipient', 'Story', 'Photos', 'Style'];
    let currentStep = stepIndex ?? Number(document.getElementById('step-indicator')?.textContent || 1) - 1;
    currentStep = Math.max(0, Math.min(currentStep, steps.length - 1));

    steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));

    const progressFill = document.getElementById('progress-fill');
    const stepIndicator = document.getElementById('step-indicator');
    const progressLabel = document.getElementById('progress-label');
    const prevButton = document.getElementById('prev-step');
    const nextButton = document.getElementById('next-step');

    if (progressFill) progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    if (stepIndicator) stepIndicator.textContent = String(currentStep + 1);
    if (progressLabel) progressLabel.textContent = progressLabels[currentStep] || 'Style';
    if (prevButton) prevButton.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    if (nextButton) nextButton.textContent = currentStep === steps.length - 1 ? 'Create book' : 'Next';

    const values = {
        'summary-recipient': document.querySelector('input[name="recipient"]:checked')?.value || 'Partner',
        'summary-occasion': document.getElementById('occasion')?.value || 'Birthday',
        'summary-style': document.querySelector('input[name="style"]:checked')?.value || 'Romantic',
        'summary-format': document.getElementById('book-format')?.value || 'Paperback'
    };
    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

function saveBookDraft() {
    if (!currentUser) {
        redirectToAuth();
        throw new Error('Please sign in before creating a book.');
    }

    const photoNames = Array.from(document.getElementById('photo-upload')?.files || []).map((file) => file.name);
    const book = {
        id: crypto.randomUUID(),
        email: currentUser.email,
        recipient: document.querySelector('input[name="recipient"]:checked')?.value || 'Partner',
        occasion: document.getElementById('occasion')?.value || 'Anniversary',
        recipientName: document.getElementById('recipient-name')?.value.trim() || '',
        relationship: document.getElementById('relationship')?.value.trim() || '',
        memories: document.getElementById('memories')?.value.trim() || '',
        special: document.getElementById('special')?.value.trim() || '',
        style: document.querySelector('input[name="style"]:checked')?.value || 'Romantic',
        format: document.getElementById('book-format')?.value || 'Paperback',
        extras: document.getElementById('extras')?.value || 'None',
        photoNames
    };
    let books = [];
    try {
        books = JSON.parse(localStorage.getItem(DEMO_BOOKS_KEY)) || [];
    } catch (error) {
        console.error('Could not read saved demo book drafts.', error);
        throw new Error('Could not read saved demo drafts in this browser.');
    }
    books.push(book);
    localStorage.setItem(DEMO_BOOKS_KEY, JSON.stringify(books));
    return book.id;
}

function initializeAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.authTab;
            tabs.forEach((button) => {
                const active = button === tab;
                button.classList.toggle('active', active);
                button.setAttribute('aria-selected', String(active));
            });
            forms.forEach((form) => {
                const active = form.dataset.authForm === target;
                form.classList.toggle('active', active);
                form.hidden = !active;
            });
            clearMessage();
        });
    });
}

function initializeAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            clearMessage();
            const email = loginForm.elements['login-email'].value.trim().toLowerCase();
            if (!email) {
                showMessage('Enter an email address to continue.');
                return;
            }
            setDemoUser({ name: email.split('@')[0], email });
            window.location.replace(safeRedirectTarget());
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            clearMessage();
            const name = registerForm.elements['register-name'].value.trim();
            const email = registerForm.elements['register-email'].value.trim().toLowerCase();
            if (!name || !email) {
                showMessage('Enter your name and email address to continue.');
                return;
            }
            setDemoUser({ name, email });
            window.location.replace(safeRedirectTarget());
        });
    }
}

function updateAuthLinks() {
    document.querySelectorAll('[data-auth-link]').forEach((link) => {
        if (!currentUser) {
            link.textContent = 'Sign in';
            link.href = 'auth.html';
            return;
        }
        link.textContent = 'Sign out';
        link.href = '#sign-out';
        link.setAttribute('aria-label', `Sign out ${currentUser.name || currentUser.email || 'of your account'}`);
    });
}

document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('[data-auth-link]') : null;
    if (!link || !currentUser) return;
    event.preventDefault();
    localStorage.removeItem(DEMO_USER_KEY);
    currentUser = null;
    window.location.replace('index.html');
});

function initializeAuth() {
    const page = getPageName();
    currentUser = getDemoUser();

    if (page === 'auth.html' && currentUser) {
        window.location.replace(safeRedirectTarget());
        return;
    }
    if (PROTECTED_PAGES.has(page) && !currentUser) {
        redirectToAuth();
        return;
    }

    updateAuthLinks();
    if (page === 'checkout.html') {
        loadCheckoutDraft(currentUser);
    }
}

function initializeBookWizard() {
    const steps = Array.from(document.querySelectorAll('.form-step'));
    let currentStep = 0;
    const nextButton = document.getElementById('next-step');
    const prevButton = document.getElementById('prev-step');

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                currentStep += 1;
                updateWizard(currentStep);
                return;
            }

            clearMessage('book-message');
            nextButton.disabled = true;
            try {
                const bookId = saveBookDraft();
                window.location.href = `checkout.html?book=${encodeURIComponent(bookId)}`;
            } catch (error) {
                showMessage(error.message || 'Your book could not be saved. Please try again.', 'error', 'book-message');
                nextButton.disabled = false;
            }
        });
    }

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep -= 1;
                updateWizard(currentStep);
            }
        });
    }

    document.querySelectorAll('input[name="recipient"], input[name="style"], #occasion, #book-format')
        .forEach((field) => field.addEventListener('change', () => updateWizard()));

    const uploadInput = document.getElementById('photo-upload');
    const fileList = document.getElementById('file-list');
    if (uploadInput) {
        uploadInput.addEventListener('change', () => {
            if (fileList) fileList.replaceChildren();
            const files = Array.from(uploadInput.files || []);
            files.forEach((file) => {
                const item = document.createElement('li');
                item.textContent = file.name;
                fileList?.appendChild(item);
            });
            clearMessage('book-message');
        });
    }

    updateWizard(currentStep);
}

function initializeFaq() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach((item) => {
        const button = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        if (!button || !answer) return;

        button.addEventListener('click', () => {
            const opening = !item.classList.contains('active');
            faqItems.forEach((faq) => {
                faq.classList.remove('active');
                const faqAnswer = faq.querySelector('.faq-answer');
                if (faqAnswer) faqAnswer.style.maxHeight = null;
            });
            if (opening) {
                item.classList.add('active');
                answer.style.maxHeight = `${answer.scrollHeight}px`;
            }
        });
    });

    const firstFaq = document.querySelector('.faq-item');
    const firstAnswer = firstFaq?.querySelector('.faq-answer');
    if (firstAnswer) firstAnswer.style.maxHeight = `${firstAnswer.scrollHeight}px`;
}

function initializeCheckout() {
    const payButton = document.getElementById('pay-now-button');
    if (!payButton) return;
    payButton.addEventListener('click', (event) => {
        event.preventDefault();
        showMessage('Online payment is not enabled yet. Please contact StoryBloom to complete your order.', 'error', 'checkout-message');
    });
}

function loadCheckoutDraft(user) {
    const bookId = new URLSearchParams(window.location.search).get('book');
    if (!bookId) {
        showMessage('Save a book draft before continuing to checkout.', 'info', 'checkout-message');
        return;
    }

    let books = [];
    try {
        books = JSON.parse(localStorage.getItem(DEMO_BOOKS_KEY)) || [];
    } catch (error) {
        console.error('Could not read saved demo book drafts.', error);
        showMessage('Could not load your saved demo drafts.', 'error', 'checkout-message');
        return;
    }
    const book = books.find((item) => item.id === bookId && item.email === user.email);
    if (!book) {
        showMessage('That book draft could not be found in your account. Return to the builder and try again.', 'error', 'checkout-message');
        return;
    }

    const bookTitle = document.getElementById('checkout-book-title');
    const format = document.getElementById('checkout-book-format');
    const extras = document.getElementById('checkout-book-extras');
    const customerName = document.getElementById('full-name');
    const customerEmail = document.getElementById('email');
    if (bookTitle) {
        const title = titleMap[book.recipient] || book.recipient;
        bookTitle.textContent = `${book.recipientName || title} · ${book.occasion}`;
    }
    if (format) format.textContent = book.format;
    if (extras) extras.textContent = book.extras;
    if (customerName) customerName.value = user.name || '';
    if (customerEmail) customerEmail.value = user.email || '';
}

if (navToggle && mainNav && navActions) {
    navToggle.addEventListener('click', () => {
        const isOpen = navToggle.getAttribute('aria-expanded') !== 'true';
        navToggle.setAttribute('aria-expanded', String(isOpen));
        mainNav.classList.toggle('mobile-open', isOpen);
        navActions.classList.toggle('mobile-open', isOpen);
    });
}

bindToggleGroup(occasionButtons);
bindToggleGroup(toneButtons, updatePreview);
bindToggleGroup(formatButtons, updatePreview);
recipientSelect?.addEventListener('change', updatePreview);
occasionSelect?.addEventListener('change', updatePreview);

initializeAuthTabs();
initializeAuthForms();
initializeBookWizard();
initializeFaq();
initializeCheckout();
updatePreview();
initializeAuth();
