const BACKEND_API_URL = 'https://restaurantmgtsys.onrender.com/api';
const POLLING_INTERVAL = 5000; // 10 seconds for polling (adjust as needed)

// --- In-memory state ---
let currentOrder = [];
let allMenuItems = []; // To store fetched menu items for order dropdowns
let allIngredients = []; // To store fetched ingredients for recipe dropdown
let currentRecipe = []; // In-memory array for the recipe being built for a menu item

// Notification related state
let lastKitchenOrderCount = 0;
let lastWaiterOrderStatuses = new Map(); // Map to store {orderId: status} for waiter notifications
let kitchenPollingIntervalId = null;
let waiterPollingIntervalId = null;

// User role state
let currentUserRole = null;

// Tone.js Synth for notifications
const synth = new Tone.Synth().toDestination();

// --- Helper Functions ---

/**
 * Displays a custom message box.
 * @param {string} message - The message to display.
 */
function showMessageBox(message) {
    messageText.textContent = message;
    messageBox.classList.remove('hidden');
    // For notifications, also trigger sound
    playNotificationSound();
}

/**
 * Plays a loud notification sound using Tone.js.
 */
async function playNotificationSound() {
    // Ensure audio context is active, especially on first interaction
    await Tone.start();
    // Play a loud C4 note for a short duration
    synth.triggerAttackRelease("C4", "8n");
}

// Event listener for the OK button in the message box
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const messageOkBtn = document.getElementById('message-ok-btn');

messageOkBtn.addEventListener('click', () => {
    messageBox.classList.add('hidden');
});

/**
 * Helper to get today's date in YYYY-MM-DD format.
 * @returns {string} Current date in YYYY-MM-DD format.
 */
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Helper to format a Date object to YYYY-MM-DD string.
 * @param {Date} dateObj - The Date object to format.
 * @returns {string} Formatted date string.
 */
const formatDateForInput = (dateObj) => {
    if (!dateObj) return '';
    const date = new Date(dateObj);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Handles API fetch requests.
 * @param {string} url - The API endpoint URL.
 * @param {object} options - Fetch options (method, headers, body).
 * @returns {Promise<object>} The JSON response data.
 * @throws {Error} If the network request fails or the server returns an error.
 */
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        showMessageBox(`Error: ${error.message}`);
        throw error; // Re-throw to allow calling function to handle
    }
}

// --- DOM Elements ---
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const currentSectionTitle = document.getElementById('current-section-title');

// Mobile menu elements
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// Order Management Elements
const orderMenuItemSelect = document.getElementById('order-menu-item');
const orderQuantityInput = document.getElementById('order-quantity');
const addToOrderBtn = document.getElementById('add-to-order-btn');
const currentOrderList = document.getElementById('current-order-list');
const currentOrderTotalSpan = document.getElementById('current-order-total');
const placeOrderBtn = document.getElementById('place-order-btn');

// Kitchen Management Elements
const kitchenOrdersTableBody = document.getElementById('kitchen-orders-table-body');
const kitchenStartDateInput = document.getElementById('kitchen-start-date');
const kitchenEndDateInput = document.getElementById('kitchen-end-date');
const filterKitchenBtn = document.getElementById('filter-kitchen-btn');

// Sales Elements
const salesTransactionsTableBody = document.getElementById('sales-transactions-table-body');
const salesStartDateInput = document.getElementById('sales-start-date');
const salesEndDateInput = document.getElementById('sales-end-date');
const filterSalesBtn = document.getElementById('filter-sales-btn');

// Inventory Management Elements
const ingredientNameInput = document.getElementById('ingredient-name');
const ingredientQuantityInput = document.getElementById('ingredient-quantity');
const ingredientUnitInput = document.getElementById('ingredient-unit');
const ingredientCostPerUnitInput = document.getElementById('ingredient-cost-per-unit');
const ingredientSpoilageInput = document.getElementById('ingredient-spoilage');
const inventoryItemsTableBody = document.getElementById('inventory-items-table-body');
const cancelIngredientEditBtn = document.getElementById('cancel-ingredient-edit-btn');
const inventoryStartDateInput = document.getElementById('inventory-start-date');
const inventoryEndDateInput = document.getElementById('inventory-end-date');
const filterInventoryBtn = document.getElementById('filter-inventory-btn');


// Expenses Management Elements
const expenseForm = document.getElementById('expense-form');
const expenseIdInput = document.getElementById('expense-id');
const expenseDateInput = document.getElementById('expense-date');
const expenseCategoryInput = document.getElementById('expense-category');
const expenseDescriptionInput = document.getElementById('expense-description');
const expenseAmountInput = document.getElementById('expense-amount');
const expensesTableBody = document.getElementById('expenses-table-body');
const cancelExpenseEditBtn = document.getElementById('cancel-expense-edit-btn');
const expenseStartDateInput = document.getElementById('expense-start-date');
const expenseEndDateInput = document.getElementById('expense-end-date');
const filterExpensesBtn = document.getElementById('filter-expenses-btn');


// Reports Elements
const reportStartDateInput = document.getElementById('report-start-date');
const reportEndDateInput = document.getElementById('report-end-date');
const generateReportBtn = document.getElementById('generate-report-btn');
const reportTotalSalesSpan = document.getElementById('report-total-sales');
const reportTotalExpensesSpan = document.getElementById('report-total-expenses');
const reportNetBalanceSpan = document.getElementById('report-net-balance');
const reportSalesTableBody = document.getElementById('report-sales-table-body');
const reportExpensesTableBody = document.getElementById('report-expenses-table-body');


// Menu Management Elements
const menuForm = document.getElementById('menu-form');
const menuItemIdInput = document.getElementById('menu-item-id');
const itemNameInput = document.getElementById('item-name');
const itemPriceInput = document.getElementById('item-price');
const itemCategoryInput = document.getElementById('item-category');
const menuItemsTableBody = document.getElementById('menu-items-table-body');
const cancelMenuEditBtn = document.getElementById('cancel-menu-edit-btn');

