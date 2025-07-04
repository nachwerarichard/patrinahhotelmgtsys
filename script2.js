// script2.js

// Firebase Imports (MUST BE USED)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Initialization ---
let app;
let db;
let auth;
let userId; // Will store the current user's ID
let isAuthReady = false; // Flag to ensure Firestore operations wait for auth

// Global variables for Firebase config and app ID provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase and set up authentication listener
document.addEventListener('DOMContentLoaded', async () => {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Authenticate user
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("Signed in with custom token.");
        } else {
            await signInAnonymously(auth);
            console.log("Signed in anonymously.");
        }

        // Listen for authentication state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log("User ID:", userId);
                isAuthReady = true;
                // Once authenticated, load initial data
                loadInitialData();
            } else {
                console.log("No user is signed in.");
                userId = null;
                isAuthReady = true; // Still set to true to allow anonymous operations if rules permit
            }
        });

    } catch (error) {
        console.error("Error initializing Firebase:", error);
        // Display a user-friendly message if Firebase initialization fails
        showMessageBox('Error', 'Failed to initialize the application. Please try again later.');
    }
});

// --- DOM Element Selection ---
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');
const sidebarToggleBtn = document.getElementById('sidebar-toggle');
const navLinks = document.querySelectorAll('.nav-link');
const pageContents = document.querySelectorAll('.page-content');

// Dashboard Elements
const todaySalesEl = document.getElementById('today-sales');
const weeklySalesEl = document.getElementById('weekly-sales');
const monthlySalesEl = document.getElementById('monthly-sales');
const dashboardTotalBalanceEl = document.getElementById('dashboard-total-balance');
const dashboardBarPerformanceEl = document.getElementById('dashboard-bar-performance');
const dashboardAccommodationPerformanceEl = document.getElementById('dashboard-accommodation-performance');
const dashboardRestaurantPerformanceEl = document.getElementById('dashboard-restaurant-performance');
const dashboardGardensPerformanceEl = document.getElementById('dashboard-gardens-performance');
const dashboardConferencePerformanceEl = document.getElementById('dashboard-conference-performance');

// Bar Section Elements
const dateFilterBar = document.getElementById('date-filter-bar');
const barTotalSalesEl = document.getElementById('bar-total-sales');
const barTotalExpensesEl = document.getElementById('bar-total-expenses');
const barBalanceEl = document.getElementById('bar-balance');
const addItemBtnBar = document.getElementById('add-item-btn-bar');
const addExpenseBtnBar = document.getElementById('add-expense-btn-bar');
const addSaleBtnBar = document.getElementById('add-sale-btn-bar');
const inventoryTableBodyBar = document.getElementById('inventory-table-body-bar');
const expensesTableBodyBar = document.getElementById('expenses-table-body-bar');
const salesTableBodyBar = document.getElementById('sales-table-body-bar');
const cashFormBar = document.getElementById('cash-form-bar');
const cashAtHandBar = document.getElementById('cash-at-hand-bar');
const cashBankedBar = document.getElementById('cash-banked-bar');
const bankedReceiptIdBar = document.getElementById('banked-receipt-id-bar');
const responsiblePersonBar = document.getElementById('responsible-person-bar');


// Restaurant Section Elements
const dateFilterRestaurant = document.getElementById('date-filter-restaurant');
const restaurantTotalSalesEl = document.getElementById('restaurant-total-sales');
const restaurantTotalExpensesEl = document.getElementById('restaurant-total-expenses');
const restaurantBalanceEl = document.getElementById('restaurant-balance');
const addItemBtnRestaurant = document.getElementById('add-item-btn-restaurant');
const addExpenseBtnRestaurant = document.getElementById('add-expense-btn-restaurant');
const addSaleBtnRestaurant = document.getElementById('add-sale-btn-restaurant');
const inventoryTableBodyRestaurant = document.getElementById('inventory-table-body-restaurant');
const expensesTableBodyRestaurant = document.getElementById('expenses-table-body-restaurant');
const salesTableBodyRestaurant = document.getElementById('sales-table-body-restaurant');
const cashFormRestaurant = document.getElementById('cash-form-restaurant');
const cashAtHandRestaurant = document.getElementById('cash-at-hand-restaurant');
const cashBankedRestaurant = document.getElementById('cash-banked-restaurant');
const bankedReceiptIdRestaurant = document.getElementById('banked-receipt-id-restaurant');
const responsiblePersonRestaurant = document.getElementById('responsible-person-restaurant');


