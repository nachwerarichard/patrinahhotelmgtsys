 
        const API_BASE_URL = 'https://patrinahhotelmgtsys.onrender.com';
        let authToken = localStorage.getItem('authToken') || '';
        let currentUsername = localStorage.getItem('username') || '';
        let currentUserRole = localStorage.getItem('userRole') || '';

        // --- Utility Functions ---

        /**
         * Applies specific UI restrictions for 'bar_staff' role in Sales and Expenses sections.
         * Hides headings, filters, and tables, showing only the forms.
         * @param {string} sectionId The ID of the currently active section.
         */
        function applyBarStaffUIRestrictions(sectionId) {
            if (currentUserRole === 'bar_staff') {
                if (sectionId === 'sales') {
                    document.querySelector('.sales-records-heading').style.display = 'none';
                    document.querySelector('.sales-filter-controls').style.display = 'none';
                    document.getElementById('sales-table').style.display = 'none';
                } else {
                    // Ensure these are visible if not in sales section (e.g., if admin switches to sales)
                    document.querySelector('.sales-records-heading').style.display = 'block';
                    document.querySelector('.sales-filter-controls').style.display = 'flex'; // Use flex for filter controls
                    document.getElementById('sales-table').style.display = 'table';
                }

                if (sectionId === 'expenses') {
                    document.querySelector('.expenses-records-heading').style.display = 'none';
                    document.querySelector('.expenses-filter-controls').style.display = 'none';
                    document.getElementById('expenses-table').style.display = 'none';
                } else {
                    // Ensure these are visible if not in expenses section
                    document.querySelector('.expenses-records-heading').style.display = 'block';
                    document.querySelector('.expenses-filter-controls').style.display = 'flex'; // Use flex for filter controls
                    document.getElementById('expenses-table').style.display = 'table';
                }
            } else {
                // For admin or other roles, ensure all elements are visible in sales/expenses sections
                if (document.querySelector('.sales-records-heading')) {
                    document.querySelector('.sales-records-heading').style.display = 'block';
                    document.querySelector('.sales-filter-controls').style.display = 'flex';
                    document.getElementById('sales-table').style.display = 'table';
                }
                if (document.querySelector('.expenses-records-heading')) {
                    document.querySelector('.expenses-records-heading').style.display = 'block';
                    document.querySelector('.expenses-filter-controls').style.display = 'flex';
                    document.getElementById('expenses-table').style.display = 'table';
                }
            }
        }


        /**
         * Updates the display of the current logged-in user and manages navigation button visibility.
         * Ensures the login form is hidden on success and sets nav button visibility based on role.
         */
        function updateUIForUserRole() {
            const userDisplay = document.getElementById('current-user-display');
            const mainContent = document.getElementById('main-content');
            const loginSection = document.getElementById('login-section');
            const navButtons = document.querySelectorAll('nav button');

            if (authToken && currentUsername && currentUserRole) {
                userDisplay.textContent = `Logged in as: ${currentUsername} (${currentUserRole})`;
                
                // --- Hide Login Section, Show Main Content ---
                loginSection.style.display = 'none';
                loginSection.classList.remove('active'); // Ensure active class is removed for CSS rules
                mainContent.style.display = 'block';
                
                // --- Manage Navigation Button Visibility based on role ---
                navButtons.forEach(button => {
                    button.style.display = 'none'; // Hide all buttons by default
                });

                if (currentUserRole === 'admin') {
                    // Admins see all buttons
                    navButtons.forEach(button => {
                        button.style.display = 'inline-block';
                    });
                } else if (currentUserRole === 'bar_staff') {
                    // Bar staff ONLY see Sales and Expenses
                    document.getElementById('nav-sales').style.display = 'inline-block';
                    document.getElementById('nav-expenses').style.display = 'inline-block';
                }

                // Show default section based on role
                if (currentUserRole === 'admin') {
                    showSection('inventory'); // Admins start with inventory
                } else if (currentUserRole === 'bar_staff') {
                    showSection('sales'); // Bar staff start with sales
                }

            } else {
                // Not logged in: Show login section, hide main content
                userDisplay.textContent = '';
                mainContent.style.display = 'none';
                loginSection.style.display = 'block';
                loginSection.classList.add('active'); // Ensure active class is added for CSS rules
            }
        }


        /**
         * Hides all sections and shows the specified one.
         * Includes role-based access checks and special handling for bar staff sales view.
         * @param {string} sectionId The ID of the section to show.
         */
        function showSection(sectionId) {
            // Define which sections are allowed for each role
            const allowedSections = {
                'admin': ['inventory', 'sales', 'expenses', 'cash-management', 'reports', 'audit-logs'],
                'bar_staff': ['sales', 'expenses']
            };

            // --- Role-based Access Check ---
            if (currentUserRole && !allowedSections[currentUserRole].includes(sectionId)) {
                alert('Access Denied: You do not have permission to view this section.');
                // Redirect to a default allowed section if trying to access unauthorized
                if (currentUserRole === 'admin') {
                    showSection('inventory'); // Admin default
                } else if (currentUserRole === 'bar_staff') {
                    showSection('sales'); // Bar staff default
                }
                return; // Prevent further execution for unauthorized access
            }

            // --- Show/Hide Sections ---
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`${sectionId}-section`).classList.add('active');

            // --- Apply Bar Staff UI Restrictions (Headings, Filters, Tables) ---
            applyBarStaffUIRestrictions(sectionId);


            // --- Fetch Data based on Section and Role ---
            if (sectionId === 'inventory') {
                fetchInventory();
            } else if (sectionId === 'sales') {
                if (currentUserRole === 'bar_staff') {
                    // For bar staff, clear the table and show a message to prompt filtering.
                    // Data will only load if they explicitly use the form or if fetchSales is called by another means.
                    document.querySelector('#sales-table tbody').innerHTML = '<tr><td colspan="6" style="text-align: center; color: #555;">Use the form above to record a new sale.</td></tr>';
                    // Ensure the date filter is set to today for convenience if they click "Apply Filters" (though filters are hidden)
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    document.getElementById('sales-date-filter').value = `${yyyy}-${mm}-${dd}`;
                } else {
                    // For admin or other roles, auto-fetch sales
                    fetchSales();
                }
            } else if (sectionId === 'expenses') {
                if (currentUserRole === 'bar_staff') {
                    // For bar staff, clear the table and show a message to prompt recording.
                    document.querySelector('#expenses-table tbody').innerHTML = '<tr><td colspan="7" style="text-align: center; color: #555;">Use the form above to record a new expense.</td></tr>';
                    // Ensure the date filter is set to today for convenience
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    document.getElementById('expenses-date-filter').value = `${yyyy}-${mm}-${dd}`;
                } else {
                    // For admin or other roles, auto-fetch expenses
                    fetchExpenses();
                }
            } else if (sectionId === 'cash-management') {
                // Set default date for new entry and filter
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const todayString = `${yyyy}-${mm}-${dd}`;
                document.getElementById('cash-date').value = todayString; // For the form
                document.getElementById('cash-filter-date').value = todayString; // For the filter
                fetchCashJournal();
            } else if (sectionId === 'reports') {
                // Set default dates for reports (last 30 days)
                const today = new Date();
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);

                const startInput = document.getElementById('report-start-date');
                const endInput = document.getElementById('report-end-date');

                if (!startInput.value) {
                    startInput.value = thirtyDaysAgo.toISOString().split('T')[0];
                }
                if (!endInput.value) {
                    endInput.value = today.toISOString().split('T')[0];
                }
                generateReports();
            } else if (sectionId === 'audit-logs') {
                // Role check for audit logs already handled at the top of this function
                fetchAuditLogs();
            }
        }

        /**
         * Wrapper for fetch API to include authentication header and handle common errors.
         * @param {string} url The URL to fetch.
         * @param {object} options Fetch options (method, headers, body, etc.).
         * @returns {Promise<Response|null>} The fetch Response object or null if authentication fails.
         */
        async function authenticatedFetch(url, options = {}) {
            if (!authToken) {
                alert('You are not logged in. Please log in first.');
                logout();
                return null;
            }

            options.headers = {
                ...options.headers,
                'Authorization': `Basic ${authToken}`,
                'Content-Type': 'application/json'
            };

            try {
                const response = await fetch(url, options);

                if (response.status === 401 || response.status === 403) {
                    const errorData = await response.json();
                    alert(`Access Denied: ${errorData.error || 'Invalid credentials or insufficient permissions.'}`);
                    logout(); // Force logout on auth/authz failure
                    return null;
                }
                if (!response.ok && response.status !== 204) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
                }
                return response;
            } catch (error) {
                console.error('Network or fetch error:', error);
                alert('Could not connect to the server or process request: ' + error.message);
                return null;
            }
        }

        // --- Login/Logout ---
        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const loginMessage = document.getElementById('login-message');

            loginMessage.textContent = 'Logging in...';

            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    // For hardcoded auth, the token is derived from the plain credentials
                    authToken = btoa(`${username}:${password}`); 
                    currentUsername = data.username;
                    currentUserRole = data.role;

                    localStorage.setItem('authToken', authToken);
                    localStorage.setItem('username', currentUsername);
                    localStorage.setItem('userRole', currentUserRole);

                    loginMessage.textContent = '';
                    updateUIForUserRole(); // Update UI based on new role
                    
                } else {
                    const errorData = await response.json();
                    loginMessage.textContent = errorData.error || 'Invalid username or password.';
                    authToken = '';
                    currentUsername = '';
                    currentUserRole = '';
                    localStorage.clear();
                }
            } catch (error) {
                console.error('Login error:', error);
                loginMessage.textContent = 'Network error or server unavailable.';
                authToken = '';
                currentUsername = '';
                currentUserRole = '';
                localStorage.clear();
            }
        }

        async function logout() {
            try {
                // Optionally notify backend of logout for audit logging
                await authenticatedFetch(`${API_BASE_URL}/logout`, { method: 'POST' });
            } catch (error) {
                console.warn('Error notifying backend of logout:', error);
                // Continue with logout even if backend notification fails
            }

            authToken = '';
            currentUsername = '';
            currentUserRole = '';
            localStorage.clear(); // Clear all stored user data
            updateUIForUserRole(); // Reset UI to login state
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('login-message').textContent = '';
        }

        // --- Inventory Functions ---
        async function fetchInventory() {
            try {
                const itemFilter = document.getElementById('search-inventory-item').value;
                const lowFilter = document.getElementById('search-inventory-low').value;

                let url = `${API_BASE_URL}/inventory`;
                const params = new URLSearchParams();
                if (itemFilter) params.append('item', itemFilter);
                if (lowFilter) params.append('low', lowFilter);

                if (params.toString()) {
                    url += `?${params.toString()}`;
                }

                const response = await authenticatedFetch(url);
                if (!response) return;
                const inventory = await response.json();
                renderInventoryTable(inventory);
            } catch (error) {
                console.error('Error fetching inventory:', error);
                alert('Failed to fetch inventory: ' + error.message);
            }
        }

        function renderInventoryTable(inventory) {
            const tbody = document.querySelector('#inventory-table tbody');
            tbody.innerHTML = '';
            if (inventory.length === 0) {
                const row = tbody.insertRow();
                row.insertCell().colSpan = 7;
                row.insertCell().textContent = 'No inventory items found.';
                return;
            }

            inventory.forEach(item => {
                const row = tbody.insertRow();
                row.insertCell().textContent = item.item;
                row.insertCell().textContent = item.opening;
                row.insertCell().textContent = item.purchases;
                row.insertCell().textContent = item.sales;
                row.insertCell().textContent = item.spoilage;
                row.insertCell().textContent = item.closing;
                const actionsCell = row.insertCell();
                actionsCell.className = 'actions';

                if (currentUserRole === 'admin') { // Admin can edit/delete
                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit';
                    editButton.className = 'edit';
                    editButton.onclick = () => populateInventoryForm(item);
                    actionsCell.appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.className = 'delete';
                    deleteButton.onclick = () => deleteInventory(item._id);
                    actionsCell.appendChild(deleteButton);
                } else {
                    actionsCell.textContent = 'View Only';
                }
            });
        }

        async function submitInventoryForm(event) {
            event.preventDefault();
            if (currentUserRole !== 'admin') {
                alert('Permission Denied: Only administrators can add/update inventory.');
                return;
            }
            const id = document.getElementById('inventory-id').value;
            const item = document.getElementById('item').value;
            const opening = parseInt(document.getElementById('opening').value);
            const purchases = parseInt(document.getElementById('purchases').value);
            const sales = parseInt(document.getElementById('inventory-sales').value);
            const spoilage = parseInt(document.getElementById('spoilage').value);

            const inventoryData = { item, opening, purchases, sales, spoilage };

            try {
                let response;
                if (id) {
                    response = await authenticatedFetch(`${API_BASE_URL}/inventory/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(inventoryData)
                    });
                } else {
                    response = await authenticatedFetch(`${API_BASE_URL}/inventory`, {
                        method: 'POST',
                        body: JSON.stringify(inventoryData)
                    });
                }
                if (response) {
                    await response.json();
                    alert('Inventory item saved successfully!');
                    document.getElementById('inventory-form').reset();
                    document.getElementById('inventory-id').value = '';
                    fetchInventory();
                }
            } catch (error) {
                console.error('Error saving inventory item:', error);
                alert('Failed to save inventory item: ' + error.message);
            }
        }

        function populateInventoryForm(item) {
            document.getElementById('inventory-id').value = item._id;
            document.getElementById('item').value = item.item;
            document.getElementById('opening').value = item.opening;
            document.getElementById('purchases').value = item.purchases;
            document.getElementById('inventory-sales').value = item.sales;
            document.getElementById('spoilage').value = item.spoilage;
        }

        async function deleteInventory(id) {
            if (currentUserRole !== 'admin') {
                alert('Permission Denied: Only administrators can delete inventory.');
                return;
            }
            if (!confirm('Are you sure you want to delete this inventory item?')) return;
            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/inventory/${id}`, {
                    method: 'DELETE'
                });
                if (response && response.status === 204) {
                    alert('Inventory item deleted successfully!');
                    fetchInventory();
                } else if (response) {
                     const errorData = await response.json();
                     alert('Failed to delete inventory item: ' + errorData.error);
                }
            } catch (error) {
                console.error('Error deleting inventory item:', error);
                alert('Failed to delete inventory item: ' + error.message);
            }
        }

        // --- Sales Functions ---
        async function fetchSales() {
            try {
                const dateFilter = document.getElementById('sales-date-filter').value;
                let url = `${API_BASE_URL}/sales`;
                if (dateFilter) {
                    url += `?date=${dateFilter}`;
                }

                const response = await authenticatedFetch(url);
                if (!response) return;
                const sales = await response.json();
                renderSalesTable(sales);
            } catch (error) {
                console.error('Error fetching sales:', error);
                alert('Failed to fetch sales: ' + error.message);
            }
        }

        function renderSalesTable(sales) {
            const tbody = document.querySelector('#sales-table tbody');
            // Only render table if not bar_staff, as per new requirement
            if (currentUserRole === 'bar_staff') {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #555;">Use the form above to record a new sale.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            if (sales.length === 0) {
                const row = tbody.insertRow();
                row.insertCell().colSpan = 6;
                row.insertCell().textContent = 'No sales records found for this date. Try adjusting the filter.';
                return;
            }

            sales.forEach(sale => {
                const row = tbody.insertRow();
                row.insertCell().textContent = sale.item;
                row.insertCell().textContent = sale.number;
                row.insertCell().textContent = sale.bp;
                row.insertCell().textContent = sale.sp;
                row.insertCell().textContent = new Date(sale.date).toLocaleDateString();
                const actionsCell = row.insertCell();
                actionsCell.className = 'actions';

                if (currentUserRole === 'admin') { // Admin can edit/delete
                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit';
                    editButton.className = 'edit';
                    editButton.onclick = () => populateSaleForm(sale);
                    actionsCell.appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.className = 'delete';
                    deleteButton.onclick = () => deleteSale(sale._id);
                    actionsCell.appendChild(deleteButton);
                } else {
                    actionsCell.textContent = 'View Only';
                }
            });
        }

        async function submitSaleForm(event) {
            event.preventDefault();
            if (currentUserRole !== 'admin' && currentUserRole !== 'bar_staff') {
                alert('Permission Denied: You do not have permission to record sales.');
                return;
            }
            const id = document.getElementById('sale-id').value;
            const item = document.getElementById('sale-item').value;
            const number = parseInt(document.getElementById('sale-number').value);
            const bp = parseFloat(document.getElementById('sale-bp').value);
            const sp = parseFloat(document.getElementById('sale-sp').value);

            const saleData = { item, number, bp, sp };

            try {
                let response;
                if (id) { // Edit operation (Admin only)
                    if (currentUserRole !== 'admin') {
                        alert('Permission Denied: Only administrators can edit sales.');
                        return;
                    }
                    response = await authenticatedFetch(`${API_BASE_URL}/sales/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(saleData)
                    });
                } else { // New sale creation (Admin or Bar Staff)
                    response = await authenticatedFetch(`${API_BASE_URL}/sales`, {
                        method: 'POST',
                        body: JSON.stringify(saleData)
                    });
                }
                if (response) {
                    await response.json();
                    alert('Sale recorded successfully!');
                    document.getElementById('sale-form').reset();
                    document.getElementById('sale-id').value = '';
                    fetchSales(); // Re-fetch to update table after successful operation
                }
            } catch (error) {
                console.error('Error recording sale:', error);
                alert('Failed to record sale: ' + error.message);
            }
        }

        function populateSaleForm(sale) {
            document.getElementById('sale-id').value = sale._id;
            document.getElementById('sale-item').value = sale.item;
            document.getElementById('sale-number').value = sale.number;
            document.getElementById('sale-bp').value = sale.bp;
            document.getElementById('sale-sp').value = sale.sp;
        }

        async function deleteSale(id) {
            if (currentUserRole !== 'admin') {
                alert('Permission Denied: Only administrators can delete sales.');
                return;
            }
            if (!confirm('Are you sure you want to delete this sale record?')) return;
            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/sales/${id}`, {
                    method: 'DELETE'
                });
                if (response && response.status === 204) {
                    alert('Sale record deleted successfully!');
                    fetchSales(); // Re-fetch to update table after successful operation
                } else if (response) {
                    const errorData = await response.json();
                    alert('Failed to delete sale record: ' + errorData.error);
                }
            } catch (error) {
                console.error('Error deleting sale record:', error);
                alert('Failed to delete sale record: ' + error.message);
            }
        }

        // --- Expenses Functions ---
        async function fetchExpenses() {
            try {
                const dateFilter = document.getElementById('expenses-date-filter').value;
                let url = `${API_BASE_URL}/expenses`;
                if (dateFilter) {
                    url += `?date=${dateFilter}`;
                }

                const response = await authenticatedFetch(url);
                if (!response) return;
                const expenses = await response.json();
                renderExpensesTable(expenses);
            } catch (error) {
                console.error('Error fetching expenses:', error);
                alert('Failed to fetch expenses: ' + error.message);
            }
        }

        function renderExpensesTable(expenses) {
            const tbody = document.querySelector('#expenses-table tbody');
            // Only render table if not bar_staff, as per new requirement
            if (currentUserRole === 'bar_staff') {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #555;">Use the form above to record a new expense.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            if (expenses.length === 0) {
                const row = tbody.insertRow();
                row.insertCell().colSpan = 7;
                row.insertCell().textContent = 'No expense records found for this date. Try adjusting the filter.';
                return;
            }

            expenses.forEach(expense => {
                const row = tbody.insertRow();
                row.insertCell().textContent = expense.description;
                row.insertCell().textContent = expense.amount;
                row.insertCell().textContent = new Date(expense.date).toLocaleDateString();
                row.insertCell().textContent = expense.receiptId || 'N/A';
                row.insertCell().textContent = expense.source || 'N/A';
                row.insertCell().textContent = expense.responsible || 'N/A';
                const actionsCell = row.insertCell();
                actionsCell.className = 'actions';

                if (currentUserRole === 'admin') { // Admin can edit/delete
                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit';
                    editButton.className = 'edit';
                    editButton.onclick = () => populateExpenseForm(expense);
                    actionsCell.appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.className = 'delete';
                    deleteButton.onclick = () => deleteExpense(expense._id);
                    actionsCell.appendChild(deleteButton);
                } else {
                    actionsCell.textContent = 'View Only';
                }
            });
        }

        async function submitExpenseForm(event) {
            event.preventDefault();
            if (currentUserRole !== 'admin' && currentUserRole !== 'bar_staff') {
                alert('Permission Denied: You do not have permission to record expenses.');
                return;
            }
            const id = document.getElementById('expense-id').value;
            const description = document.getElementById('expense-description').value;
            const amount = parseFloat(document.getElementById('expense-amount').value);
            const receiptId = document.getElementById('expense-receiptId').value;
            const source = document.getElementById('expense-source').value;
            const responsible = document.getElementById('expense-responsible').value;

            const expenseData = { description, amount, receiptId, source, responsible };

            try {
                let response;
                if (id) { // Edit operation (Admin only)
                    if (currentUserRole !== 'admin') {
                        alert('Permission Denied: Only administrators can edit expenses.');
                        return;
                    }
                    response = await authenticatedFetch(`${API_BASE_URL}/expenses/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(expenseData)
                    });
                } else { // New expense creation (Admin or Bar Staff)
                    response = await authenticatedFetch(`${API_BASE_URL}/expenses`, {
                        method: 'POST',
                        body: JSON.stringify(expenseData)
                    });
                }
                if (response) {
                    await response.json();
                    alert('Expense recorded successfully!');
                    document.getElementById('expense-form').reset();
                    document.getElementById('expense-id').value = '';
                    fetchExpenses(); // Re-fetch to update table after successful operation
                }
            } catch (error) {
                console.error('Error recording expense:', error);
                alert('Failed to record expense: ' + error.message);
            }
        }

        function populateExpenseForm(expense) {
            document.getElementById('expense-id').value = expense._id;
            document.getElementById('expense-description').value = expense.description;
            document.getElementById('expense-amount').value = expense.amount;
            document.getElementById('expense-receiptId').value = expense.receiptId || '';
            document.getElementById('expense-source').value = expense.source || '';
            document.getElementById('expense-responsible').value = expense.responsible || '';
        }

        async function deleteExpense(id) {
            if (currentUserRole !== 'admin') {
                alert('Permission Denied: Only administrators can delete expenses.');
                return;
            }
            if (!confirm('Are you sure you want to delete this expense record?')) return;
            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/expenses/${id}`, {
                    method: 'DELETE'
                });
                if (response && response.status === 204) {
                    alert('Expense record deleted successfully!');
                    fetchExpenses(); // Re-fetch to update table after successful operation
                } else if (response) {
                    const errorData = await response.json();
                    alert('Failed to delete expense record: ' + errorData.error);
                }
            } catch (error) {
                console.error('Error deleting expense record:', error);
                alert('Failed to delete expense record: ' + error.message);
            }
        }

        // --- Cash Management Functions ---
        async function fetchCashJournal() {
            try {
                const dateFilter = document.getElementById('cash-filter-date').value;
                const responsibleFilter = document.getElementById('cash-filter-responsible').value;

                let url = `${API_BASE_URL}/cash-journal`;
                const params = new URLSearchParams();
                if (dateFilter) params.append('date', dateFilter);
                if (responsibleFilter) params.append('responsiblePerson', responsibleFilter);

                if (params.toString()) {
                    url += `?${params.toString()}`;
                }

                const response = await authenticatedFetch(url);
                if (!response) return;
                const records = await response.json();
                renderCashJournalTable(records);
            } catch (error) {
                console.error('Error fetching cash journal:', error);
                alert('Failed to fetch cash journal: ' + error.message);
            }
        }

        function renderCashJournalTable(records) {
            const tbody = document.querySelector('#cash-journal-table tbody');
            tbody.innerHTML = '';
            if (records.length === 0) {
                const row = tbody.insertRow();
                row.insertCell().colSpan = 6;
                row.insertCell().textContent = 'No cash records found for the selected filters.';
                return;
            }

            records.forEach(record => {
                const row = tbody.insertRow();
                row.insertCell().textContent = new Date(record.date).toLocaleDateString();
                row.insertCell().textContent = record.cashAtHand.toFixed(2);
                row.insertCell().textContent = record.cashBanked.toFixed(2);
                row.insertCell().textContent = record.bankReceiptId;
                row.insertCell().textContent = record.responsiblePerson;
                const actionsCell = row.insertCell();
                actionsCell.className = 'actions';

                if (currentUserRole === 'admin') { // Admin can edit/delete
                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit';
                    editButton.className = 'edit';
                    editButton.onclick = () => populateCashJournalForm(record);
                    actionsCell.appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.className = 'delete';
                    deleteButton.onclick = () => deleteCashJournal(record._id);
                    actionsCell.appendChild(deleteButton);
                } else {
                    actionsCell.textContent = 'View Only';
                }
            });
        }

        async function submitCashJournalForm(event) {
            event.preventDefault();
            if (currentUserRole !== 'admin' && currentUserRole !== 'bar_staff') {
                alert('Permission Denied: You do not have permission to record cash entries.');
                return;
            }
            const id = document.getElementById('cash-journal-id').value;
            const cashAtHand = parseFloat(document.getElementById('cash-at-hand').value);
            const cashBanked = parseFloat(document.getElementById('cash-banked').value);
            const bankReceiptId = document.getElementById('bank-receipt-id').value;
            const responsiblePerson = document.getElementById('responsible-person').value;
            const date = document.getElementById('cash-date').value;

            const cashData = { cashAtHand, cashBanked, bankReceiptId, responsiblePerson, date };

            try {
                let response;
                if (id) { // Edit operation (Admin only)
                    if (currentUserRole !== 'admin') {
                        alert('Permission Denied: Only administrators can edit cash entries.');
                        return;
                    }
                    response = await authenticatedFetch(`${API_BASE_URL}/cash-journal/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(cashData)
                    });
                } else { // New entry creation (Admin or Bar Staff)
                    response = await authenticatedFetch(`${API_BASE_URL}/cash-journal`, {
                        method: 'POST',
                        body: JSON.stringify(cashData)
                    });
                }
                if (response) {
                    await response.json();
                    alert('Cash entry saved successfully!');
                    document.getElementById('cash-journal-form').reset();
                    document.getElementById('cash-journal-id').value = '';
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    document.getElementById('cash-date').value = `${yyyy}-${mm}-${dd}`;
                    fetchCashJournal(); // Re-fetch to update table after successful operation
                }
            } catch (error) {
                console.error('Error saving cash entry:', error);
                alert('Failed to save cash entry: ' + error.message);
            }
        }

        function populateCashJournalForm(record) {
            document.getElementById('cash-journal-id').value = record._id;
            document.getElementById('cash-at-hand').value = record.cashAtHand;
            document.getElementById('cash-banked').value = record.cashBanked;
            document.getElementById('bank-receipt-id').value = record.bankReceiptId;
            document.getElementById('responsible-person').value = record.responsiblePerson;
            document.getElementById('cash-date').value = new Date(record.date).toISOString().split('T')[0];
        }

        async function deleteCashJournal(id) {
            if (currentUserRole !== 'admin') {
                alert('Permission Denied: Only administrators can delete cash entries.');
                return;
            }
            if (!confirm('Are you sure you want to delete this cash journal entry?')) return;
            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/cash-journal/${id}`, {
                    method: 'DELETE'
                });
                if (response && response.status === 204) {
                    alert('Cash entry deleted successfully!');
                    fetchCashJournal(); // Re-fetch to update table after successful operation
                } else if (response) {
                    const errorData = await response.json();
                    alert('Failed to delete cash entry: ' + errorData.error);
                }
            } catch (error) {
                console.error('Error deleting cash entry:', error);
                alert('Failed to delete cash entry: ' + error.message);
            }
        }

        // --- Reports Functions ---
        function getDepartmentFromText(text) {
            const lowerText = text.toLowerCase();
            if (lowerText.startsWith('bar-') || lowerText.includes('bar ')) return 'Bar';
            if (lowerText.startsWith('rest-') || lowerText.includes('restaurant')) return 'Restaurant';
            if (lowerText.startsWith('conf-') || lowerText.includes('conference')) return 'Conference';
            if (lowerText.startsWith('grdn-') || lowerText.includes('garden')) return 'Gardens';
            if (lowerText.startsWith('accomm-') || lowerText.includes('accommodation') || lowerText.includes('room')) return 'Accommodation';
            return 'Other';
        }

        async function generateReports() {
            const startDateString = document.getElementById('report-start-date').value;
            const endDateString = document.getElementById('report-end-date').value;

            if (!startDateString || !endDateString) {
                alert('Please select both start and end dates for the reports.');
                return;
            }

            const startDate = new Date(startDateString);
            const endDate = new Date(endDateString);
            endDate.setHours(23, 59, 59, 999); // Set to end of day

            let allSales = [];
            let allExpenses = [];

            try {
                // Fetch all sales and expenses and filter client-side for the report range
                const salesResponse = await authenticatedFetch(`${API_BASE_URL}/sales`);
                if (salesResponse) {
                    const salesData = await salesResponse.json();
                    allSales = salesData.filter(s => {
                        const saleDate = new Date(s.date);
                        return saleDate >= startDate && saleDate <= endDate;
                    });
                }

                const expensesResponse = await authenticatedFetch(`${API_BASE_URL}/expenses`);
                if (expensesResponse) {
                    const expensesData = await expensesResponse.json();
                    allExpenses = expensesData.filter(e => {
                        const expenseDate = new Date(e.date);
                        return expenseDate >= startDate && expenseDate <= endDate;
                    });
                }

                const departmentReports = {};
                let overallSales = 0;
                let overallExpenses = 0;

                allSales.forEach(sale => {
                    const department = getDepartmentFromText(sale.item);
                    const saleAmount = sale.number * sale.sp;
                    
                    overallSales += saleAmount;
                    if (!departmentReports[department]) {
                        departmentReports[department] = { sales: 0, expenses: 0 };
                    }
                    departmentReports[department].sales += saleAmount;
                });

                allExpenses.forEach(expense => {
                    const department = getDepartmentFromText(expense.description + ' ' + (expense.source || ''));
                    
                    overallExpenses += expense.amount;
                    if (!departmentReports[department]) {
                        departmentReports[department] = { sales: 0, expenses: 0 };
                    }
                    departmentReports[department].expenses += expense.amount;
                });

                document.getElementById('overall-sales').textContent = overallSales.toFixed(2);
                document.getElementById('overall-expenses').textContent = overallExpenses.toFixed(2);
                document.getElementById('overall-balance').textContent = (overallSales - overallExpenses).toFixed(2);

                const tbody = document.querySelector('#departmental-reports-table tbody');
                tbody.innerHTML = '';

                const sortedDepartments = Object.keys(departmentReports).sort();

                if (sortedDepartments.length === 0) {
                    const row = tbody.insertRow();
                    row.insertCell().colSpan = 4;
                    row.insertCell().textContent = 'No data found for the selected period or departments.';
                } else {
                    sortedDepartments.forEach(dept => {
                        const data = departmentReports[dept];
                        const deptSales = data.sales;
                        const deptExpenses = data.expenses;
                        const deptBalance = deptSales - deptExpenses;

                        const row = tbody.insertRow();
                        row.insertCell().textContent = dept;
                        row.insertCell().textContent = deptSales.toFixed(2);
                        row.insertCell().textContent = deptExpenses.toFixed(2);
                        row.insertCell().textContent = deptBalance.toFixed(2);
                    });
                }

            } catch (error) {
                console.error('Error generating reports:', error);
                alert('Failed to generate reports: ' + error.message);
            }
        }

        // --- Audit Logs Functions ---
        async function fetchAuditLogs() {
            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/audit-logs`);
                if (!response) return;
                const logs = await response.json();
                renderAuditLogsTable(logs);
            } catch (error) {
                console.error('Error fetching audit logs:', error);
                alert('Failed to fetch audit logs: ' + error.message);
            }
        }

        function renderAuditLogsTable(logs) {
            const tbody = document.querySelector('#audit-logs-table tbody');
            tbody.innerHTML = '';
            if (logs.length === 0) {
                const row = tbody.insertRow();
                row.insertCell().colSpan = 4;
                row.insertCell().textContent = 'No audit logs found.';
                return;
            }

            logs.forEach(log => {
                const row = tbody.insertRow();
                row.insertCell().textContent = new Date(log.timestamp).toLocaleString();
                row.insertCell().textContent = log.user;
                row.insertCell().textContent = log.action;
                row.insertCell().textContent = JSON.stringify(log.details); // Display details as string
            });
        }


        // --- Initial Setup and Event Listeners ---
        document.addEventListener('DOMContentLoaded', () => {
            // Check authentication status on page load
            updateUIForUserRole();

            // Attach form submission handlers
            document.getElementById('inventory-form').addEventListener('submit', submitInventoryForm);
            document.getElementById('sale-form').addEventListener('submit', submitSaleForm);
            document.getElementById('expense-form').addEventListener('submit', submitExpenseForm);
            document.getElementById('cash-journal-form').addEventListener('submit', submitCashJournalForm);
            
            // Set initial date filters for various sections
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayString = `${yyyy}-${mm}-${dd}`;

            document.getElementById('sales-date-filter').value = todayString;
            document.getElementById('expenses-date-filter').value = todayString;
            document.getElementById('cash-date').value = todayString;
            document.getElementById('cash-filter-date').value = todayString;

            // For reports, set default to last 30 days
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            document.getElementById('report-start-date').value = thirtyDaysAgo.toISOString().split('T')[0];
            document.getElementById('report-end-date').value = todayString;
        });

    