// Recipe Management Elements
const recipeIngredientSelect = document.getElementById('recipe-ingredient-select');
const recipeQuantityUsedInput = document.getElementById('recipe-quantity-used');
const addRecipeIngredientBtn = document.getElementById('add-recipe-ingredient-btn');
const currentRecipeList = document.getElementById('current-recipe-list');

// Login elements
const loginForm = document.getElementById('login-form');
const loginPage = document.getElementById('login-page');
const mainAppContainer = document.getElementById('main-app-container');
const errorMessage = document.getElementById('error-message');
const logoutButton = document.getElementById('logout-btn');


/**
 * Function to check if the user is authorized for a given role.
 * @param {string[]} allowedRoles - An array of roles that can access the section.
 * @returns {boolean} True if the current user role is in the allowed roles.
 */
const allowedRoles = {
    'order-management': ['admin', 'waiter'],
    'kitchen': ['admin', 'waiter'],
    'sales': ['admin'],
    'inventory-management': ['admin'],
    'expenses': ['admin'],
    'reports': ['admin'],
    'menu-management': ['admin', 'waiter'],
    'auditlogs': ['admin']
};

function checkUserRole(requiredRoles) {
    if (!currentUserRole || !requiredRoles) {
        return false;
    }
    return requiredRoles.includes(currentUserRole);
}

/**
 * Hides all content sections.
 */
function hideAllSections() {
    contentSections.forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
    });
}

/**
 * Stops all active polling intervals.
 */
function stopAllPolling() {
    if (kitchenPollingIntervalId) {
        clearInterval(kitchenPollingIntervalId);
        kitchenPollingIntervalId = null;
    }
    if (waiterPollingIntervalId) {
        clearInterval(waiterPollingIntervalId);
        waiterPollingIntervalId = null;
    }
}

/**
 * Shows a specific content section and updates the title.
 * @param {string} sectionId - The ID of the section to show.
 */

async function initializeApp(userRole) {
    currentUserRole = userRole;

    // Hide navigation links the user doesn't have access to
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        const sectionId = link.dataset.section;
        // Pass the allowed roles for the specific section
        if (!checkUserRole(allowedRoles[sectionId])) {
            link.classList.add('hidden');
        } else {
            link.classList.remove('hidden');
        }
    });

    // ... (rest of initializeApp function)
}
async function initializeApp(userRole) {
    currentUserRole = userRole;

    // Hide navigation links the user doesn't have access to
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        const sectionId = link.dataset.section;
        // Pass the allowed roles for the specific section
        if (!checkUserRole(allowedRoles[sectionId])) {
            link.classList.add('hidden');
        } else {
            link.classList.remove('hidden');
        }
    });

    // ... (rest of initializeApp function)
}

async function showSection(sectionId) {

    if (!checkUserRole(allowedRoles[sectionId])) {
        showMessageBox('You do not have permission to access this section.');
        return;
    }
    // Define role-based access for each section
    const sectionRoles = {
        'order-management': ['admin', 'waiter'],
        'kitchen': ['admin', 'waiter'], // Waiter needs to see kitchen to track orders, but chef works here
        'sales': ['admin'],
        'inventory-management': ['admin'],
        'expenses': ['admin'],
        'reports': ['admin'],
        'menu-management': ['admin', 'waiter'],// Waiter can see the menu
        'auditlogs': ['admin']

    };

    if (!checkUserRole(sectionRoles[sectionId])) {
        showMessageBox('You do not have permission to access this section.');
        // Redirect to a safe section, like order-management for waiter, or just the main page.
        // For simplicity, we'll just not switch the section.
        return;
    }

    hideAllSections();
    stopAllPolling(); // Stop all polling when switching sections

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');
        currentSectionTitle.textContent = targetSection.querySelector('h2') ? targetSection.querySelector('h2').textContent : sectionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    // Special handling for sections that need data refresh and activate polling
    if (sectionId === 'order-management') {
        await renderOrderForm();
        renderCurrentOrder(); // Render the in-memory current order
        // Start polling for waiter notifications (orders ready)
        await checkOrderReadyForWaiter(); // Initial check
        waiterPollingIntervalId = setInterval(checkOrderReadyForWaiter, POLLING_INTERVAL);
    } else if (sectionId === 'kitchen') {
        await renderKitchenOrders();
        // Start polling for chef notifications (new orders)
        await checkNewOrdersForChef(); // Initial check
        kitchenPollingIntervalId = setInterval(checkNewOrdersForChef, POLLING_INTERVAL);
        messageBox.classList.add('hidden');
    } else if (sectionId === 'sales') {
        await renderSalesTransactions();
        messageBox.classList.add('hidden');
    } else if (sectionId === 'inventory-management') {
        await renderInventoryItems();
        messageBox.classList.add('hidden');
    } else if (sectionId === 'expenses') {
        await renderExpenses();
        messageBox.classList.add('hidden');
    } else if (sectionId === 'reports') {
        // Reports are generated on button click, but we can set default dates
        if (!reportStartDateInput.value || !reportEndDateInput.value) {
            reportEndDateInput.value = getTodayDate();
            reportStartDateInput.value = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]; // 30 days ago
        }
        await generateReports(); // Automatically generate on load
    } else if (sectionId === 'menu-management') {
        await renderMenuItems();
        await populateRecipeIngredientSelect(); // Populate ingredients for recipe builder
        renderCurrentRecipe(); // Render the current menu item's recipe (if editing)
        messageBox.classList.add('hidden');
    } else if (sectionId === 'auditlogs') {
        renderAuditLogs();
        messageBox.classList.add('hidden');
    }

    // Hide sidebar on mobile after navigation
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
}

/**
 * Handles navigation link clicks.
 * @param {Event} event - The click event.
 */

navLinks.forEach(link => {
    link.addEventListener('click', handleNavLinkClick);
});
async function handleNavLinkClick(event) {
    event.preventDefault();
    const targetElement = event.currentTarget;

    if (!targetElement || !(targetElement instanceof HTMLElement)) {
        console.error("Clicked element is not a valid HTML element:", targetElement);
        return;
    }

    const sectionId = targetElement.dataset.section;
    if (sectionId) {
        // Check permissions before showing the section
        if (checkUserRole(allowedRoles[sectionId])) {
            await showSection(sectionId);
            // ... (rest of handleNavLinkClick function)
        } else {
            showMessageBox('You do not have permission to access this section.');
        }
    }
}