// Modals
const itemModal = document.getElementById('item-modal');
const itemModalTitle = document.getElementById('item-modal-title');
const itemForm = document.getElementById('item-form');
const itemIdInput = document.getElementById('item-id');
const itemNameInput = document.getElementById('item-name');
const itemTypeSelect = document.getElementById('item-type');
const itemQuantityInput = document.getElementById('item-quantity');
const itemPriceInput = document.getElementById('item-price');
const cancelItemBtn = document.getElementById('cancel-item-btn');

const expenseModal = document.getElementById('expense-modal');
const expenseModalTitle = document.getElementById('expense-modal-title');
const expenseForm = document.getElementById('expense-form');
const expenseIdInput = document.getElementById('expense-id');
const expenseDescriptionInput = document.getElementById('expense-description');
const expenseAmountInput = document.getElementById('expense-amount');
const expenseReceiptInput = document.getElementById('expense-receipt');
const expenseSourceSelect = document.getElementById('expense-source');
const expenseResponsibleInput = document.getElementById('expense-responsible');
const cancelExpenseBtn = document.getElementById('cancel-expense-btn');

const salesModal = document.getElementById('sales-modal');
const salesModalTitle = document.getElementById('sales-modal-title');
const saleForm = document.getElementById('sale-form');
const saleIdInput = document.getElementById('sale-id');
const saleItemInput = document.getElementById('sale-item');
const saleNumberInput = document.getElementById('sale-number');
const saleBuyingPriceInput = document.getElementById('sale-buying-price');
const saleSellingPriceInput = document.getElementById('sale-selling-price');
const saleReceiptIdInput = document.getElementById('sale-receipt-id');
const saleResponsibleInput = document.getElementById('sale-responsible');
const cancelSaleBtn = document.getElementById('cancel-sale-btn');

const lowStockNotification = document.getElementById('low-stock-notification');
const lowStockMessage = document.getElementById('low-stock-message');

// --- Utility Functions ---

/**
 * Displays a custom message box instead of alert().
 * @param {string} title - The title of the message box.
 * @param {string} message - The message content.
 */
