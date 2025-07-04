
        // Firebase Imports
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        
        // --- FIREBASE CONFIGURATION ---
        // IMPORTANT: Replace with your actual Firebase config
        const firebaseConfig = {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_AUTH_DOMAIN",
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_STORAGE_BUCKET",
            messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
            appId: "YOUR_APP_ID"
        };
        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);

        let userId = null;

        // --- AUTHENTICATION ---
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in.
                userId = user.uid;
                console.log("User signed in with UID:", userId);
                loadAllData();
            } else {
                // User is signed out. Sign in anonymously.
                signInAnonymously(auth).catch((error) => {
                    console.error("Anonymous sign-in failed:", error);
                });
            }
        });

        // --- DOM ELEMENTS ---
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const navLinks = document.querySelectorAll('.nav-link');
        const pages = document.querySelectorAll('.page-content');

        const addItemBtn = document.getElementById('add-item-btn');
        const addExpenseBtn = document.getElementById('add-expense-btn');
        const addSaleBtn = document.getElementById('add-sale-btn');

        const itemModal = document.getElementById('item-modal');
        const expenseModal = document.getElementById('expense-modal');
        const cancelItemBtn = document.getElementById('cancel-item-btn');
        const cancelExpenseBtn = document.getElementById('cancel-expense-btn');
        const itemForm = document.getElementById('item-form');
        const expenseForm = document.getElementById('expense-form');
        const cashForm = document.getElementById('cash-form');
        
        const inventoryTableBody = document.getElementById('inventory-table-body');
        const expensesTableBody = document.getElementById('expenses-table-body');

        const barTotalSalesEl = document.getElementById('bar-total-sales');
        const barTotalExpensesEl = document.getElementById('bar-total-expenses');
        const barBalanceEl = document.getElementById('bar-balance');
        const dashboardBalanceEl = document.getElementById('dashboard-balance');
        const todaySalesEl = document.getElementById('today-sales');
        const weeklySalesEl = document.getElementById('weekly-sales');
        const monthlySalesEl = document.getElementById('monthly-sales');

        // --- UI & NAVIGATION LOGIC ---
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            if (sidebar.classList.contains('-translate-x-full')) {
                mainContent.classList.remove('ml-64');
            } else {
                mainContent.classList.add('ml-64');
            }
        });

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.dataset.target;

                pages.forEach(page => page.classList.add('hidden'));
                document.getElementById(targetId).classList.remove('hidden');

                navLinks.forEach(nav => nav.classList.remove('active-link', 'bg-gray-700'));
                link.classList.add('active-link', 'bg-gray-700');
            });
        });

        // --- MODAL HANDLING ---
        const openModal = (modal) => modal.classList.add('active');
        const closeModal = (modal) => modal.classList.remove('active');

        addItemBtn.addEventListener('click', () => {
            itemForm.reset();
            document.getElementById('item-id').value = '';
            document.getElementById('item-modal-title').textContent = 'Add Item';
            openModal(itemModal);
        });
        addExpenseBtn.addEventListener('click', () => {
            expenseForm.reset();
            document.getElementById('expense-id').value = '';
            document.getElementById('expense-modal-title').textContent = 'Add Expense';
            openModal(expenseModal);
        });
        addSaleBtn.addEventListener('click', () => {
            expenseForm.reset();
            document.getElementById('sales-id').value = '';
            document.getElementById('sales-modal-title').textContent = 'Add Sales';
            openModal(salesModal);
        });

        cancelItemBtn.addEventListener('click', () => closeModal(itemModal));
        cancelExpenseBtn.addEventListener('click', () => closeModal(expenseModal));
        window.addEventListener('click', (e) => {
            if (e.target === itemModal) closeModal(itemModal);
            if (e.target === expenseModal) closeModal(expenseModal);
        });
        
        // --- DATA STATE ---
        let inventory = [];
        let expenses = [];
        
        // --- FIRESTORE FUNCTIONS ---
        const getCollectionRef = (collectionName) => {
            if (!userId) throw new Error("User not authenticated");
            return collection(db, "hotelData", userId, collectionName);
        }

        // --- INVENTORY CRUD ---
        itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!userId) {
                alert("You must be logged in to save data.");
                return;
            }

            const id = document.getElementById('item-id').value;
            const itemData = {
                name: document.getElementById('item-name').value,
                type: document.getElementById('item-type').value,
                quantity: parseInt(document.getElementById('item-quantity').value),
                price: parseFloat(document.getElementById('item-price').value),
                date: new Date().toISOString()
            };

            try {
                if (id) { // Update existing item
                    const itemRef = doc(db, "hotelData", userId, "inventory", id);
                    await updateDoc(itemRef, itemData);
                } else { // Add new item
                    await addDoc(getCollectionRef("inventory"), itemData);
                }
                itemForm.reset();
                closeModal(itemModal);
                // Real-time listener will update the UI
            } catch (error) {
                console.error("Error saving item:", error);
                alert("Failed to save item. See console for details.");
            }
        });

        const renderInventory = () => {
            inventoryTableBody.innerHTML = '';
            inventory.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="border px-4 py-2">${item.name}</td>
                    <td class="border px-4 py-2">${item.type}</td>
                    <td class="border px-4 py-2">${item.quantity}</td>
                    <td class="border px-4 py-2">${item.price.toLocaleString()}</td>
                    <td class="border px-4 py-2">${new Date(item.date).toLocaleDateString()}</td>
                    <td class="border px-4 py-2">
                        <button class="edit-item-btn bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600" data-id="${item.id}">Edit</button>
                        <button class="delete-item-btn bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600" data-id="${item.id}">Delete</button>
                    </td>
                `;
                inventoryTableBody.appendChild(tr);

                if(item.quantity < 5) { // Low stock threshold
                    showLowStockNotification(`${item.name} is running low! Only ${item.quantity} left.`);
                }
            });
            updateCalculations();
        };

        inventoryTableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('edit-item-btn')) {
                const id = e.target.dataset.id;
                const item = inventory.find(i => i.id === id);
                if (item) {
                    document.getElementById('item-id').value = item.id;
                    document.getElementById('item-name').value = item.name;
                    document.getElementById('item-type').value = item.type;
                    document.getElementById('item-quantity').value = item.quantity;
                    document.getElementById('item-price').value = item.price;
                    document.getElementById('item-modal-title').textContent = 'Edit Item';
                    openModal(itemModal);
                }
            }
            if (e.target.classList.contains('delete-item-btn')) {
                const id = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this item?')) {
                    try {
                        await deleteDoc(doc(db, "hotelData", userId, "inventory", id));
                    } catch (error) {
                        console.error("Error deleting item:", error);
                        alert("Failed to delete item.");
                    }
                }
            }
        });


        // --- EXPENSE CRUD ---
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!userId) {
                alert("You must be logged in to save data.");
                return;
            }

            const id = document.getElementById('expense-id').value;
            const expenseData = {
                description: document.getElementById('expense-description').value,
                amount: parseFloat(document.getElementById('expense-amount').value),
                receiptId: document.getElementById('expense-receipt').value,
                responsible: document.getElementById('expense-responsible').value,
                date: new Date().toISOString()
            };

            try {
                if (id) { // Update
                    await updateDoc(doc(db, "hotelData", userId, "expenses", id), expenseData);
                } else { // Create
                    await addDoc(getCollectionRef("expenses"), expenseData);
                }
                expenseForm.reset();
                closeModal(expenseModal);
            } catch (error) {
                console.error("Error saving expense:", error);
                alert("Failed to save expense.");
            }
        });

        const renderExpenses = () => {
            expensesTableBody.innerHTML = '';
            expenses.forEach(expense => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="border px-4 py-2">${expense.description}</td>
                    <td class="border px-4 py-2">${expense.amount.toLocaleString()}</td>
                    <td class="border px-4 py-2">${new Date(expense.date).toLocaleDateString()}</td>
                    <td class="border px-4 py-2">${expense.receiptId}</td>
                    <td class="border px-4 py-2">${expense.responsible}</td>
                    <td class="border px-4 py-2">
                        <button class="edit-expense-btn bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600" data-id="${expense.id}">Edit</button>
                        <button class="delete-expense-btn bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600" data-id="${expense.id}">Delete</button>
                    </td>
                `;
                expensesTableBody.appendChild(tr);
            });
            updateCalculations();
        };

        expensesTableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('edit-expense-btn')) {
                const id = e.target.dataset.id;
                const expense = expenses.find(ex => ex.id === id);
                if (expense) {
                    document.getElementById('expense-id').value = expense.id;
                    document.getElementById('expense-description').value = expense.description;
                    document.getElementById('expense-amount').value = expense.amount;
                    document.getElementById('expense-receipt').value = expense.receiptId;
                    document.getElementById('expense-responsible').value = expense.responsible;
                    document.getElementById('expense-modal-title').textContent = 'Edit Expense';
                    openModal(expenseModal);
                }
            }
            if (e.target.classList.contains('delete-expense-btn')) {
                const id = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this expense?')) {
                    try {
                        await deleteDoc(doc(db, "hotelData", userId, "expenses", id));
                    } catch (error) {
                        console.error("Error deleting expense:", error);
                        alert("Failed to delete expense.");
                    }
                }
            }
        });
        
        // --- CASH MANAGEMENT ---
        cashForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!userId) {
                alert("You must be logged in to save data.");
                return;
            }
            
            const cashData = {
                cashAtHand: parseFloat(document.getElementById('cash-at-hand').value) || 0,
                cashBanked: parseFloat(document.getElementById('cash-banked').value) || 0,
                receiptId: document.getElementById('banked-receipt-id').value,
                responsible: document.getElementById('responsible-person').value,
                date: new Date().toISOString()
            };
            
            try {
                await addDoc(getCollectionRef("cashRecords"), cashData);
                alert('Cash record saved!');
                cashForm.reset();
            } catch(error) {
                console.error("Error saving cash record:", error);
                alert("Failed to save cash record.");
            }
        });

        // --- CALCULATIONS & DASHBOARD ---
        const updateCalculations = () => {
            const totalSales = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
            const balance = totalSales - totalExpenses;

            barTotalSalesEl.textContent = `UGX ${totalSales.toLocaleString()}`;
            barTotalExpensesEl.textContent = `UGX ${totalExpenses.toLocaleString()}`;
            barBalanceEl.textContent = `UGX ${balance.toLocaleString()}`;
            dashboardBalanceEl.textContent = `UGX ${balance.toLocaleString()}`;
            
            updateDashboardMetrics();
        };
        
        const updateDashboardMetrics = () => {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const salesToday = inventory
                .filter(item => new Date(item.date) >= today)
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);
                
            const salesThisWeek = inventory
                .filter(item => new Date(item.date) >= startOfWeek)
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);

            const salesThisMonth = inventory
                .filter(item => new Date(item.date) >= startOfMonth)
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            todaySalesEl.textContent = `UGX ${salesToday.toLocaleString()}`;
            weeklySalesEl.textContent = `UGX ${salesThisWeek.toLocaleString()}`;
            monthlySalesEl.textContent = `UGX ${salesThisMonth.toLocaleString()}`;
        };
        
        // --- NOTIFICATIONS ---
        const showLowStockNotification = (message) => {
            const notification = document.getElementById('low-stock-notification');
            document.getElementById('low-stock-message').textContent = message;
            notification.classList.remove('hidden');
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 5000); // Hide after 5 seconds
        }

        // --- REAL-TIME DATA LOADING ---
        const loadAllData = () => {
            if (!userId) return;

            // Listen for inventory changes
            onSnapshot(getCollectionRef("inventory"), (snapshot) => {
                inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderInventory();
            });

            // Listen for expense changes
            onSnapshot(getCollectionRef("expenses"), (snapshot) => {
                expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderExpenses();
            });
        };