// --- Mobile Menu Toggle Logic ---
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});


// --- User Authentication and Session Management ---

/**
 * Initializes the main application based on the user's role.
 * This function handles all the post-login setup.
 */
async function initializeApp(userRole) {
    currentUserRole = userRole;

    // Hide navigation links the user doesn't have access to
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        const sectionId = link.dataset.section;
        const allowedRoles = {
            'order-management': ['admin', 'waiter'],
            'kitchen': ['admin', 'waiter'],
            'sales': ['admin'],
            'inventory-management': ['admin'],
            'expenses': ['admin'],
            'reports': ['admin'],
            'menu-management': ['admin', 'waiter'],
            'auditlogs': ['admin']
        };

        if (!checkUserRole(allowedRoles[sectionId])) {
            link.classList.add('hidden');
        } else {
            link.classList.remove('hidden');
        }
    });

    loginPage.classList.add('hidden');
    mainAppContainer.classList.remove('hidden');
    errorMessage.classList.add('hidden');

    // Set default dates for date inputs
    const today = getTodayDate();
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    kitchenStartDateInput.value = thirtyDaysAgo;
    kitchenEndDateInput.value = today;
    salesStartDateInput.value = thirtyDaysAgo;
    salesEndDateInput.value = today;
    inventoryStartDateInput.value = thirtyDaysAgo;
    inventoryEndDateInput.value = today;
    expenseStartDateInput.value = thirtyDaysAgo;
    expenseEndDateInput.value = today;
    reportStartDateInput.value = thirtyDaysAgo;
    reportEndDateInput.value = today;

    // Load initial data for all sections the user can see
    await renderOrderForm();
    renderCurrentOrder();
    await renderKitchenOrders();
    await renderSalesTransactions();
    await renderInventoryItems();
    await renderExpenses();
    await generateReports();
    await populateRecipeIngredientSelect();

    // Initial population of lastWaiterOrderStatuses for accurate change detection
    try {
        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        orders.forEach(order => {
            lastWaiterOrderStatuses.set(order._id, order.status);
        });
    } catch (error) {
        console.error("Failed to initialize waiter order statuses:", error);
    }

    // Show a default section based on role
    if (currentUserRole === 'waiter') {
        await showSection('order-management');
        document.querySelector('.nav-link[data-section="order-management"]').classList.add('active');
    } else if (currentUserRole === 'admin') {
        await showSection('order-management');
        document.querySelector('.nav-link[data-section="order-management"]').classList.add('active');
    }
}

/**
 * Handles user login and role-based access.
 */
loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();

    // Define user credentials and roles
    const users = {
        'Ronald': { password: '123', role: 'admin' },
        'Martha': { password: '123', role: 'waiter' }
    };

    if (users[usernameInput] && users[usernameInput].password === passwordInput) {
        // Correct credentials, set role and store in session
        const role = users[usernameInput].role;
        sessionStorage.setItem('userRole', role);

        // Call the new initialization function
        await initializeApp(role);

    } else {
        // Incorrect credentials
        errorMessage.classList.remove('hidden');
    }
});

/**
 * Handles user logout.
 */
logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('userRole');
    currentUserRole = null;
    stopAllPolling();
    mainAppContainer.classList.add('hidden');
    loginPage.classList.remove('hidden');
    loginForm.reset();
    document.getElementById('username').focus();
});


// --- Order Management Functions ---

/**
 * Populates the menu item select dropdown.
 */