function showMessageBox(title, message) {
    const messageBox = document.createElement('div');
    messageBox.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    messageBox.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <h3 class="text-xl font-bold mb-4">${title}</h3>
            <p class="mb-6">${message}</p>
            <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600" onclick="this.parentNode.parentNode.remove()">OK</button>
        </div>
    `;
    document.body.appendChild(messageBox);
}

/**
 * Formats a number as Ugandan Shillings.
 * @param {number} amount - The amount to format.
 * @returns {string} Formatted string.
 */
function formatUGX(amount) {
    return `UGX ${new Intl.NumberFormat('en-UG').format(amount)}`;
}

/**
 * Shows a modal by removing the 'hidden' class and adding 'flex'.
 * @param {HTMLElement} modalElement - The modal DOM element.
 */
function showModal(modalElement) {
    modalElement.classList.remove('hidden');
    modalElement.classList.add('flex');
}

/**
 * Hides a modal by adding the 'hidden' class and removing 'flex'.
 * @param {HTMLElement} modalElement - The modal DOM element.
 */
function hideModal(modalElement) {
    modalElement.classList.add('hidden');
    modalElement.classList.remove('flex');
}

// --- Sidebar and Navigation Logic ---

/**
 * Activates the selected navigation link and shows the corresponding content section.
 * @param {string} targetId - The ID of the content section to show.
 */
function activateSection(targetId) {
    // Deactivate all nav links
    navLinks.forEach(link => link.classList.remove('active-link', 'bg-gray-700'));
    // Hide all page content sections
    pageContents.forEach(section => section.classList.add('hidden'));

    // Activate the clicked nav link
    const activeLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
    if (activeLink) {
        activeLink.classList.add('active-link', 'bg-gray-700');
    }

    // Show the target content section
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        // Trigger data load/update for the activated section if needed
        if (targetId === 'dashboard') {
            updateDashboardSummaries();
        } else if (targetId === 'bar') {
            loadBarData();
        } else if (targetId === 'restaurant') {
            loadRestaurantData();
        }
        // Add similar calls for other sections as they get implemented
    }
}

// Add event listeners for sidebar navigation
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = e.currentTarget.dataset.target;
        activateSection(targetId);
    });
});

// Sidebar toggle for mobile
sidebarToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full'); // Tailwind class for sliding
    mainContent.classList.toggle('ml-64'); // Adjust main content margin
});

// --- Firestore Data Management ---

// Base path for collections (public data for simplicity, can be user-specific)
const getCollectionPath = (collectionName) => {
    if (!userId) {
        console.error("User ID not available. Cannot form collection path.");
        return null;
    }
    // Using public data path as per instructions
    return `artifacts/${appId}/public/data/${collectionName}`;
};

/**
 * Adds an item to the inventory collection.
 * @param {object} itemData - The item data.
 * @param {string} section - 'bar' or 'restaurant'.
 */
async function addItem(itemData, section) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping addItem."); return; }
    const path = getCollectionPath('inventory');
    if (!path) return;
    try {
        await addDoc(collection(db, path), { ...itemData, section, timestamp: serverTimestamp() });
        showMessageBox('Success', 'Item added successfully!');
    } catch (e) {
        console.error("Error adding item: ", e);
        showMessageBox('Error', 'Failed to add item. Please try again.');
    }
}

/**
 * Updates an item in the inventory collection.
 * @param {string} id - The document ID of the item.
 * @param {object} itemData - The updated item data.
 */
async function updateItem(id, itemData) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping updateItem."); return; }
    const path = getCollectionPath('inventory');
    if (!path) return;
    try {
        await updateDoc(doc(db, path, id), itemData);
        showMessageBox('Success', 'Item updated successfully!');
    } catch (e) {
        console.error("Error updating item: ", e);
        showMessageBox('Error', 'Failed to update item. Please try again.');
    }
}

/**
 * Deletes an item from the inventory collection.
 * @param {string} id - The document ID of the item.
 */
async function deleteItem(id) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping deleteItem."); return; }
    const path = getCollectionPath('inventory');
    if (!path) return;
    try {
        await deleteDoc(doc(db, path, id));
        showMessageBox('Success', 'Item deleted successfully!');
    } catch (e) {
        console.error("Error deleting item: ", e);
        showMessageBox('Error', 'Failed to delete item. Please try again.');
    }
}

/**
 * Adds an expense to the expenses collection.
 * @param {object} expenseData - The expense data.
 */
async function addExpense(expenseData) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping addExpense."); return; }
    const path = getCollectionPath('expenses');
    if (!path) return;
    try {
        await addDoc(collection(db, path), { ...expenseData, timestamp: serverTimestamp() });
        showMessageBox('Success', 'Expense added successfully!');
    } catch (e) {
        console.error("Error adding expense: ", e);
        showMessageBox('Error', 'Failed to add expense. Please try again.');
    }
}

/**
 * Updates an expense in the expenses collection.
 * @param {string} id - The document ID of the expense.
 * @param {object} expenseData - The updated expense data.
 */
async function updateExpense(id, expenseData) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping updateExpense."); return; }
    const path = getCollectionPath('expenses');
    if (!path) return;
    try {
        await updateDoc(doc(db, path, id), expenseData);
        showMessageBox('Success', 'Expense updated successfully!');
    } catch (e) {
        console.error("Error updating expense: ", e);
        showMessageBox('Error', 'Failed to update expense. Please try again.');
    }
}

/**
 * Deletes an expense from the expenses collection.
 * @param {string} id - The document ID of the expense.
 */
async function deleteExpense(id) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping deleteExpense."); return; }
    const path = getCollectionPath('expenses');
    if (!path) return;
    try {
        await deleteDoc(doc(db, path, id));
        showMessageBox('Success', 'Expense deleted successfully!');
    } catch (e) {
        console.error("Error deleting expense: ", e);
        showMessageBox('Error', 'Failed to delete expense. Please try again.');
    }
}

/**
 * Adds a sale to the sales collection.
 * @param {object} saleData - The sale data.
 * @param {string} section - 'bar' or 'restaurant'.
 */
async function addSale(saleData, section) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping addSale."); return; }
    const path = getCollectionPath('sales');
    if (!path) return;
    try {
        await addDoc(collection(db, path), { ...saleData, section, timestamp: serverTimestamp() });
        showMessageBox('Success', 'Sale added successfully!');
    } catch (e) {
        console.error("Error adding sale: ", e);
        showMessageBox('Error', 'Failed to add sale. Please try again.');
    }
}

/**
 * Updates a sale in the sales collection.
 * @param {string} id - The document ID of the sale.
 * @param {object} saleData - The updated sale data.
 */
async function updateSale(id, saleData) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping updateSale."); return; }
    const path = getCollectionPath('sales');
    if (!path) return;
    try {
        await updateDoc(doc(db, path, id), saleData);
        showMessageBox('Success', 'Sale updated successfully!');
    } catch (e) {
        console.error("Error updating sale: ", e);
        showMessageBox('Error', 'Failed to update sale. Please try again.');
    }
}

/**
 * Deletes a sale from the sales collection.
 * @param {string} id - The document ID of the sale.
 */
async function deleteSale(id) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping deleteSale."); return; }
    const path = getCollectionPath('sales');
    if (!path) return;
    try {
        await deleteDoc(doc(db, path, id));
        showMessageBox('Success', 'Sale deleted successfully!');
    } catch (e) {
        console.error("Error deleting sale: ", e);
        showMessageBox('Error', 'Failed to delete sale. Please try again.');
    }
}

/**
 * Saves a cash record.
 * @param {object} cashRecordData - The cash record data.
 * @param {string} section - 'bar' or 'restaurant'.
 */
async function saveCashRecord(cashRecordData, section) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping saveCashRecord."); return; }
    const path = getCollectionPath('cashRecords');
    if (!path) return;
    try {
        await addDoc(collection(db, path), { ...cashRecordData, section, timestamp: serverTimestamp() });
        showMessageBox('Success', 'Cash record saved successfully!');
    } catch (e) {
        console.error("Error saving cash record: ", e);
        showMessageBox('Error', 'Failed to save cash record. Please try again.');
    }
}

/**
 * Fetches inventory data for a specific section and updates the table in real-time.
 * @param {string} section - 'bar' or 'restaurant'.
 * @param {HTMLElement} tableBodyEl - The tbody element to populate.
 */
function getInventory(section, tableBodyEl) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping getInventory."); return; }
    const path = getCollectionPath('inventory');
    if (!path) return;

    const q = query(collection(db, path), where("section", "==", section));
    onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        renderInventoryTable(items, tableBodyEl, section);
        checkLowStock(items);
    }, (error) => {
        console.error("Error getting inventory: ", error);
        showMessageBox('Error', 'Failed to load inventory data.');
    });
}

/**
 * Fetches expense data for a specific section and date, and updates the table and summary in real-time.
 * @param {string} section - 'bar' or 'restaurant'.
 * @param {HTMLElement} tableBodyEl - The tbody element to populate.
 * @param {HTMLElement} totalExpensesEl - Element to display total expenses.
 * @param {string} date - The date to filter by (YYYY-MM-DD).
 */
function getExpenses(section, tableBodyEl, totalExpensesEl, date = null) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping getExpenses."); return; }
    const path = getCollectionPath('expenses');
    if (!path) return;

    let q = query(collection(db, path), where("source", "==", section));

    if (date) {
        // Filter by date (start of day to end of day)
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        q = query(q, where("timestamp", ">=", startOfDay), where("timestamp", "<=", endOfDay));
    }

    onSnapshot(q, (snapshot) => {
        let totalExpenses = 0;
        const expenses = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            expenses.push({ id: doc.id, ...data });
            totalExpenses += parseFloat(data.amount || 0);
        });
        renderExpensesTable(expenses, tableBodyEl);
        totalExpensesEl.textContent = formatUGX(totalExpenses);
        updateSectionBalance(section); // Recalculate balance when expenses change
    }, (error) => {
        console.error("Error getting expenses: ", error);
        showMessageBox('Error', 'Failed to load expense data.');
    });
}

/**
 * Fetches sales data for a specific section and date, and updates the table and summary in real-time.
 * @param {string} section - 'bar' or 'restaurant'.
 * @param {HTMLElement} tableBodyEl - The tbody element to populate.
 * @param {HTMLElement} totalSalesEl - Element to display total sales.
 * @param {string} date - The date to filter by (YYYY-MM-DD).
 */
function getSales(section, tableBodyEl, totalSalesEl, date = null) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping getSales."); return; }
    const path = getCollectionPath('sales');
    if (!path) return;

    let q = query(collection(db, path), where("section", "==", section));

    if (date) {
        // Filter by date (start of day to end of day)
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        q = query(q, where("timestamp", ">=", startOfDay), where("timestamp", "<=", endOfDay));
    }

    onSnapshot(q, (snapshot) => {
        let totalSales = 0;
        const sales = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const sumSP = parseFloat(data.sellingPrice || 0) * parseFloat(data.number || 0);
            totalSales += sumSP;
            sales.push({ id: doc.id, ...data, sumSP });
        });
        renderSalesTable(sales, tableBodyEl);
        totalSalesEl.textContent = formatUGX(totalSales);
        updateSectionBalance(section); // Recalculate balance when sales change
    }, (error) => {
        console.error("Error getting sales: ", error);
        showMessageBox('Error', 'Failed to load sales data.');
    });
}

/**
 * Fetches all sales and expenses for dashboard calculations.
 * This is a more complex query as it needs to aggregate across sections.
 * For simplicity, we'll fetch all and filter in memory.
 */
function getAllSalesAndExpensesForDashboard() {
    if (!isAuthReady) { console.warn("Auth not ready, skipping getAllSalesAndExpensesForDashboard."); return; }
    const salesPath = getCollectionPath('sales');
    const expensesPath = getCollectionPath('expenses');
    if (!salesPath || !expensesPath) return;

    const salesQuery = query(collection(db, salesPath));
    const expensesQuery = query(collection(db, expensesPath));

    // Listen to sales changes
    onSnapshot(salesQuery, (salesSnapshot) => {
        const allSales = [];
        salesSnapshot.forEach(doc => {
            const data = doc.data();
            allSales.push({ ...data, timestamp: data.timestamp ? data.timestamp.toDate() : new Date() });
        });

        // Listen to expenses changes
        onSnapshot(expensesQuery, (expensesSnapshot) => {
            const allExpenses = [];
            expensesSnapshot.forEach(doc => {
                const data = doc.data();
                allExpenses.push({ ...data, timestamp: data.timestamp ? data.timestamp.toDate() : new Date() });
            });
            updateDashboardSummaries(allSales, allExpenses);
        }, (error) => {
            console.error("Error getting all expenses for dashboard: ", error);
            showMessageBox('Error', 'Failed to load dashboard expense data.');
        });
    }, (error) => {
        console.error("Error getting all sales for dashboard: ", error);
        showMessageBox('Error', 'Failed to load dashboard sales data.');
    });
}


// --- Rendering Functions ---

/**
 * Renders inventory items into the specified table body.
 * @param {Array<object>} items - Array of item objects.
 * @param {HTMLElement} tableBodyEl - The tbody element to populate.
 * @param {string} section - The section ('bar' or 'restaurant') this table belongs to.
 */
function renderInventoryTable(items, tableBodyEl, section) {
    tableBodyEl.innerHTML = ''; // Clear existing rows
    items.forEach(item => {
        const row = tableBodyEl.insertRow();
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="py-2 px-4">${item.name}</td>
            <td class="py-2 px-4">${item.type}</td>
            <td class="py-2 px-4">${item.quantity}</td>
            <td class="py-2 px-4">${formatUGX(item.price)}</td>
            <td class="py-2 px-4">${item.timestamp ? new Date(item.timestamp.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td class="py-2 px-4 text-center">
                <button data-id="${item.id}" data-section="${section}" class="edit-item-btn text-blue-600 hover:text-blue-800 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button data-id="${item.id}" data-section="${section}" class="delete-item-btn text-red-600 hover:text-red-800">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
    });

    // Add event listeners for edit and delete buttons
    tableBodyEl.querySelectorAll('.edit-item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const section = e.currentTarget.dataset.section;
            const item = items.find(i => i.id === id);
            if (item) {
                openItemModal(item, section);
            }
        });
    });

    tableBodyEl.querySelectorAll('.delete-item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            // Instead of confirm, use a custom modal for confirmation
            showMessageBox('Confirm Delete', 'Are you sure you want to delete this item?', () => deleteItem(id));
        });
    });
}

/**
 * Renders expenses into the specified table body.
 * @param {Array<object>} expenses - Array of expense objects.
 * @param {HTMLElement} tableBodyEl - The tbody element to populate.
 */
function renderExpensesTable(expenses, tableBodyEl) {
    tableBodyEl.innerHTML = ''; // Clear existing rows
    expenses.forEach(expense => {
        const row = tableBodyEl.insertRow();
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="py-2 px-4">${expense.description}</td>
            <td class="py-2 px-4">${formatUGX(expense.amount)}</td>
            <td class="py-2 px-4">${expense.timestamp ? new Date(expense.timestamp.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td class="py-2 px-4">${expense.receiptId || 'N/A'}</td>
            <td class="py-2 px-4">${expense.source}</td>
            <td class="py-2 px-4">${expense.responsible}</td>
            <td class="py-2 px-4 text-center">
                <button data-id="${expense.id}" class="edit-expense-btn text-blue-600 hover:text-blue-800 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button data-id="${expense.id}" class="delete-expense-btn text-red-600 hover:text-red-800">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
    });

    tableBodyEl.querySelectorAll('.edit-expense-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const expense = expenses.find(exp => exp.id === id);
            if (expense) {
                openExpenseModal(expense);
            }
        });
    });

    tableBodyEl.querySelectorAll('.delete-expense-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            showMessageBox('Confirm Delete', 'Are you sure you want to delete this expense?', () => deleteExpense(id));
        });
    });
}

/**
 * Renders sales into the specified table body.
 * @param {Array<object>} sales - Array of sale objects.
 * @param {HTMLElement} tableBodyEl - The tbody element to populate.
 */
function renderSalesTable(sales, tableBodyEl) {
    tableBodyEl.innerHTML = ''; // Clear existing rows
    sales.forEach(sale => {
        const sumBP = parseFloat(sale.buyingPrice || 0) * parseFloat(sale.number || 0);
        const sumSP = parseFloat(sale.sellingPrice || 0) * parseFloat(sale.number || 0);
        const profit = sumSP - sumBP;
        const profitPercentage = sumBP > 0 ? (profit / sumBP * 100).toFixed(2) : '0.00';

        const row = tableBodyEl.insertRow();
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="py-2 px-4">${sale.item}</td>
            <td class="py-2 px-4">${sale.number}</td>
            <td class="py-2 px-4">${formatUGX(sale.buyingPrice)}</td>
            <td class="py-2 px-4">${formatUGX(sale.sellingPrice)}</td>
            <td class="py-2 px-4">${formatUGX(sumBP)}</td>
            <td class="py-2 px-4">${formatUGX(sumSP)}</td>
            <td class="py-2 px-4">${formatUGX(profit)}</td>
            <td class="py-2 px-4">${profitPercentage}%</td>
            <td class="py-2 px-4 text-center">
                <button data-id="${sale.id}" class="edit-sale-btn text-blue-600 hover:text-blue-800 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button data-id="${sale.id}" class="delete-sale-btn text-red-600 hover:text-red-800">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
    });

    tableBodyEl.querySelectorAll('.edit-sale-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const sale = sales.find(s => s.id === id);
            if (sale) {
                openSaleModal(sale);
            }
        });
    });

    tableBodyEl.querySelectorAll('.delete-sale-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            showMessageBox('Confirm Delete', 'Are you sure you want to delete this sale?', () => deleteSale(id));
        });
    });
}

// --- Dashboard Summary Logic ---

/**
 * Updates the dashboard summary cards based on all sales and expenses.
 * @param {Array<object>} allSales - All sales records.
 * @param {Array<object>} allExpenses - All expense records.
 */
function updateDashboardSummaries(allSales = [], allExpenses = []) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    let totalTodaySales = 0;
    let totalWeeklySales = 0;
    let totalMonthlySales = 0;
    let totalOverallSales = 0;
    let totalOverallExpenses = 0;

    allSales.forEach(sale => {
        const saleDate = sale.timestamp;
        const sumSP = parseFloat(sale.sellingPrice || 0) * parseFloat(sale.number || 0);
        totalOverallSales += sumSP;

        if (saleDate >= today) {
            totalTodaySales += sumSP;
        }
        if (saleDate >= sevenDaysAgo) {
            totalWeeklySales += sumSP;
        }
        if (saleDate >= thirtyDaysAgo) {
            totalMonthlySales += sumSP;
        }
    });

    allExpenses.forEach(expense => {
        totalOverallExpenses += parseFloat(expense.amount || 0);
    });

    todaySalesEl.textContent = formatUGX(totalTodaySales);
    weeklySalesEl.textContent = formatUGX(totalWeeklySales);
    monthlySalesEl.textContent = formatUGX(totalMonthlySales);
    dashboardTotalBalanceEl.textContent = formatUGX(totalOverallSales - totalOverallExpenses);

    // Update performance for each section (basic count for now)
    const barSalesCount = allSales.filter(s => s.section === 'bar').length;
    const restaurantSalesCount = allSales.filter(s => s.section === 'restaurant').length;
    const accommodationSalesCount = allSales.filter(s => s.section === 'accommodation').length;
    const gardensSalesCount = allSales.filter(s => s.section === 'gardens').length;
    const conferenceSalesCount = allSales.filter(s => s.section === 'conference').length;

    dashboardBarPerformanceEl.textContent = `Bar: ${barSalesCount} sales`;
    dashboardAccommodationPerformanceEl.textContent = `Accommodation: ${accommodationSalesCount} sales`;
    dashboardRestaurantPerformanceEl.textContent = `Restaurant: ${restaurantSalesCount} sales`;
    dashboardGardensPerformanceEl.textContent = `Gardens: ${gardensSalesCount} sales`;
    dashboardConferencePerformanceEl.textContent = `Conference: ${conferenceSalesCount} sales`;
}

/**
 * Updates the balance for a specific section (Sales - Expenses).
 * This function will be called whenever sales or expenses for that section change.
 * @param {string} section - The section to update ('bar', 'restaurant').
 */
async function updateSectionBalance(section) {
    if (!isAuthReady) { console.warn("Auth not ready, skipping updateSectionBalance."); return; }

    const salesPath = getCollectionPath('sales');
    const expensesPath = getCollectionPath('expenses');
    if (!salesPath || !expensesPath) return;

    let totalSectionSales = 0;
    let totalSectionExpenses = 0;

    // Fetch sales for the section
    const salesSnapshot = await getDocs(query(collection(db, salesPath), where("section", "==", section)));
    salesSnapshot.forEach(doc => {
        const data = doc.data();
        totalSectionSales += parseFloat(data.sellingPrice || 0) * parseFloat(data.number || 0);
    });

    // Fetch expenses for the section
    const expensesSnapshot = await getDocs(query(collection(db, expensesPath), where("source", "==", section)));
    expensesSnapshot.forEach(doc => {
        const data = doc.data();
        totalSectionExpenses += parseFloat(data.amount || 0);
    });

    const balance = totalSectionSales - totalSectionExpenses;

    if (section === 'bar') {
        barBalanceEl.textContent = formatUGX(balance);
    } else if (section === 'restaurant') {
        restaurantBalanceEl.textContent = formatUGX(balance);
    }
    // Add more sections as needed
}


// --- Modal Event Listeners and Logic ---

/**
 * Opens the item modal for adding or editing.
 * @param {object} item - The item object if editing, null if adding.
 * @param {string} section - The section ('bar' or 'restaurant') the item belongs to.
 */
function openItemModal(item = null, section) {
    itemForm.reset();
    itemIdInput.value = '';
    itemModalTitle.textContent = 'Add Item';

    if (item) {
        itemModalTitle.textContent = 'Edit Item';
        itemIdInput.value = item.id;
        itemNameInput.value = item.name;
        itemTypeSelect.value = item.type;
        itemQuantityInput.value = item.quantity;
        itemPriceInput.value = item.price;
    }
    // Store the section in a data attribute on the form for submission
    itemForm.dataset.section = section;
    showModal(itemModal);
}

addItemBtnBar.addEventListener('click', () => openItemModal(null, 'bar'));
addItemBtnRestaurant.addEventListener('click', () => openItemModal(null, 'restaurant'));
cancelItemBtn.addEventListener('click', () => hideModal(itemModal));

itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = itemIdInput.value;
    const section = itemForm.dataset.section; // Get section from data attribute
    const itemData = {
        name: itemNameInput.value,
        type: itemTypeSelect.value,
        quantity: parseInt(itemQuantityInput.value),
        price: parseFloat(itemPriceInput.value),
    };

    if (id) {
        await updateItem(id, itemData);
    } else {
        await addItem(itemData, section);
    }
    hideModal(itemModal);
});


/**
 * Opens the expense modal for adding or editing.
 * @param {object} expense - The expense object if editing, null if adding.
 */
function openExpenseModal(expense = null) {
    expenseForm.reset();
    expenseIdInput.value = '';
    expenseModalTitle.textContent = 'Add Expense';

    if (expense) {
        expenseModalTitle.textContent = 'Edit Expense';
        expenseIdInput.value = expense.id;
        expenseDescriptionInput.value = expense.description;
        expenseAmountInput.value = expense.amount;
        expenseReceiptInput.value = expense.receiptId || '';
        expenseSourceSelect.value = expense.source;
        expenseResponsibleInput.value = expense.responsible;
    }
    showModal(expenseModal);
}

addExpenseBtnBar.addEventListener('click', () => openExpenseModal(null));
addExpenseBtnRestaurant.addEventListener('click', () => openExpenseModal(null));
cancelExpenseBtn.addEventListener('click', () => hideModal(expenseModal));

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = expenseIdInput.value;
    const expenseData = {
        description: expenseDescriptionInput.value,
        amount: parseFloat(expenseAmountInput.value),
        receiptId: expenseReceiptInput.value,
        source: expenseSourceSelect.value,
        responsible: expenseResponsibleInput.value,
    };

    if (id) {
        await updateExpense(id, expenseData);
    } else {
        await addExpense(expenseData);
    }
    hideModal(expenseModal);
});

/**
 * Opens the sale modal for adding or editing.
 * @param {object} sale - The sale object if editing, null if adding.
 */
function openSaleModal(sale = null) {
    saleForm.reset();
    saleIdInput.value = '';
    salesModalTitle.textContent = 'Add Sale';

    if (sale) {
        salesModalTitle.textContent = 'Edit Sale';
        saleIdInput.value = sale.id;
        saleItemInput.value = sale.item;
        saleNumberInput.value = sale.number;
        saleBuyingPriceInput.value = sale.buyingPrice;
        saleSellingPriceInput.value = sale.sellingPrice;
        saleReceiptIdInput.value = sale.receiptId || '';
        saleResponsibleInput.value = sale.responsible;
    }
    showModal(salesModal);
}

addSaleBtnBar.addEventListener('click', () => openSaleModal(null));
addSaleBtnRestaurant.addEventListener('click', () => openSaleModal(null));
cancelSaleBtn.addEventListener('click', () => hideModal(salesModal));

saleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = saleIdInput.value;
    // Determine the section based on which button was clicked or current active section
    // For simplicity, we'll assume the current active section for now.
    // A more robust solution would pass the section from the button click event.
    const activeSectionElement = document.querySelector('.page-content:not(.hidden)');
    const section = activeSectionElement ? activeSectionElement.id : 'unknown';

    const saleData = {
        item: saleItemInput.value,
        number: parseInt(saleNumberInput.value),
        buyingPrice: parseFloat(saleBuyingPriceInput.value),
        sellingPrice: parseFloat(saleSellingPriceInput.value),
        receiptId: saleReceiptIdInput.value,
        responsible: saleResponsibleInput.value,
    };

    if (id) {
        await updateSale(id, saleData);
    } else {
        await addSale(saleData, section);
    }
    hideModal(salesModal);
});

// Cash Management Forms
cashFormBar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cashRecordData = {
        cashAtHand: parseFloat(cashAtHandBar.value || 0),
        cashBanked: parseFloat(cashBankedBar.value || 0),
        bankedReceiptId: bankedReceiptIdBar.value,
        responsiblePerson: responsiblePersonBar.value,
    };
    await saveCashRecord(cashRecordData, 'bar');
    cashFormBar.reset();
});

cashFormRestaurant.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cashRecordData = {
        cashAtHand: parseFloat(cashAtHandRestaurant.value || 0),
        cashBanked: parseFloat(cashBankedRestaurant.value || 0),
        bankedReceiptId: bankedReceiptIdRestaurant.value,
        responsiblePerson: responsiblePersonRestaurant.value,
    };
    await saveCashRecord(cashRecordData, 'restaurant');
    cashFormRestaurant.reset();
});


// --- Date Filtering Logic ---
dateFilterBar.addEventListener('change', (e) => {
    const selectedDate = e.target.value; // YYYY-MM-DD
    getExpenses('bar', expensesTableBodyBar, barTotalExpensesEl, selectedDate);
    getSales('bar', salesTableBodyBar, barTotalSalesEl, selectedDate);
});

dateFilterRestaurant.addEventListener('change', (e) => {
    const selectedDate = e.target.value; // YYYY-MM-DD
    getExpenses('restaurant', expensesTableBodyRestaurant, restaurantTotalExpensesEl, selectedDate);
    getSales('restaurant', salesTableBodyRestaurant, restaurantTotalSalesEl, selectedDate);
});


// --- Low Stock Notification Logic ---
const LOW_STOCK_THRESHOLD = 10; // Define your low stock threshold

/**
 * Checks inventory items for low stock and displays a notification.
 * @param {Array<object>} items - Array of inventory items.
 */
function checkLowStock(items) {
    const lowStockItems = items.filter(item => item.quantity <= LOW_STOCK_THRESHOLD);
    if (lowStockItems.length > 0) {
        const message = `Low stock alert! ${lowStockItems.map(item => item.name).join(', ')} need restocking.`;
        lowStockMessage.textContent = message;
        lowStockNotification.classList.remove('hidden');
    } else {
        lowStockNotification.classList.add('hidden');
    }
}

// --- Initial Data Loading ---
function loadInitialData() {
    // Load data for the default active section (Dashboard)
    getAllSalesAndExpensesForDashboard();
    // Set today's date for date filters
    const today = new Date().toISOString().split('T')[0];
    dateFilterBar.value = today;
    dateFilterRestaurant.value = today;

    // Load data for Bar and Restaurant sections
    getInventory('bar', inventoryTableBodyBar);
    getExpenses('bar', expensesTableBodyBar, barTotalExpensesEl, today);
    getSales('bar', salesTableBodyBar, barTotalSalesEl, today);

    getInventory('restaurant', inventoryTableBodyRestaurant);
    getExpenses('restaurant', expensesTableBodyRestaurant, restaurantTotalExpensesEl, today);
    getSales('restaurant', salesTableBodyRestaurant, restaurantTotalSalesEl, today);

    // Activate the default dashboard view
    activateSection('dashboard');
}

// Custom message box for confirmation (replaces window.confirm)
// This function needs to be globally accessible or attached to window
window.showMessageBox = function(title, message, onConfirm = null) {
    const messageBox = document.createElement('div');
    messageBox.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    messageBox.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <h3 class="text-xl font-bold mb-4">${title}</h3>
            <p class="mb-6">${message}</p>
            <div class="flex justify-center space-x-4">
                <button class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400" onclick="this.parentNode.parentNode.parentNode.remove()">Cancel</button>
                <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600" id="confirm-action-btn">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(messageBox);

    const confirmBtn = messageBox.querySelector('#confirm-action-btn');
    confirmBtn.onclick = () => {
        if (onConfirm) {
            onConfirm();
        }
        messageBox.remove();
    };
};