async function renderOrderForm() {
    orderMenuItemSelect.innerHTML = '<option value="">-- Select an Item --</option>';
    try {
        allMenuItems = await fetchData(`${BACKEND_API_URL}/menu`); // Fetch all menu items
        allMenuItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item._id; // Use MongoDB _id
            option.textContent = `${item.name} ( Ugshs${item.price.toFixed(2)})`;
            orderMenuItemSelect.appendChild(option);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Renders the items currently added to the order (in-memory).
 */
function renderCurrentOrder() {
    currentOrderList.innerHTML = '';
    let total = 0;
    if (currentOrder.length === 0) {
        currentOrderList.innerHTML = `<li class="order-list-item">No items in current order.</li>`;
    } else {
        currentOrder.forEach((orderItem, index) => {
            const menuItem = allMenuItems.find(item => item._id === orderItem.menuItemId); // Find from fetched items
            if (menuItem) {
                const listItem = document.createElement('li');
                listItem.classList.add('order-list-item');
                listItem.innerHTML = `
                    <span>${menuItem.name} x ${orderItem.quantity}</span>
                    <span>ugshs${(menuItem.price * orderItem.quantity).toFixed(2)}</span>
                    <button onclick="removeOrderItem(${index})">&times;</button>
                `;
                currentOrderList.appendChild(listItem);
                total += menuItem.price * orderItem.quantity;
            }
        });
    }
    currentOrderTotalSpan.textContent = total.toFixed(2);
}

/**
 * Adds a selected menu item to the current order (in-memory).
 */
addToOrderBtn.addEventListener('click', () => {
    const selectedItemId = orderMenuItemSelect.value;
    const quantity = parseInt(orderQuantityInput.value);

    if (!selectedItemId || isNaN(quantity) || quantity <= 0) {
        showMessageBox('Please select a menu item and enter a valid quantity.');
        return;
    }

    const existingItemIndex = currentOrder.findIndex(item => item.menuItemId === selectedItemId);
    if (existingItemIndex > -1) {
        currentOrder[existingItemIndex].quantity += quantity;
    } else {
        currentOrder.push({ menuItemId: selectedItemId, quantity: quantity });
    }

    renderCurrentOrder();
    orderMenuItemSelect.value = ''; // Reset select
    orderQuantityInput.value = '1'; // Reset quantity
});

/**
 * Removes an item from the current order (in-memory).
 * @param {number} index - The index of the item to remove.
 */
window.removeOrderItem = (index) => {
    currentOrder.splice(index, 1);
    renderCurrentOrder();
};

/**
 * Places the current order, sending it to the backend kitchen orders.
 */
placeOrderBtn.addEventListener('click', async () => {
    if (currentOrder.length === 0) {
        showMessageBox('Please add items to the order before placing it.');
        return;
    }

    let totalOrderAmount = 0;
    currentOrder.forEach(item => {
        const menuItem = allMenuItems.find(m => m._id === item.menuItemId);
        if (menuItem) {
            totalOrderAmount += menuItem.price * item.quantity;
        }
    });

    try {
        const newOrder = await fetchData(`${BACKEND_API_URL}/kitchen-orders`, {
            method: 'POST',
            body: JSON.stringify({
                items: currentOrder, // Send menuItemId and quantity
                totalAmount: totalOrderAmount
            })
        });
        showMessageBox(`Order ${newOrder._id} placed successfully! It has been sent to the kitchen.`);
        currentOrder = []; // Clear current order
        renderCurrentOrder();
        // No need to manually trigger chef notification here, as the polling will pick it up.
    } catch (error) {
        // Error handled by fetchData
    }
});


// --- Kitchen Management Functions ---

/**
 * Renders kitchen orders in the table by fetching from backend.
 */
async function renderKitchenOrders() {
    kitchenOrdersTableBody.innerHTML = ''; // Clear existing rows
    const startDate = kitchenStartDateInput.value;
    const endDate = kitchenEndDateInput.value;
    let url = `${BACKEND_API_URL}/kitchen-orders`;
    if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
    } else if (startDate) {
        url += `?startDate=${startDate}`;
    } else if (endDate) {
        url += `?endDate=${endDate}`;
    }

    try {
        const orders = await fetchData(url);

        if (orders.length === 0) {
            kitchenOrdersTableBody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No kitchen orders found for this period.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const itemsList = order.items.map(item => {
                // Backend populates menuItem, so we can access its name
                return `${item.menuItem ? item.menuItem.name : 'Unknown Item'} x ${item.quantity}`;
            }).join(', ');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${order._id}</td>
                <td class="text-gray">${formatDateForInput(order.date)}</td>
                <td class="text-gray">${itemsList}</td>
                <td class="text-gray">Ugshs${order.totalAmount.toFixed(2)}</td>
                <td>
                    <span class="status-badge ${order.status.toLowerCase()}">
                        ${order.status}
                    </span>
                </td>
                <td class="table-actions">
                    ${(order.status === 'New' || order.status === 'Preparing') && checkUserRole(['admin']) ?
                        `<button onclick="markOrderReady('${order._id}')" class="edit">Mark Ready</button>` :
                        `<button class="edit" disabled>Mark Ready</button>`
                    }
                    ${order.status !== 'Cancelled' && checkUserRole(['admin']) ?
                        `<button onclick="cancelKitchenOrder('${order._id}')" class="delete">Cancel</button>` :
                        `<button class="delete" disabled>Cancelled</button>`
                    }
                </td>
            `;
            kitchenOrdersTableBody.appendChild(row);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}


/**
 * Checks for new orders for the chef notification.
 */
async function checkNewOrdersForChef() {
    try {
        // Only run for admin/chef
        if (currentUserRole !== 'admin') {
            return;
        }

        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        const newOrderCount = orders.filter(order => order.status === 'New').length;

        // Check if there's an increase in the number of new orders
        // The condition `lastKitchenOrderCount !== newOrderCount` is more robust
        // It covers the initial case (0 to 1) and any subsequent new orders
        if (newOrderCount > lastKitchenOrderCount) {
            // Only show a message if there are new orders to notify about
            const ordersToNotify = newOrderCount - lastKitchenOrderCount;
            if (ordersToNotify > 0) {
                showMessageBox(`New Order Alert! You have ${ordersToNotify} new order(s) to prepare.`);
            }
        }
        
        // Always update the last count, regardless of whether a notification was shown
        lastKitchenOrderCount = newOrderCount;

    } catch (error) {
        console.error("Error checking for new orders:", error);
    }
}

/**
 * Marks a kitchen order as ready via backend API.
 * @param {string} orderId - The ID of the order to mark ready.
 */
window.markOrderReady = async (orderId) => {
    // Permission check
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }

    try {
        const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/ready`, {
            method: 'PUT'
        });
        showMessageBox(response.message);
        await renderKitchenOrders(); // Refresh kitchen orders
        await renderInventoryItems(); // Inventory changes
        await renderSalesTransactions(); // Sales changes
        await generateReports(); // Reports might change
        // No need to manually trigger waiter notification here, as the polling will pick it up.
    } catch (error) {
        // Error handled by fetchData
        if (error.message.includes('insufficient inventory')) {
            // Specific handling for inventory errors if needed
        }
    }
};

/**
 * Cancels a kitchen order via backend API.
 * @param {string} orderId - The ID of the order to cancel.
 */
window.cancelKitchenOrder = async (orderId) => {
    // Permission check
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/cancel`, {
            method: 'PUT'
        });
        showMessageBox(response.message);
        await renderKitchenOrders(); // Refresh kitchen orders
    } catch (error) {
        // Error handled by fetchData
    }
};

// Event listeners for kitchen date filters
filterKitchenBtn.addEventListener('click', renderKitchenOrders);


// --- Sales Management Functions ---

/**
 * Renders the sales transactions in the table by fetching from backend.
 */
async function renderSalesTransactions() {
    salesTransactionsTableBody.innerHTML = ''; // Clear existing rows
    const startDate = salesStartDateInput.value;
    const endDate = salesEndDateInput.value;
    let url = `${BACKEND_API_URL}/sales`;
    if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
    } else if (startDate) {
        url += `?startDate=${startDate}`;
    } else if (endDate) {
        url += `?endDate=${endDate}`;
    }

    try {
        const sales = await fetchData(url);

        if (sales.length === 0) {
            salesTransactionsTableBody.innerHTML = `<tr><td colspan="9" class="table-empty-state">No sales transactions found for this period.</td></tr>`;
            return;
        }
        sales.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${transaction._id}</td>
                <td class="text-gray">${formatDateForInput(transaction.date)}</td>
                <td class="text-gray">${transaction.itemSold}</td>
                <td class="text-gray">${transaction.quantity}</td>
                <td class="text-gray">Ugshs${transaction.amount.toFixed(2)}</td>
                
            `;
            salesTransactionsTableBody.appendChild(row);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

// Event listeners for sales date filters
filterSalesBtn.addEventListener('click', renderSalesTransactions);


// --- Inventory Management Functions (CRUD) ---

/**
 * Renders the inventory items in the table by fetching from backend.
 */
// Variable declarations for new fields

// Variable declarations for original fields
const inventoryForm = document.getElementById('inventory-form');
const ingredientIdInput = document.getElementById('ingredient-id');
// The other inputs are no longer needed


async function renderInventoryItems() {
    inventoryItemsTableBody.innerHTML = ''; // Clear existing rows
    try {
        const url = `${BACKEND_API_URL}/inventory`;
        allIngredients = await fetchData(url); // Fetch and store all ingredients

        if (allIngredients.length === 0) {
            inventoryItemsTableBody.innerHTML = `<tr><td colspan="4" class="table-empty-state">No inventory items added yet.</td></tr>`;
            return;
        }

        allIngredients.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${item._id}</td>
                <td class="text-gray">${item.name}</td>
                <td class="text-gray">Ugshs${item.costPerUnit.toFixed(2)}</td>
                <td class="table-actions">
                    ${checkUserRole(['admin']) ? `<button onclick="editInventoryItem('${item._id}')" class="edit">Edit</button>` : ''}
                    ${checkUserRole(['admin']) ? `<button onclick="deleteInventoryItem('${item._id}')" class="delete">Delete</button>` : ''}
                </td>
            `;
            inventoryItemsTableBody.appendChild(row);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Handles form submission for adding/editing inventory items.
 */
inventoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }

    const id = ingredientIdInput.value;
    const name = ingredientNameInput.value.trim();
    const costPerUnit = parseFloat(ingredientCostPerUnitInput.value);

    if (!name || isNaN(costPerUnit) || costPerUnit < 0) {
        showMessageBox('Please fill in the ingredient name and a valid cost.');
        return;
    }

    const payload = { name, costPerUnit };

    try {
        if (id) {
            // Update existing item
            await fetchData(`${BACKEND_API_URL}/inventory/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showMessageBox('Inventory item updated successfully!');
        } else {
            // Add new item
            await fetchData(`${BACKEND_API_URL}/inventory`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showMessageBox('New inventory item added successfully!');
        }

        // Clear form and reset for new entry
        inventoryForm.reset();
        ingredientIdInput.value = '';
        cancelIngredientEditBtn.classList.add('hidden');
        await renderInventoryItems(); // Refresh inventory display
        await populateRecipeIngredientSelect(); // Refresh ingredient list for recipe builder
    } catch (error) {
        // Error handled by fetchData
    }
});

/**
 * Populates the form with data for editing an inventory item.
 * @param {string} id - The ID of the inventory item to edit.
 */
window.editInventoryItem = async (id) => {
    // Permission check
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        // Fetch all ingredients again to ensure we have the latest data
        allIngredients = await fetchData(`${BACKEND_API_URL}/inventory`);
        const itemToEdit = allIngredients.find(item => item._id === id);
        if (itemToEdit) {
            ingredientIdInput.value = itemToEdit._id;
            ingredientNameInput.value = itemToEdit.name;
            ingredientCostPerUnitInput.value = itemToEdit.costPerUnit;
            cancelIngredientEditBtn.classList.remove('hidden');
            ingredientNameInput.focus();
        } else {
            showMessageBox('Inventory item not found for editing.');
        }
    } catch (error) {
        // Error handled by fetchData
    }
};

/**
 * Cancels the current inventory item edit operation and clears the form.
 */
cancelIngredientEditBtn.addEventListener('click', () => {
    inventoryForm.reset();
    ingredientIdInput.value = '';
    cancelIngredientEditBtn.classList.add('hidden');
});

/**
 * Deletes an inventory item via backend API.
 * @param {string} id - The ID of the inventory item to delete.
 */
window.deleteInventoryItem = async (id) => {
    // Permission check
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        await fetchData(`${BACKEND_API_URL}/inventory/${id}`, {
            method: 'DELETE'
        });
        showMessageBox('Inventory item deleted successfully!');
        await renderInventoryItems(); // Refresh inventory display
        await populateRecipeIngredientSelect(); // Refresh ingredient list for recipe builder
    } catch (error) {
        // Error handled by fetchData
    }
};

// Event listeners for inventory date filters (currently just re-renders all)
filterInventoryBtn.addEventListener('click', renderInventoryItems);

// --- Expenses Management Functions (CRUD) ---

async function renderExpenses() {
    expensesTableBody.innerHTML = ''; // Clear existing rows
    const startDate = expenseStartDateInput.value;
    const endDate = expenseEndDateInput.value;
    let url = `${BACKEND_API_URL}/expenses`;
    if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
    } else if (startDate) {
        url += `?startDate=${startDate}`;
    } else if (endDate) {
        url += `?endDate=${endDate}`;
    }

    try {
        const expenses = await fetchData(url);

        if (expenses.length === 0) {
            expensesTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No expenses found for this period.</td></tr>`;
            return;
        }
        expenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${formatDateForInput(expense.date)}</td>
                <td class="text-gray">${expense.category}</td>
                <td class="text-gray">${expense.description}</td>
                <td class="text-gray">Ugshs${expense.amount.toFixed(2)}</td>
                <td class="table-actions">
                    ${checkUserRole(['admin']) ? `<button onclick="editExpense('${expense._id}')" class="edit">Edit</button>` : ''}
                    ${checkUserRole(['admin']) ? `<button onclick="deleteExpense('${expense._id}')" class="delete">Delete</button>` : ''}
                </td>
            `;
            expensesTableBody.appendChild(row);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Handles form submission for adding/editing expenses.
 */
expenseForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }

    const id = expenseIdInput.value;
    const date = expenseDateInput.value;
    const category = expenseCategoryInput.value.trim();
    const description = expenseDescriptionInput.value.trim();
    const amount = parseFloat(expenseAmountInput.value);

    if (!date || !category || !description || isNaN(amount) || amount <= 0) {
        showMessageBox('Please fill in all fields correctly for expense.');
        return;
    }

    const payload = { date: new Date(date), category, description, amount };

    try {
        if (id) {
            // Update existing expense
            await fetchData(`${BACKEND_API_URL}/expenses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showMessageBox('Expense updated successfully!');
        } else {
            // Add new expense
            await fetchData(`${BACKEND_API_URL}/expenses`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showMessageBox('New expense added successfully!');
        }

        // Clear form and reset for new entry
        expenseForm.reset();
        expenseIdInput.value = '';
        cancelExpenseEditBtn.classList.add('hidden');
        await renderExpenses(); // Refresh expenses display
        await generateReports(); // Reports might change
    } catch (error) {
        // Error handled by fetchData
    }
});

/**
 * Populates the form with data for editing an expense.
 * @param {string} id - The ID of the expense to edit.
 */
window.editExpense = async (id) => {
    // Permission check
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        const expenses = await fetchData(`${BACKEND_API-URL}/expenses`); // Fetch all to find by ID
        const expenseToEdit = expenses.find(exp => exp._id === id);
        if (expenseToEdit) {
            expenseIdInput.value = expenseToEdit._id;
            expenseDateInput.value = formatDateForInput(expenseToEdit.date);
            expenseCategoryInput.value = expenseToEdit.category;
            expenseDescriptionInput.value = expenseToEdit.description;
            expenseAmountInput.value = expenseToEdit.amount;
            cancelExpenseEditBtn.classList.remove('hidden');
            expenseDateInput.focus();
        } else {
            showMessageBox('Expense not found for editing.');
        }
    } catch (error) {
        // Error handled by fetchData
    }
};

/**
 * Cancels the current expense edit operation and clears the form.
 */
cancelExpenseEditBtn.addEventListener('click', () => {
    expenseForm.reset();
    expenseIdInput.value = '';
    cancelExpenseEditBtn.classList.add('hidden');
});

/**
 * Deletes an expense via backend API.
 * @param {string} id - The ID of the expense to delete.
 */
window.deleteExpense = async (id) => {
    // Permission check
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        await fetchData(`${BACKEND_API_URL}/expenses/${id}`, {
            method: 'DELETE'
        });
        showMessageBox('Expense deleted successfully!');
        await renderExpenses(); // Refresh expenses display
        await generateReports(); // Reports might change
    } catch (error) {
        // Error handled by fetchData
    }
};

// Event listeners for expenses date filters
filterExpensesBtn.addEventListener('click', renderExpenses);


// --- Reports Section Functions ---

/**
 * Generates and displays sales, expense, and balance reports for a given date range.
 */
async function generateReports() {
    // Permission check
    if (!checkUserRole(['admin'])) {
        // If a non-admin somehow gets here, just show a message.
        showMessageBox('You do not have permission to view reports.');
        return;
    }

    const startDate = reportStartDateInput.value;
    const endDate = reportEndDateInput.value;

    if (!startDate || !endDate) {
        showMessageBox('Please select both start and end dates for the report.');
        return;
    }

    try {
        const reportData = await fetchData(`${BACKEND_API_URL}/reports/financial?startDate=${startDate}&endDate=${endDate}`);

        reportTotalSalesSpan.textContent = `Ugshs${reportData.totalSales.toFixed(2)}`;
        reportTotalExpensesSpan.textContent = `Ugshs${reportData.totalExpenses.toFixed(2)}`;
        reportNetBalanceSpan.textContent = `Ugshs${reportData.netProfit.toFixed(2)}`;
        reportNetBalanceSpan.style.color = reportData.netProfit >= 0 ? '#22c55e' : '#ef4444'; // Green for profit, red for loss

        // Render filtered sales details
        reportSalesTableBody.innerHTML = '';
        if (reportData.salesDetails.length === 0) {
            reportSalesTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No sales data for this period.</td></tr>`;
        } else {
            reportData.salesDetails.forEach(transaction => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-gray">${formatDateForInput(transaction.date)}</td>
                    <td class="text-gray">${transaction.itemSold}</td>
                    <td class="text-gray">${transaction.quantity}</td>
                    <td class="text-gray">Ugshs${transaction.amount.toFixed(2)}</td>
                `;
                reportSalesTableBody.appendChild(row);
            });
        }

        // Render filtered expenses details
        reportExpensesTableBody.innerHTML = '';
        if (reportData.expenseDetails.length === 0) {
            reportExpensesTableBody.innerHTML = `<tr><td colspan="4" class="table-empty-state">No expense data for this period.</td></tr>`;
        } else {
            reportData.expenseDetails.forEach(expense => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-gray">${formatDateForInput(expense.date)}</td>
                    <td class="text-gray">${expense.category}</td>
                    <td class="text-gray">${expense.description}</td>
                    <td class="text-gray">Ugshs${expense.amount.toFixed(2)}</td>
                `;
                reportExpensesTableBody.appendChild(row);
            });
        }
    } catch (error) {
        // Error handled by fetchData
    }
}

// Event listener for generate report button
generateReportBtn.addEventListener('click', generateReports);


// --- Menu Management Functions (CRUD) ---

/**
 * Populates the recipe ingredient select dropdown with all available ingredients.
 */
async function populateRecipeIngredientSelect() {
    recipeIngredientSelect.innerHTML = '<option value="">-- Select Ingredient --</option>';
    try {
        allIngredients.forEach(ingredient => {
            const option = document.createElement('option');
            option.value = ingredient._id;
            recipeIngredientSelect.appendChild(option);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Renders the current recipe list (in-memory) for the menu item being edited/added.
 */
function renderCurrentRecipe() {
    currentRecipeList.innerHTML = '';
    if (currentRecipe.length === 0) {
        currentRecipeList.innerHTML = `<li class="order-list-item">No ingredients added to recipe.</li>`;
    } else {
        currentRecipe.forEach((recipeItem, index) => {
            // Find the ingredient details from the allIngredients array
            const ingredient = allIngredients.find(ing => ing._id === recipeItem.ingredient);
            if (ingredient) {
                const listItem = document.createElement('li');
                listItem.classList.add('order-list-item');
                listItem.innerHTML = `
                    <span>${ingredient.name} </span>
                    <button onclick="removeRecipeIngredient(${index})">&times;</button>
                `;
                currentRecipeList.appendChild(listItem);
            }
        });
    }
}

/**
 * Adds an ingredient to the current menu item's recipe (in-memory).
 */
addRecipeIngredientBtn.addEventListener('click', () => {
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to add a recipe ingredient.');
        return;
    }
    const selectedIngredientId = recipeIngredientSelect.value;

    if (!selectedIngredientId ) {
        showMessageBox('Please select an ingredient and enter a valid quantity used.');
        return;
    }

    // Check if ingredient is already in the recipe
    const existingRecipeItemIndex = currentRecipe.findIndex(item => item.ingredient === selectedIngredientId);
    if (existingRecipeItemIndex > -1) {
        // Update quantity if already exists
    } else {
        // Add new ingredient to recipe
        currentRecipe.push({ ingredient: selectedIngredientId, quantityUsed: quantityUsed });
    }

    renderCurrentRecipe();
    recipeIngredientSelect.value = ''; // Reset select
});

/**
 * Removes an ingredient from the current menu item's recipe (in-memory).
 * @param {number} index - The index of the recipe ingredient to remove.
 */
window.removeRecipeIngredient = (index) => {
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to remove a recipe ingredient.');
        return;
    }
    currentRecipe.splice(index, 1);
    renderCurrentRecipe();
};


/**
 * Renders the menu items in the table by fetching from backend.
 */
async function renderMenuItems() {
    menuItemsTableBody.innerHTML = ''; // Clear existing rows
    try {
        const menuItems = await fetchData(`${BACKEND_API_URL}/menu`);

        if (menuItems.length === 0) {
            menuItemsTableBody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No menu items added yet.</td></tr>`;
            return;
        }
        menuItems.forEach(item => {
            const recipeDisplay = item.recipe && item.recipe.length > 0
                ? item.recipe.map(rItem => {
                    const ingredientName = rItem.ingredient?.name || 'Unknown';
                    
                    return `${ingredientName} `;
                }).join(', ')
                : 'N/A';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${item._id}</td>
                <td class="text-gray">${item.name}</td>
                <td class="text-gray">${item.category}</td>
                <td class="text-gray">Ugshs${item.price.toFixed(2)}</td>
                <td class="text-gray">${recipeDisplay}</td>
                <td class="table-actions">
                    ${checkUserRole(['admin']) ?
                        `<button onclick="openRecipeEditModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="edit">Edit</button>` :
                        ''
                    }
                    ${checkUserRole(['admin']) ?
                        `<button onclick="deleteMenuItem('${item._id}')" class="delete">Delete</button>` :
                        ''
                    }
                </td>
            `;
            menuItemsTableBody.appendChild(row);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Handles form submission for adding/editing menu items.
 */
menuForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }

    const id = menuItemIdInput.value;
    const name = itemNameInput.value.trim();
    const price = parseFloat(itemPriceInput.value);
    const category = itemCategoryInput.value.trim();

    if (!name || isNaN(price) || price <= 0 || !category) {
        showMessageBox('Please fill in all fields correctly for menu item.');
        return;
    }

    const payload = {
        name,
        price,
        category,
        recipe: currentRecipe
    };

    try {
        if (id) {
            // Update existing item
            await fetchData(`${BACKEND_API_URL}/menu/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showMessageBox('Menu item updated successfully!');
        } else {
            // Add new item
            await fetchData(`${BACKEND_API_URL}/menu`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showMessageBox('New menu item added successfully!');
        }

        // Clear form and reset for new entry, including recipe builder
        menuForm.reset();
        menuItemIdInput.value = '';
        cancelMenuEditBtn.classList.add('hidden');
        currentRecipe = []; // Clear in-memory recipe
        renderCurrentRecipe(); // Clear recipe display
        await renderMenuItems(); // Refresh menu display
        await renderOrderForm(); // Update order form dropdown
    } catch (error) {
        // Error handled by fetchData
    }
});

/**
 * Populates the form with data for editing a menu item.
 * @param {string} id - The ID of the menu item to edit.
 */
window.editMenuItem = async (id) => {
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        const itemToEdit = await fetchData(`${BACKEND_API_URL}/menu/${id}`);
        if (itemToEdit) {
            menuItemIdInput.value = itemToEdit._id;
            itemNameInput.value = itemToEdit.name;
            itemPriceInput.value = itemToEdit.price;
            itemCategoryInput.value = itemToEdit.category;
            currentRecipe = itemToEdit.recipe.map(rItem => ({
                ingredient: rItem.ingredient._id
            }));
            renderCurrentRecipe();
            cancelMenuEditBtn.classList.remove('hidden');
            itemNameInput.focus();
        } else {
            showMessageBox('Menu item not found for editing.');
        }
    } catch (error) {
        // Error handled by fetchData
    }
};

/**
 * Cancels the current menu item edit operation and clears the form.
 */
cancelMenuEditBtn.addEventListener('click', () => {
    menuForm.reset();
    menuItemIdInput.value = '';
    cancelMenuEditBtn.classList.add('hidden');
    currentRecipe = []; // Clear in-memory recipe
    renderCurrentRecipe(); // Clear recipe display
});

/**
 * Deletes a menu item via backend API.
 * @param {string} id - The ID of the menu item to delete.
 */
window.deleteMenuItem = async (id) => {
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        await fetchData(`${BACKEND_API_URL}/menu/${id}`, {
            method: 'DELETE'
        });
        showMessageBox('Menu item deleted successfully!');
        await renderMenuItems(); // Refresh menu display
        await renderOrderForm(); // Update order form dropdown
    } catch (error) {
        // Error handled by fetchData
    }
};

/**
 * Checks for orders that have changed to 'Ready' status for waiter notification.
 */
async function checkOrderReadyForWaiter() {
    try {
        // Only run for waiter/admin
        if (currentUserRole !== 'waiter' && currentUserRole !== 'admin') {
            return;
        }

        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        let newReadyOrders = [];

        orders.forEach(order => {
            if (order.status === 'Ready' && lastWaiterOrderStatuses.get(order._id) !== 'Ready') {
                newReadyOrders.push(order._id);
            }
            lastWaiterOrderStatuses.set(order._id, order.status);
        });

        if (newReadyOrders.length > 0) {
            showMessageBox(`Order Ready! Order(s) ${newReadyOrders.join(', ')} are now ready for pickup.`);
        }
    } catch (error) {
        console.error("Error checking for ready orders:", error);
    }
}


// --- Modal Recipe Edit Functions ---
let editingMenuItem = null;

window.openRecipeEditModal = (item) => {
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to edit menu items.');
        return;
    }
    editingMenuItem = item;
    document.getElementById('modal-item-name').value = item.name;
    document.getElementById('modal-item-price').value = item.price;
    document.getElementById('modal-item-category').value = item.category;

    renderModalRecipeTable(item.recipe.map(r => ({
        ingredient: r.ingredient._id,
        quantityUsed: r.quantityUsed
    })));
    document.getElementById('recipe-edit-modal').classList.remove('hidden');
};

document.getElementById('close-modal-btn').addEventListener('click', closeRecipeEditModal);

function closeRecipeEditModal() {
    editingMenuItem = null;
    document.getElementById('recipe-edit-modal').classList.add('hidden');
}

function renderModalRecipeTable(recipeArray) {
    const tbody = document.getElementById('modal-recipe-table-body');
    tbody.innerHTML = '';

    recipeArray.forEach((rItem, index) => {
        const ingredient = allIngredients.find(i => i._id === rItem.ingredient);
        const name = ingredient?.name || 'Unknown';
        const unit = ingredient?.unit || '';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${name}</td>
            <td><input type="number" min="0" step="0.01" value="${rItem.quantityUsed}" onchange="updateIngredientQuantity(${index}, this.value)"></td>
            <td>${unit}</td>
            <td>
                <button onclick="deleteIngredientFromRecipe(${index})" class="delete">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateIngredientQuantity(index, newQuantity) {
    if (editingMenuItem && editingMenuItem.recipe[index]) {
        editingMenuItem.recipe[index].quantityUsed = parseFloat(newQuantity);
    }
}

function deleteIngredientFromRecipe(index) {
    if (editingMenuItem) {
        editingMenuItem.recipe.splice(index, 1);
        renderModalRecipeTable(editingMenuItem.recipe);
    }
}

async function saveEditedMenuItem() {
    if (!editingMenuItem) return;

    const name = document.getElementById('modal-item-name').value.trim();
    const price = parseFloat(document.getElementById('modal-item-price').value);
    const category = document.getElementById('modal-item-category').value.trim();

    if (!name || isNaN(price) || !category) {
        showMessageBox('Please fill out all fields correctly.');
        return;
    }

    const updatedData = {
        name,
        price,
        category,
        recipe: editingMenuItem.recipe.map(r => ({
            ingredient: r.ingredient,
            quantityUsed: r.quantityUsed
        }))
    };

    try {
        await fetchData(`${BACKEND_API_URL}/menu/${editingMenuItem._id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData)
        });
        showMessageBox('Menu item updated successfully!');
        closeRecipeEditModal();
        await renderMenuItems();
    } catch (err) {
        showMessageBox('Error updating menu item.');
    }
}
document.getElementById('add-recipe-ingredient-btn').addEventListener('click', saveEditedMenuItem);


// Initialize: Check for session and show appropriate content
document.addEventListener('DOMContentLoaded', async () => {
    // Attempt to get user role from session storage
    const userRoleFromSession = sessionStorage.getItem('userRole');
    if (userRoleFromSession) {
        // If a session exists, initialize the app
        await initializeApp(userRoleFromSession);
    } else {
        // No session, show the login page
        loginPage.classList.remove('hidden');
        mainAppContainer.classList.add('hidden');
    }
});

/**
 * Renders the audit logs in the table by fetching from the backend.
 */
async function renderAuditLogs() {
    // Get the table body element where the logs will be displayed.
    const auditLogsTableBody = document.getElementById('audit-logs-table-body');
    
    // Check if the current user has the necessary permissions.
    if (!checkUserRole(['admin'])) {
        // Clear the table and show a permission denied message.
        auditLogsTableBody.innerHTML = `<tr><td colspan="4" class="table-empty-state">You do not have permission to view audit logs.</td></tr>`;
        showMessageBox('You do not have permission to view audit logs.');
        return;
    }

    // Clear any existing rows in the table.
    auditLogsTableBody.innerHTML = '';
    
    try {
        // Fetch the audit logs from the backend.
        // It's assumed your API has a route like `/auditlogs` that returns a list of log objects.

const auditLogs = await fetchData(`${BACKEND_API_URL}/auditlogs`);


        if (auditLogs.length === 0) {
            // Display a message if no logs are found.
            auditLogsTableBody.innerHTML = `<tr><td colspan="4" class="table-empty-state">No audit logs found.</td></tr>`;
            return;
        }

        // Loop through each audit log entry and create a table row for it.
        auditLogs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-gray">${formatDateForDisplay(log.timestamp)}</td>
                <td class="text-gray">${log.user}</td>
                <td class="text-gray">${log.action}</td>
                <td class="text-gray">${log.details}</td>
            `;
            auditLogsTableBody.appendChild(row);
        });
    } catch (error) {
        // Error is handled by fetchData, but we can log it here as well.
        console.error("Failed to render audit logs:", error);
    }
}

/**
 * Helper function to format a timestamp string for display.
 * @param {string} dateString - The date string from the backend.
 * @returns {string} The formatted date string.
 */
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}
