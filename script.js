// Базовые данные приложения
let appData = {
    cart: [],
    settings: {
        headerLogo: "",
        logoSize: 50,
        headerBgColor: "#ffffff",
        headerBgImage: "",
        serviceTip: 0,
        categoryBackgrounds: {},
        theme: "light",
        adminPassword: "54321"
    },
    categories: [
        { id: "appetizers", name: "Закуски", tabBg: "#ffffff", tabFont: "#000000" },
        { id: "main-dishes", name: "Основные блюда", tabBg: "#ffffff", tabFont: "#000000" },
        { id: "desserts", name: "Десерты", tabBg: "#ffffff", tabFont: "#000000" }
    ],
    menuData: {
        "appetizers": [],
        "main-dishes": [],
        "desserts": []
    }
};

// Инициализация IndexedDB
let db;
const DB_NAME = 'RestaurantMenuDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';

async function initDB() {
    return new Promise((resolve, reject) => {
        // Удаляем старую базу данных
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        
        deleteRequest.onsuccess = () => {
            // Создаем новую базу данных
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => reject(request.error);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
        };
        
        deleteRequest.onerror = () => {
            // Если не удалось удалить, пробуем просто открыть
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => reject(request.error);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
        };
    });
}

// Функция валидации данных
function validateData(data) {
    try {
        // Проверка базовой структуры
        if (!data || typeof data !== 'object') {
            console.error('Invalid data structure');
            return false;
        }

        // Проверка настроек
        if (!data.settings || typeof data.settings !== 'object') {
            console.error('Invalid settings structure');
            return false;
        }

        // Проверка обязательных полей настроек
        const requiredSettings = ['headerLogo', 'logoSize', 'headerBgColor', 'serviceTip', 'theme', 'adminPassword'];
        for (const setting of requiredSettings) {
            if (!(setting in data.settings)) {
                console.error(`Missing required setting: ${setting}`);
                return false;
            }
        }

        // Проверка категорий
        if (!data.categories || !Array.isArray(data.categories)) {
            console.error('Invalid categories structure');
            return false;
        }

        // Проверка каждой категории
        for (const category of data.categories) {
            if (!category || typeof category !== 'object') {
                console.error('Invalid category structure');
                return false;
            }

            if (!category.id || !category.name) {
                console.error('Category missing required fields');
                return false;
            }
        }

        // Проверка данных меню
        if (!data.menuData || typeof data.menuData !== 'object') {
            console.error('Invalid menuData structure');
            return false;
        }

        // Проверка корзины (необязательная)
        if (data.cart !== undefined && !Array.isArray(data.cart)) {
            console.error('Invalid cart structure');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error validating data:', error);
        return false;
    }
}

// Функция сохранения данных
async function saveData() {
    try {
        // Сначала сохраняем в IndexedDB
        if (!db) {
            db = await initDB();
        }

        await new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.put(appData, 'data');
            
            request.onsuccess = () => {
                console.log('Данные успешно сохранены в IndexedDB');
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });

        // Затем сохраняем на сервере
        const response = await fetch('save_data.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appData)
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении данных на сервере');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Ошибка при сохранении данных');
        }

        console.log('Данные успешно сохранены на сервере');
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        // В случае ошибки сохраняем в localStorage как резервную копию
        try {
            localStorage.setItem('appData', JSON.stringify(appData));
            console.log('Данные сохранены в localStorage как резервная копия');
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
        throw error;
    }
}

// Функция загрузки данных
async function loadData() {
    try {
        // Загружаем данные с сервера
        const response = await fetch('load_data.php');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Проверяем структуру данных
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data structure');
        }
        
        // Проверяем обязательные поля
        if (!data.settings || !data.categories || !Array.isArray(data.categories)) {
            throw new Error('Missing required fields');
        }
        
        // Преобразуем числовые значения
        function convertNumericValues(obj) {
            if (Array.isArray(obj)) {
                return obj.map(item => convertNumericValues(item));
            } else if (obj && typeof obj === 'object') {
                const result = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        const value = obj[key];
                        if (key === 'price' && typeof value === 'string') {
                            result[key] = parseFloat(value);
                        } else {
                            result[key] = convertNumericValues(value);
                        }
                    }
                }
                return result;
            }
            return obj;
        }
        
        // Применяем преобразование
        const convertedData = convertNumericValues(data);
        
        // Очищаем IndexedDB перед сохранением новых данных
        const db = await initDB();
        const transaction = db.transaction(['appData'], 'readwrite');
        const store = transaction.objectStore('appData');
        await store.clear();
        
        // Сохраняем данные в IndexedDB
        await store.put(convertedData, 'appData');
        
        // Обновляем appData
        appData = convertedData;
        
        console.log('Data loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        // Пробуем загрузить данные из localStorage как резервный вариант
        try {
            const savedData = localStorage.getItem('appData');
            if (savedData) {
                appData = JSON.parse(savedData);
                console.log('Data loaded from localStorage');
                return true;
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
        }
        return false;
    }
}

// Функция для обновления данных с автоматическим сохранением
function updateAppData(newData) {
    // Обновляем appData
    appData = { ...appData, ...newData };
    
    // Преобразуем все числовые значения в числа
    if (appData.menuData) {
        for (const category of Object.keys(appData.menuData)) {
            appData.menuData[category].forEach(dish => {
                if (typeof dish.price === 'string') {
                    dish.price = Number(dish.price);
                }
            });
        }
    }
    
    // Сохраняем обновленные данные
    saveData();
}

// Ссылки на DOM-элементы
const elements = {
    menuContainer: document.getElementById("menu-container"),
    navTabs: document.getElementById("nav-tabs"),
    cartButton: document.getElementById("cart-button"),
    cartBadge: document.getElementById("cart-badge"),
    cartModal: document.getElementById("cart-modal"),
    cartItemsModal: document.getElementById("cart-items-modal"),
    cartSummaryModal: document.getElementById("cart-summary-modal"),
    clearCartBtn: document.getElementById("clear-cart-btn"),
    editModal: document.getElementById("edit-modal"),
    editForm: document.getElementById("edit-form"),
    editName: document.getElementById("edit-name"),
    editDescription: document.getElementById("edit-description"),
    editPrice: document.getElementById("edit-price"),
    editImgFile: document.getElementById("edit-img-file"),
    editCategorySelect: document.getElementById("edit-category-select"),
    editCategoryHidden: document.getElementById("edit-category"),
    editIndex: document.getElementById("edit-index"),
    stopListToggle: document.getElementById("stop-list-toggle"),
    editModalTitle: document.getElementById("edit-modal-title"),
    adminPanelModal: document.getElementById("admin-panel-modal"),
    headerLogoDiv: document.getElementById("header-logo"),
    adminNavButtons: document.querySelectorAll("#admin-nav button"),
    adminSections: document.querySelectorAll(".admin-section"),
    adminEditContent: document.getElementById("admin-edit-content"),
    adminAddDishBtn: document.getElementById("admin-add-dish-btn"),
    adminSettingsForm: document.getElementById("admin-settings-form"),
    adminLogoFileInput: document.getElementById("admin-logo-file"),
    adminLogoSizeInput: document.getElementById("admin-logo-size"),
    adminHeaderBgColorInput: document.getElementById("admin-header-bg-color"),
    adminHeaderBgImageInput: document.getElementById("admin-header-bg-image"),
    adminServiceTipInput: document.getElementById("admin-service-tip"),
    adminCategoriesSettingsDiv: document.getElementById("admin-categories-settings"),
    adminAddCategoryBtn: document.getElementById("admin-add-category-btn"),
    adminPasswordInput: document.getElementById("admin-password"),
    themeToggleBtn: document.getElementById("theme-toggle"),
    adminPasswordModal: document.getElementById("admin-password-modal"),
    adminPasswordForm: document.getElementById("admin-password-form"),
    adminPasswordInputModal: document.getElementById("admin-password-input"),
    toggleAdminPassword: document.getElementById("toggle-admin-password"),
    exportDataBtn: document.getElementById("export-data"),
    importDataBtn: document.getElementById("import-data"),
    importDataInput: document.getElementById("import-data-input"),
    progressModal: document.createElement("div"),
    progressBar: document.createElement("div"),
    progressText: document.createElement("div"),
    progressTitle: document.createElement("div")
};

// Инициализация прогресс-бара
elements.progressModal.className = "modal progress-modal";
elements.progressModal.innerHTML = `
    <div class="modal-content">
        <h3 id="progress-title">Обработка...</h3>
        <div class="progress-container">
            <div class="progress-bar"></div>
        </div>
        <div class="progress-text">0%</div>
    </div>
`;
document.body.appendChild(elements.progressModal);
elements.progressBar = elements.progressModal.querySelector('.progress-bar');
elements.progressText = elements.progressModal.querySelector('.progress-text');
elements.progressTitle = elements.progressModal.querySelector('#progress-title');

// Функции для работы с прогресс-баром
function showProgress(title = "Обработка...") {
    elements.progressTitle.textContent = title;
    elements.progressBar.style.width = "0%";
    elements.progressText.textContent = "0%";
    elements.progressModal.style.display = "block";
}

function updateProgress(percent, text = null) {
    elements.progressBar.style.width = percent + "%";
    elements.progressText.textContent = text || `${Math.round(percent)}%`;
}

function hideProgress() {
    elements.progressModal.style.display = "none";
}

// Добавляем обработчики закрытия модальных окон по клику вне их области
const modals = [
    elements.cartModal,
    elements.editModal,
    elements.adminPanelModal,
    elements.adminPasswordModal,
    document.getElementById('confirm-order-modal') // Добавляем модальное окно подтверждения заказа
];

window.addEventListener('click', (event) => {
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Предотвращаем закрытие модального окна при клике на его содержимое
document.querySelectorAll('.modal-content').forEach(content => {
    content.addEventListener('click', (event) => {
        event.stopPropagation();
    });
});

// Функция рендеринга вкладок категорий
function renderNavTabs() {
    if (!elements.navTabs) return;
    elements.navTabs.innerHTML = "";
    if (!appData.categories || appData.categories.length === 0) return;
    appData.categories.forEach((cat, i) => {
        if (!cat || !cat.id || !cat.name) return;
        const li = document.createElement("li");
        li.textContent = cat.name;
        li.setAttribute("data-target", cat.id);
        li.style.backgroundColor = cat.tabBg || "#ffffff";
        li.style.color = cat.tabFont || "#000000";
        li.onclick = () => {
            document.querySelectorAll(".menu-nav li").forEach(tab => tab.className = "");
            document.querySelectorAll(".menu-section").forEach(sec => sec.className = "menu-section");
            li.className = "active";
            const section = document.getElementById(cat.id);
            if (section) {
                section.className = "menu-section active";
            }
            li.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        };
        if (i === 0) li.className = "active";
        elements.navTabs.appendChild(li);
    });
}

// Функция для получения пути к изображению
function getImagePath(path) {
    if (!path) return 'images/placeholder.php';
    if (path.startsWith('data:image')) return path;
    if (path.startsWith('http')) return path;
    if (path.startsWith('images/')) return path;
    return 'images/' + path;
}

// Генерация секции категории
function generateSection(cat) {
    if (!cat || !cat.id) return null;
    const section = document.createElement("section");
    section.id = cat.id;
    section.className = "menu-section";
    if (appData.settings.categoryBackgrounds[cat.id]) {
        section.style.backgroundImage = `url(${getImagePath(appData.settings.categoryBackgrounds[cat.id])})`;
    }
    const cardsContainer = document.createElement("div");
    cardsContainer.className = "cards-container";

    const items = appData.menuData[cat.id] || [];
    items.forEach((item, i) => {
        const card = generateCard(item, cat.id, i);
        if (card) cardsContainer.appendChild(card);
    });

    section.appendChild(cardsContainer);
    return section;
}

// Генерация карточки блюда
function generateCard(item, categoryId, index) {
    if (!item || !item.name || item.stopList) return null;

    const card = document.createElement("div");
    card.className = "menu-item";
    card.onclick = () => showItemDetails(item);

    const img = document.createElement("img");
    img.src = getImagePath(item.img || "https://via.placeholder.com/300x200");
    img.alt = item.name;
    card.appendChild(img);

    const infoDiv = document.createElement("div");
    infoDiv.className = "item-info";

    const nameEl = document.createElement("h3");
    nameEl.textContent = item.name;
    infoDiv.appendChild(nameEl);

    const descEl = document.createElement("p");
    descEl.textContent = item.description || "";
    infoDiv.appendChild(descEl);

    const priceEl = document.createElement("span");
    priceEl.className = "price";
    priceEl.textContent = item.price + " TMT";
    infoDiv.appendChild(priceEl);

    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "item-buttons";

    const orderBtn = document.createElement("button");
    orderBtn.textContent = "Добавить в корзину";
    orderBtn.className = "order-btn";
    orderBtn.onclick = (e) => {
        e.stopPropagation();
        addToCart(item);
    };
    buttonsDiv.appendChild(orderBtn);

    infoDiv.appendChild(buttonsDiv);
    card.appendChild(infoDiv);
    return card;
}

// Показ подробностей блюда
function showItemDetails(item) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">×</span>
            <img src="${item.img || 'https://via.placeholder.com/300x200'}" alt="${item.name}" style="width:100%; height:auto;">
            <h2>${item.name}</h2>
            <p>${item.description || 'Описание отсутствует'}</p>
            <p class="price">${item.price || 0} TMT</p>
            <button class="order-btn">Добавить в корзину</button>
        </div>`;
    document.body.appendChild(modal);
    modal.style.display = "block";

    modal.querySelector(".close").onclick = () => document.body.removeChild(modal);
    modal.onclick = (event) => {
        if (event.target === modal) document.body.removeChild(modal);
    };
    modal.querySelector(".order-btn").onclick = () => {
        addToCart(item);
        document.body.removeChild(modal);
    };
}

// Рендер всего меню
function renderMenu() {
    renderNavTabs();
    elements.menuContainer.innerHTML = "";
    if (!appData.categories || appData.categories.length === 0) {
        elements.menuContainer.innerHTML = "<p>Нет категорий для отображения</p>";
        return;
    }
    appData.categories.forEach(cat => {
        const section = generateSection(cat);
        if (section) elements.menuContainer.appendChild(section);
    });
    if (appData.categories[0] && document.getElementById(appData.categories[0].id)) {
        document.getElementById(appData.categories[0].id).className = "menu-section active";
    }
}

// Функция показа уведомления о добавлении в корзину
function showAddToCartNotification(item) {
    const notification = document.createElement("div");
    notification.className = "cart-notification";
    notification.textContent = `${item.name} добавлено в корзину!`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add("show");
    }, 10);

    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Функция получения корзины из localStorage
function getCart() {
    const cartJson = localStorage.getItem('cart');
    return cartJson ? JSON.parse(cartJson) : [];
}

// Функция сохранения корзины в localStorage
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Функция добавления в корзину
function addToCart(item) {
    try {
        if (!item || !item.name || !item.price) {
            console.error('Неверные данные товара:', item);
            return;
        }

        const cart = getCart();
        const existingItem = cart.find(cartItem =>
            cartItem.name === item.name && cartItem.price === item.price
        );

        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            cart.push({ 
                ...item, 
                quantity: 1,
                name: item.name,
                price: item.price
            });
        }

        saveCart(cart);
        updateCartBadge();
        showAddToCartNotification(item);
    } catch (error) {
        console.error('Ошибка при добавлении в корзину:', error);
    }
}

// Функция очистки корзины
function clearCart() {
    appData.cart = [];
    saveCart([]);
    updateCartBadge();
    updateCartModal();
}

// Обновление модального окна корзины
function updateCartModal() {
    try {
        if (!elements.cartItemsModal || !elements.cartSummaryModal) {
            console.error('Не найдены элементы корзины');
            return;
        }

        elements.cartItemsModal.innerHTML = "";
        let total = 0;
        
        const cart = getCart();
        
        if (cart.length > 0) {
            cart.forEach((item, index) => {
                if (!item || !item.name || !item.price) {
                    console.error('Неверные данные товара:', item);
                    return;
                }

                if (!item.quantity || item.quantity < 1) {
                    item.quantity = 1;
                }
                
                const wrapper = document.createElement("div");
                wrapper.className = "cart-item-modal";

                const infoDiv = document.createElement("div");
                infoDiv.textContent = `${item.name} - ${item.price} TMT`;

                const quantityDiv = document.createElement("div");
                quantityDiv.className = "cart-quantity-controls";

                const minusBtn = document.createElement("button");
                minusBtn.className = "cart-minus-btn";
                minusBtn.textContent = "-";
                minusBtn.onclick = () => {
                    const updatedCart = getCart();
                    if (updatedCart[index].quantity > 1) {
                        updatedCart[index].quantity--;
                    } else {
                        updatedCart.splice(index, 1);
                    }
                    saveCart(updatedCart);
                    updateCartModal();
                    updateCartBadge();
                };

                const quantitySpan = document.createElement("span");
                quantitySpan.className = "cart-quantity";
                quantitySpan.textContent = item.quantity;

                const plusBtn = document.createElement("button");
                plusBtn.className = "cart-plus-btn";
                plusBtn.textContent = "+";
                plusBtn.onclick = () => {
                    const updatedCart = getCart();
                    updatedCart[index].quantity++;
                    saveCart(updatedCart);
                    updateCartModal();
                    updateCartBadge();
                };

                quantityDiv.appendChild(minusBtn);
                quantityDiv.appendChild(quantitySpan);
                quantityDiv.appendChild(plusBtn);

                wrapper.appendChild(infoDiv);
                wrapper.appendChild(quantityDiv);
                elements.cartItemsModal.appendChild(wrapper);

                total += parseFloat(item.price) * item.quantity;
            });

            elements.cartSummaryModal.innerHTML = `
                <p>Итого: ${total.toFixed(2)} TMT</p>
                ${appData.settings.serviceTip > 0 ? 
                    `<p>Обслуживание (${appData.settings.serviceTip}%): ${(total * appData.settings.serviceTip / 100).toFixed(2)} TMT</p>
                    <p>Всего с обслуживанием: ${(total + total * appData.settings.serviceTip / 100).toFixed(2)} TMT</p>` 
                    : ''}
            `;
        } else {
            elements.cartItemsModal.innerHTML = "<p>Корзина пуста</p>";
            elements.cartSummaryModal.innerHTML = "";
        }
    } catch (error) {
        console.error('Ошибка при обновлении корзины:', error);
        elements.cartItemsModal.innerHTML = "<p>Ошибка при загрузке корзины</p>";
        elements.cartSummaryModal.innerHTML = "";
    }
}

// Обновление бейджа корзины
function updateCartBadge() {
    const badge = document.getElementById("cart-badge");
    if (!badge) return;

    const cart = getCart();
    const totalQty = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
    if (totalQty > 0) {
        badge.textContent = totalQty;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

// Открываем модальное окно редактирования блюда
function openEditModal(categoryId, index, item) {
    if (item) {
        // Редактирование блюда
        elements.editModalTitle.textContent = 'Редактировать блюдо';
        elements.editName.value = item.name || '';
        elements.editDescription.value = item.description || '';
        elements.editPrice.value = item.price || '';
        elements.editImgFile.value = '';
        elements.stopListToggle.checked = item.stopList || false;
        renderEditCategorySelect(categoryId);
        elements.editCategoryHidden.value = categoryId || '';
        elements.editIndex.value = index !== null ? index : '';
    } else {
        // Добавление нового блюда
        elements.editModalTitle.textContent = 'Добавить блюдо';
        elements.editName.value = '';
        elements.editDescription.value = '';
        elements.editPrice.value = '';
        elements.editImgFile.value = '';
        elements.stopListToggle.checked = false;
        renderEditCategorySelect(categoryId);
        elements.editCategoryHidden.value = ''; // Оставляем пустым для нового блюда
        elements.editIndex.value = ''; // Оставляем пустым для нового блюда
    }
    elements.editModal.style.display = 'block';
}

// Рендер списка категорий в <select>
function renderEditCategorySelect(selectedCatId) {
    elements.editCategorySelect.innerHTML = "";
    appData.categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.name;
        if (selectedCatId === cat.id) option.selected = true;
        elements.editCategorySelect.appendChild(option);
    });
}

// Функция сохранения блюда
async function saveDish(imagePath) {
    // Проверяем существование элементов
    const nameElement = document.getElementById('edit-name');
    const descriptionElement = document.getElementById('edit-description');
    const priceElement = document.getElementById('edit-price');
    const newCategoryElement = document.getElementById('edit-category-select');
    const stopListElement = document.getElementById('stop-list-toggle');
    const indexElement = document.getElementById('edit-index');
    const oldCategoryElement = document.getElementById('edit-category');

    if (!nameElement || !descriptionElement || !priceElement || !newCategoryElement || 
        !stopListElement || !indexElement || !oldCategoryElement) {
        console.error('Не найдены необходимые элементы формы');
        alert('Ошибка: не найдены необходимые элементы формы');
        return;
    }

    const name = nameElement.value;
    const description = descriptionElement.value;
    const priceInput = priceElement.value;
    const newCategory = newCategoryElement.value;
    const isStopList = stopListElement.checked;
    const index = indexElement.value;
    const oldCategory = oldCategoryElement.value;

    // Проверяем и преобразуем цену в число
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
        alert('Пожалуйста, введите корректную цену');
        return;
    }

    if (!name || !newCategory) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }

    try {
        let imageUrl = '';
        
        // Если есть новое изображение
        if (imagePath instanceof File) {
            const formData = new FormData();
            formData.append('file', imagePath);
            
            const response = await fetch('upload.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Ошибка при загрузке изображения');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Ошибка при загрузке изображения');
            }
            
            imageUrl = result.path;
        } else if (imagePath) {
            // Если передано URL изображения
            imageUrl = imagePath;
        }

        // Создаем объект блюда
        const dish = {
            name,
            description,
            price: price,
            stopList: isStopList
        };

        // Если есть новое изображение, добавляем его
        if (imageUrl) {
            dish.img = imageUrl;
            dish.imgPath = imageUrl;
        } else if (index !== 'new') {
            // Если редактируем существующее блюдо и нет нового изображения,
            // сохраняем старое изображение
            const oldDish = appData.menuData[oldCategory][index];
            if (oldDish) {
                dish.img = oldDish.img;
                dish.imgPath = oldDish.imgPath;
            }
        }

        // Создаем копию текущих данных
        const updatedAppData = { ...appData };
        
        // Если категория изменилась, удаляем блюдо из старой категории
        if (oldCategory && oldCategory !== newCategory && index !== 'new') {
            updatedAppData.menuData[oldCategory].splice(index, 1);
        }
        
        // Обновляем данные в новой категории
        if (index === 'new') {
            if (!updatedAppData.menuData[newCategory]) {
                updatedAppData.menuData[newCategory] = [];
            }
            updatedAppData.menuData[newCategory].push(dish);
        } else {
            if (!updatedAppData.menuData[newCategory]) {
                updatedAppData.menuData[newCategory] = [];
            }
            // Если категория не изменилась, обновляем по старому индексу
            if (oldCategory === newCategory) {
                updatedAppData.menuData[newCategory][index] = dish;
            } else {
                // Если категория изменилась, добавляем в конец новой категории
                updatedAppData.menuData[newCategory].push(dish);
            }
        }
        
        // Сохраняем обновленные данные
        appData = updatedAppData;
        await saveData();
        
        // Обновляем отображение
        renderMenu();
        renderAdminEditContent();
        elements.editModal.style.display = 'none';
    } catch (error) {
        console.error('Error saving dish:', error);
        alert('Ошибка при сохранении блюда: ' + error.message);
    }
}

// Рендер контента в админ-панели (секция редактирования блюд)
function renderAdminEditContent() {
    elements.adminEditContent.innerHTML = "";
    appData.categories.forEach(cat => {
        const catHeader = document.createElement("h3");
        catHeader.textContent = cat.name;
        elements.adminEditContent.appendChild(catHeader);

        const list = document.createElement("div");
        const items = appData.menuData[cat.id] || [];
        items.forEach((item, j) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "admin-dish-item";
            itemDiv.innerHTML = `
                <span>${item.name} - ${Number(item.price).toFixed(2)} TMT ${item.stopList ? '<span style="color: #dc3545">(Stop List)</span>' : ''}</span>
            `;

            const editBtn = document.createElement("button");
            editBtn.textContent = "Редактировать";
            editBtn.className = "edit-btn";
            editBtn.onclick = () => openEditModal(cat.id, j, item);

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Удалить";
            deleteBtn.className = "delete-btn";
            deleteBtn.onclick = () => {
                if (confirm("Удалить блюдо?")) {
                    appData.menuData[cat.id].splice(j, 1);
                    renderMenu();
                    renderAdminEditContent();
                    updateCartModal();
                    saveData();
                }
            };

            itemDiv.appendChild(editBtn);
            itemDiv.appendChild(deleteBtn);
            list.appendChild(itemDiv);
        });
        elements.adminEditContent.appendChild(list);
    });
}

// Функция для загрузки логотипа
async function uploadLogo(file) {
    try {
        // Проверяем тип файла
        if (!file.type.startsWith('image/')) {
            throw new Error('Пожалуйста, выберите изображение');
        }

        // Проверяем размер файла
        if (file.size > 5 * 1024 * 1024) { // 5MB
            throw new Error('Изображение слишком большое (максимум 5MB)');
        }

        // Проверяем директорию images
        const checkResponse = await fetch('check_dir.php');
        if (!checkResponse.ok) {
            throw new Error('Ошибка при проверке директории images');
        }
        
        const checkResult = await checkResponse.json();
        if (!checkResult.writable) {
            throw new Error(checkResult.error || 'Директория images не доступна для записи');
        }

        // Оптимизируем изображение
        const optimizedBlob = await optimizeImage(file, 800, 800, 0.9);
        
        // Формируем имя файла
        const fileName = `logo_${Date.now()}.jpg`;
        const filePath = `images/${fileName}`;
        
        // Создаем FormData для отправки
        const formData = new FormData();
        formData.append('file', optimizedBlob, fileName);
        formData.append('path', filePath);
        
        // Отправляем на сервер
        const response = await fetch('upload.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Ошибка при загрузке логотипа');
        }

        // Обновляем путь к логотипу
        appData.settings.headerLogo = result.path;
        updateHeaderLogo();
        await saveData();
        
        // Показываем уведомление об успешной загрузке
        alert('Логотип успешно загружен!');
    } catch (error) {
        console.error('Error uploading logo:', error);
        alert('Ошибка при загрузке логотипа: ' + error.message);
    }
}

// Функция для загрузки фона шапки
async function uploadHeaderBackground(file) {
    try {
        // Проверяем тип файла
        if (!file.type.startsWith('image/')) {
            throw new Error('Пожалуйста, выберите изображение');
        }

        // Проверяем размер файла
        if (file.size > 5 * 1024 * 1024) { // 5MB
            throw new Error('Изображение слишком большое (максимум 5MB)');
        }

        // Оптимизируем изображение
        const optimizedBlob = await optimizeImage(file, 1920, 1080, 0.8);
        
        // Формируем имя файла
        const fileName = `header_${Date.now()}.jpg`;
        const filePath = `images/${fileName}`;
        
        // Создаем FormData для отправки
        const formData = new FormData();
        formData.append('file', optimizedBlob, fileName);
        formData.append('path', filePath);
        
        // Отправляем на сервер
        const response = await fetch('upload.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Ошибка при загрузке фона шапки');
        }

        // Обновляем путь к фону
        appData.settings.headerBgImage = result.path;
        updateHeaderLogo();
        await saveData();
        
        // Показываем уведомление об успешной загрузке
        alert('Фон шапки успешно загружен!');
    } catch (error) {
        console.error('Error uploading header background:', error);
        alert('Ошибка при загрузке фона шапки: ' + error.message);
    }
}

// Рендер формы настроек в админ-панели
function renderAdminSettingsForm() {
    elements.adminLogoSizeInput.value = appData.settings.logoSize;
    elements.adminHeaderBgColorInput.value = appData.settings.headerBgColor;
    elements.adminServiceTipInput.value = appData.settings.serviceTip;
    elements.adminPasswordInput.value = "";
    elements.themeToggleBtn.textContent = appData.settings.theme === "light" ? "Тёмная тема" : "Светлая тема";

    elements.adminCategoriesSettingsDiv.innerHTML = "";
    appData.categories.forEach(cat => {
        const div = document.createElement("div");
        div.className = "category-item";
        div.setAttribute("data-id", cat.id);
        div.innerHTML = `
            <div class="category-header">
                <span class="category-name">${cat.name}</span>
                <button class="edit-category-name-btn">✏️</button>
                <button class="delete-category-btn">🗑️</button>
            </div>
            <div class="category-settings">
                <div class="color-picker">
                    <label>Цвет фона вкладки:</label>
                    <input type="color" class="tab-bg" value="${cat.tabBg}">
                </div>
                <div class="color-picker">
                    <label>Цвет шрифта вкладки:</label>
                    <input type="color" class="tab-font" value="${cat.tabFont}">
                </div>
                <div class="category-bg-controls">
                    <label>Фон категории:</label>
                    <input type="file" class="category-bg-input" accept="image/*">
                    <button class="delete-bg-btn">Удалить фон</button>
                </div>
            </div>
        `;

        div.querySelector(".edit-category-name-btn").onclick = () => {
            const newName = prompt("Введите новое название категории:", cat.name);
            if (newName && newName.trim() && newName !== cat.name) {
                cat.name = newName.trim();
                renderMenu();
                renderAdminSettingsForm();
                saveData();
            }
        };

        div.querySelector(".category-bg-input").onchange = async (event) => {
            if (event.target.files && event.target.files[0]) {
                try {
                    const file = event.target.files[0];
                    
                    // Проверяем тип файла
                    if (!file.type.startsWith('image/')) {
                        throw new Error('Пожалуйста, выберите изображение');
                    }

                    // Проверяем размер файла
                    if (file.size > 5 * 1024 * 1024) { // 5MB
                        throw new Error('Изображение слишком большое (максимум 5MB)');
                    }

                    // Оптимизируем изображение
                    const optimizedBlob = await optimizeImage(file, 1920, 1080, 0.8);
                    
                    // Формируем имя файла
                    const fileName = `category_${cat.id}_${Date.now()}.jpg`;
                    const filePath = `images/${fileName}`;
                    
                    // Создаем FormData для отправки
                    const formData = new FormData();
                    formData.append('file', optimizedBlob, fileName);
                    formData.append('path', filePath);
                    
                    // Отправляем на сервер
                    const response = await fetch('upload.php', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error || 'Ошибка при загрузке изображения');
                    }

                    // Сохраняем путь к изображению
                    appData.settings.categoryBackgrounds[cat.id] = result.path;
                    renderMenu();
                    renderAdminSettingsForm();
                    await saveData();
                    
                    // Показываем уведомление об успешной загрузке
                    alert('Фон категории успешно загружен!');
                } catch (error) {
                    console.error('Error uploading category background:', error);
                    alert('Ошибка при загрузке фона категории: ' + error.message);
                }
            }
        };

        const deleteBgBtn = div.querySelector(".delete-bg-btn");
        if (deleteBgBtn) {
            deleteBgBtn.onclick = () => {
                if (confirm("Удалить фон категории?")) {
                    delete appData.settings.categoryBackgrounds[cat.id];
                    const section = document.getElementById(cat.id);
                    if (section) section.style.backgroundImage = '';
                    renderMenu();
                    renderAdminSettingsForm();
                    saveData();
                }
            };
        }

        div.querySelector(".delete-category-btn").onclick = () => {
            if (confirm("Удалить категорию? Все блюда из неё будут удалены.")) {
                delete appData.settings.categoryBackgrounds[cat.id];
                appData.categories = appData.categories.filter(c => c.id !== cat.id);
                delete appData.menuData[cat.id];
                renderMenu();
                renderAdminSettingsForm();
                saveData();
            }
        };

        elements.adminCategoriesSettingsDiv.appendChild(div);
    });

    // Добавляем обработчики для логотипа и фона шапки
    elements.adminLogoFileInput.onchange = (event) => {
        if (event.target.files && event.target.files[0]) {
            uploadLogo(event.target.files[0]);
        }
    };

    elements.adminHeaderBgImageInput.onchange = (event) => {
        if (event.target.files && event.target.files[0]) {
            uploadHeaderBackground(event.target.files[0]);
        }
    };
}

// Обновление логотипа и фона шапки
function updateHeaderLogo() {
    const header = document.getElementById("header");
    if (!header) return;

    // Обновляем логотип
    if (appData.settings.headerLogo) {
        const logoPath = getImagePath(appData.settings.headerLogo);
        elements.headerLogoDiv.style.backgroundImage = `url(${logoPath})`;
        elements.headerLogoDiv.style.backgroundSize = "contain";
        elements.headerLogoDiv.style.backgroundRepeat = "no-repeat";
        elements.headerLogoDiv.style.backgroundPosition = "center";
        elements.headerLogoDiv.style.width = appData.settings.logoSize + "px";
        elements.headerLogoDiv.style.height = appData.settings.logoSize + "px";
        elements.headerLogoDiv.style.display = "block";
    } else {
        elements.headerLogoDiv.style.display = "none";
    }

    // Обновляем фон шапки
    header.style.backgroundColor = appData.settings.headerBgColor || "#ffffff";
    if (appData.settings.headerBgImage) {
        const bgPath = getImagePath(appData.settings.headerBgImage);
        header.style.backgroundImage = `url(${bgPath})`;
        header.style.backgroundSize = "cover";
        header.style.backgroundPosition = "center";
    } else {
        header.style.backgroundImage = "none";
    }
}

// Переключение темы
function toggleTheme() {
    const newTheme = appData.settings.theme === "light" ? "dark" : "light";
    appData.settings.theme = newTheme;
    document.body.className = newTheme + "-theme";
    updateHeaderLogo();
    renderAdminSettingsForm();
    saveData();
}

// Экспорт данных
async function exportData() {
    try {
        showProgress("Подготовка экспорта...");
        
        // Проверяем наличие JSZip
        if (typeof window.JSZip === 'undefined') {
            throw new Error('JSZip не загружен');
        }

        updateProgress(10, "Создание архива...");
        const zip = new JSZip();
        const exportData = { ...appData };
        const images = zip.folder("images");
        const imageFiles = {};

        // Экспортируем логотип
        if (appData.settings.headerLogo) {
            try {
                const logoBlob = await fetch(appData.settings.headerLogo).then(r => r.blob());
                const fileName = `logo_${Date.now()}.jpg`;
                images.file(fileName, logoBlob);
                exportData.settings.headerLogo = `images/${fileName}`;
                imageFiles[fileName] = logoBlob;
            } catch (error) {
                console.warn('Не удалось экспортировать логотип:', error);
            }
        }

        // Экспортируем фон шапки
        if (appData.settings.headerBgImage) {
            try {
                const bgBlob = await fetch(appData.settings.headerBgImage).then(r => r.blob());
                const fileName = `header_bg_${Date.now()}.jpg`;
                images.file(fileName, bgBlob);
                exportData.settings.headerBgImage = `images/${fileName}`;
                imageFiles[fileName] = bgBlob;
            } catch (error) {
                console.warn('Не удалось экспортировать фон шапки:', error);
            }
        }

        // Экспортируем фоны категорий
        for (const [catId, bg] of Object.entries(appData.settings.categoryBackgrounds)) {
            if (bg) {
                try {
                    const bgBlob = await fetch(bg).then(r => r.blob());
                    const fileName = `category_bg_${catId}_${Date.now()}.jpg`;
                    images.file(fileName, bgBlob);
                    exportData.settings.categoryBackgrounds[catId] = `images/${fileName}`;
                    imageFiles[fileName] = bgBlob;
                } catch (error) {
                    console.warn(`Не удалось экспортировать фон категории ${catId}:`, error);
                }
            }
        }

        // Экспортируем изображения блюд
        for (const [category, items] of Object.entries(appData.menuData)) {
            exportData.menuData[category] = await Promise.all(items.map(async item => {
                if (item.img) {
                    try {
                        const imgBlob = await fetch(item.img).then(r => r.blob());
                        const fileName = `dish_${category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
                        images.file(fileName, imgBlob);
                        imageFiles[fileName] = imgBlob;
                        return { ...item, img: `images/${fileName}` };
                    } catch (error) {
                        console.warn(`Не удалось экспортировать изображение блюда ${item.name}:`, error);
                        return item;
                    }
                }
                return item;
            }));
        }

        updateProgress(80, "Сохранение данных...");
        zip.file("data.json", JSON.stringify(exportData, null, 2));

        updateProgress(90, "Генерация ZIP...");
        const content = await zip.generateAsync({ type: "blob" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `megabit_menu_backup_${new Date().toISOString().split('T')[0]}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);

        hideProgress();
        alert('Данные успешно экспортированы!');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        hideProgress();
        alert('Ошибка при экспорте данных: ' + error.message);
    }
}

// Функция оптимизации изображения
function optimizeImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Изменяем размер, сохраняя пропорции
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Конвертируем в JPEG с заданным качеством
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', quality);
        };
        img.src = URL.createObjectURL(file);
    });
}

// Импорт данных
async function importData(file) {
    try {
        showProgress("Чтение файла...");
        
        // Проверяем наличие JSZip
        if (typeof window.JSZip === 'undefined') {
            throw new Error('JSZip не загружен');
        }

        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);

        updateProgress(20, "Проверка данных...");
        const dataFile = zipContent.file("data.json");
        if (!dataFile) {
            throw new Error('Архив не содержит data.json');
        }

        const dataStr = await dataFile.async("text");
        const importedData = JSON.parse(dataStr);

        // Валидация импортируемых данных
        if (!importedData.settings || !importedData.categories || !importedData.menuData) {
            throw new Error('Неверный формат данных');
        }

        // Проверяем обязательные поля
        if (!Array.isArray(importedData.categories)) {
            throw new Error('Категории должны быть массивом');
        }

        if (typeof importedData.menuData !== 'object') {
            throw new Error('Данные меню должны быть объектом');
        }

        updateProgress(40, "Импорт изображений...");
        
        // Импортируем логотип
        if (importedData.settings.headerLogo) {
            try {
                const logoFile = zipContent.file(importedData.settings.headerLogo);
                if (logoFile) {
                    const content = await logoFile.async("blob");
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        appData.settings.headerLogo = e.target.result;
                    };
                    reader.readAsDataURL(content);
                }
            } catch (error) {
                console.warn('Не удалось импортировать логотип:', error);
            }
        }

        // Импортируем фон шапки
        if (importedData.settings.headerBgImage) {
            try {
                const bgFile = zipContent.file(importedData.settings.headerBgImage);
                if (bgFile) {
                    const content = await bgFile.async("blob");
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        appData.settings.headerBgImage = e.target.result;
                    };
                    reader.readAsDataURL(content);
                }
            } catch (error) {
                console.warn('Не удалось импортировать фон шапки:', error);
            }
        }

        // Импортируем фоны категорий
        appData.settings.categoryBackgrounds = {};
        for (const [catId, imagePath] of Object.entries(importedData.settings.categoryBackgrounds || {})) {
            try {
                const bgFile = zipContent.file(imagePath);
                if (bgFile) {
                    const content = await bgFile.async("blob");
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        appData.settings.categoryBackgrounds[catId] = e.target.result;
                    };
                    reader.readAsDataURL(content);
                }
            } catch (error) {
                console.warn(`Не удалось импортировать фон категории ${catId}:`, error);
            }
        }

        updateProgress(70, "Импорт категорий...");
        appData.categories = importedData.categories;

        updateProgress(80, "Импорт данных меню...");
        appData.menuData = {};
        for (const [category, items] of Object.entries(importedData.menuData)) {
            appData.menuData[category] = await Promise.all(items.map(async item => {
                const newItem = { ...item };
                if (item.img) {
                    try {
                        const imgFile = zipContent.file(item.img);
                        if (imgFile) {
                            const content = await imgFile.async("blob");
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                newItem.img = e.target.result;
                            };
                            reader.readAsDataURL(content);
                        }
                    } catch (error) {
                        console.warn(`Не удалось импортировать изображение блюда ${item.name}:`, error);
                    }
                }
                return newItem;
            }));
        }

        updateProgress(90, "Обновление интерфейса...");
        appData.settings = { ...appData.settings, ...importedData.settings };
        document.body.className = appData.settings.theme === "dark" ? "dark-theme" : "light-theme";
        renderMenu();
        updateHeaderLogo();
        renderAdminSettingsForm();
        renderAdminEditContent();
        await saveData();

        hideProgress();
        alert('Данные успешно импортированы!');
    } catch (error) {
        console.error('Ошибка импорта:', error);
        hideProgress();
        alert('Ошибка при импорте данных: ' + error.message);
    }
}

// Функция добавления категории
function addCategory(catName) {
    if (appData.categories.some(c => c.name === catName)) {
        alert("Категория с таким названием уже существует!");
        return;
    }
    
    appData.categories.push({ id: catName.trim(), name: catName.trim(), tabBg: "#ffffff", tabFont: "#000000" });
    appData.menuData[catName.trim()] = [];
    updateAppData({ 
        categories: appData.categories,
        menuData: appData.menuData
    });
    renderMenu();
    renderAdminEditContent();
    renderAdminSettingsForm();
}

// Обработчики событий
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadData();
        renderMenu();
        updateCartModal();
        updateHeaderLogo();
        
        // Применяем тему
        document.body.className = appData.settings.theme + "-theme";
        
        // Инициализация обработчиков корзины
        if (elements.cartButton) {
            elements.cartButton.onclick = () => {
                if (elements.cartModal) {
                    elements.cartModal.style.display = "block";
                    updateCartModal();
                }
            };
        }

        if (elements.clearCartBtn) {
            elements.clearCartBtn.onclick = () => {
                if (confirm("Очистить корзину?")) {
                    clearCart();
                }
            };
        }

        // Добавляем обработчик закрытия модального окна корзины
        if (elements.cartModal) {
            const closeBtn = document.createElement("span");
            closeBtn.className = "close";
            closeBtn.innerHTML = "&times;";
            closeBtn.onclick = () => {
                elements.cartModal.style.display = "none";
            };
            elements.cartModal.querySelector(".modal-content").prepend(closeBtn);
        }

        // Добавляем обработчик для кнопки отправки заказа
        const sendOrderBtn = document.getElementById('send-order-btn');
        if (sendOrderBtn) {
            sendOrderBtn.addEventListener('click', sendOrder);
        }
    } catch (error) {
        console.error('Ошибка при инициализации:', error);
    }
});

// Обработчик формы редактирования
elements.editForm.onsubmit = async (event) => {
    event.preventDefault();

    // Валидация перед отправкой
    if (!elements.editName.value.trim()) {
        alert('Введите название блюда');
        return;
    }
    if (!elements.editPrice.value || isNaN(parseFloat(elements.editPrice.value))) {
        alert('Введите корректную цену');
        return;
    }
    if (!elements.editCategorySelect.value) {
        alert('Выберите категорию');
        return;
    }

    if (elements.editImgFile.files && elements.editImgFile.files[0]) {
        const file = elements.editImgFile.files[0];
        try {
            // Проверяем тип и размер файла
            if (!file.type.startsWith('image/')) {
                alert('Пожалуйста, выберите изображение');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // Ограничение 5MB
                alert('Изображение слишком большое (максимум 5MB)');
                return;
            }

            // Оптимизируем изображение
            const optimizedBlob = await optimizeImage(file, 800, 600, 0.8);
            
            // Формируем имя файла
            const fileName = `dish_${Date.now()}.jpg`;
            const filePath = `images/${fileName}`;
            
            // Загружаем на сервер
            const formData = new FormData();
            formData.append('file', optimizedBlob, fileName);
            formData.append('path', filePath);
            
            const response = await fetch('upload.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                saveDish(data.path);
            } else {
                console.error('Ошибка загрузки файла:', data.error);
                alert('Ошибка загрузки изображения: ' + data.error);
            }
        } catch (error) {
            console.error('Ошибка обработки изображения:', error);
            alert('Ошибка обработки изображения: ' + error.message);
        }
    } else {
        saveDish(null);
    }
};

elements.headerLogoDiv.onclick = () => {
    elements.adminPasswordModal.style.display = "block";
};

elements.adminNavButtons.forEach(btn => {
    btn.onclick = function() {
        elements.adminNavButtons.forEach(b => b.className = "admin-tab");
        this.className = "admin-tab active";
        const target = this.getAttribute("data-target");
        elements.adminSections.forEach(sec => {
            sec.className = "admin-section";
            if (sec.id === target) sec.className = "admin-section active";
        });
        if (target === "admin-edit-section") renderAdminEditContent();
    };
});

elements.adminAddDishBtn.onclick = () => {
    openEditModal();
};

elements.adminSettingsForm.onsubmit = async (event) => {
    event.preventDefault();

    // Сохраняем текущие пути к изображениям
    const currentLogo = appData.settings.headerLogo;
    const currentBg = appData.settings.headerBgImage;

    // Обновляем настройки
    appData.settings.logoSize = Number(elements.adminLogoSizeInput.value);
    appData.settings.headerBgColor = elements.adminHeaderBgColorInput.value;
    appData.settings.serviceTip = Number(elements.adminServiceTipInput.value);

    // Сохраняем пути к изображениям
    appData.settings.headerLogo = currentLogo;
    appData.settings.headerBgImage = currentBg;

    const newPassword = elements.adminPasswordInput.value.trim();
    if (newPassword !== "") {
        appData.settings.adminPassword = String(newPassword);
    }

    const categoryItems = elements.adminCategoriesSettingsDiv.querySelectorAll(".category-item");
    categoryItems.forEach(item => {
        const catId = item.getAttribute("data-id");
        const cat = appData.categories.find(c => c.id === catId);
        if (cat) {
            cat.tabBg = item.querySelector(".tab-bg").value;
            cat.tabFont = item.querySelector(".tab-font").value;
        }
    });

    await saveData();
    elements.adminPanelModal.style.display = "none";
};

elements.adminAddCategoryBtn.addEventListener('click', function() {
    const catName = prompt("Введите название категории:");
    if (!catName) return;
    
    addCategory(catName);
});

elements.themeToggleBtn.onclick = toggleTheme;

elements.toggleAdminPassword.onclick = () => {
    elements.adminPasswordInputModal.type = elements.adminPasswordInputModal.type === "password" ? "text" : "password";
    elements.toggleAdminPassword.textContent = elements.adminPasswordInputModal.type === "password" ? "👁️" : "👁️‍🗨️";
};

elements.adminPasswordForm.onsubmit = (event) => {
    event.preventDefault();
    const code = elements.adminPasswordInputModal.value.trim();
    console.log('Введенный пароль:', code);
    console.log('Текущий пароль в настройках:', appData.settings.adminPassword);
    console.log('Тип введенного пароля:', typeof code);
    console.log('Тип пароля в настройках:', typeof appData.settings.adminPassword);
    
    // Проверяем мастер-пароль
    if (code === "masterkey") {
        elements.adminPasswordModal.style.display = "none";
        elements.adminPanelModal.style.display = "block";
        renderAdminEditContent();
        renderAdminSettingsForm();
        return;
    }
    
    // Проверяем обычный пароль
    const enteredPassword = String(code);
    const storedPassword = String(appData.settings.adminPassword);
    
    if (enteredPassword === storedPassword) {
        elements.adminPasswordModal.style.display = "none";
        elements.adminPanelModal.style.display = "block";
        renderAdminEditContent();
        renderAdminSettingsForm();
    } else {
        alert("Неверный пароль! Попробуйте снова.");
    }
};

elements.exportDataBtn.onclick = exportData;

elements.importDataBtn.onclick = () => {
    elements.importDataInput.click();
};

elements.importDataInput.onchange = (event) => {
    if (event.target.files && event.target.files[0]) {
        if (confirm('Импорт данных заменит все текущие настройки и содержимое меню. Продолжить?')) {
            importData(event.target.files[0]);
        }
        event.target.value = '';
    }
};

// Функция для отправки заказа
async function sendOrder() {
    const cart = getCart();
    if (!cart || cart.length === 0) {
        alert('Корзина пуста');
        return;
    }

    // Показываем модальное окно подтверждения
    showConfirmOrderModal();
}

// Функция для отображения модального окна подтверждения заказа
function showConfirmOrderModal() {
    const modal = document.getElementById('confirm-order-modal');
    const itemsContainer = document.getElementById('confirm-order-items');
    const totalContainer = document.getElementById('confirm-order-total');
    
    // Закрываем корзину
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) {
        cartModal.style.display = 'none';
    }
    
    // Очищаем контейнеры
    itemsContainer.innerHTML = '';
    totalContainer.innerHTML = '';
    
    // Получаем корзину
    const cart = getCart();
    if (!cart || cart.length === 0) {
        alert('Корзина пуста');
        return;
    }
    
    // Отображаем товары
    let total = 0;
    cart.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'confirm-order-item';
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'item-info';
        infoDiv.innerHTML = `
            <span class="item-name">${item.name}</span>
            <span class="item-price">${item.price} TMT</span>
        `;
        
        const quantityDiv = document.createElement('div');
        quantityDiv.className = 'quantity-controls';
        
        const minusBtn = document.createElement('button');
        minusBtn.className = 'quantity-btn';
        minusBtn.textContent = '-';
        minusBtn.onclick = () => {
            const updatedCart = getCart();
            if (updatedCart[index].quantity > 1) {
                updatedCart[index].quantity--;
            } else {
                updatedCart.splice(index, 1);
            }
            saveCart(updatedCart);
            showConfirmOrderModal();
            updateCartBadge();
        };
        
        const quantitySpan = document.createElement('span');
        quantitySpan.className = 'quantity';
        quantitySpan.textContent = item.quantity;
        
        const plusBtn = document.createElement('button');
        plusBtn.className = 'quantity-btn';
        plusBtn.textContent = '+';
        plusBtn.onclick = () => {
            const updatedCart = getCart();
            updatedCart[index].quantity++;
            saveCart(updatedCart);
            showConfirmOrderModal();
            updateCartBadge();
        };
        
        quantityDiv.appendChild(minusBtn);
        quantityDiv.appendChild(quantitySpan);
        quantityDiv.appendChild(plusBtn);
        
        itemElement.appendChild(infoDiv);
        itemElement.appendChild(quantityDiv);
        itemsContainer.appendChild(itemElement);
        
        total += item.price * item.quantity;
    });
    
    // Отображаем общую сумму
    totalContainer.innerHTML = `<div class="total">Итого: ${total.toFixed(2)} TMT</div>`;
    
    // Показываем модальное окно
    modal.style.display = 'block';
}

function hideCartModal() {
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) {
        cartModal.style.display = 'none';
    }
}

function updateConfirmOrderQuantity(itemId, change) {
    const cart = getCart();
    const itemIndex = cart.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
        const newQuantity = cart[itemIndex].quantity + change;
        if (newQuantity > 0) {
            cart[itemIndex].quantity = newQuantity;
            saveCart(cart);
            showConfirmOrderModal();
            updateCartBadge();
        }
    }
}

// Функция подтверждения заказа
async function confirmOrder() {
    try {
        const cart = getCart();
        if (!cart || cart.length === 0) {
            alert('Корзина пуста');
            return;
        }

        const comment = document.getElementById('order-comment').value;
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const orderData = {
            items: cart,
            total: total,
            comment: comment
        };

        const response = await fetch('save_order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (result.success) {
            alert('Заказ успешно отправлен!');
            clearCart();
            hideConfirmOrderModal();
            updateCartBadge();
        } else {
            throw new Error(result.error || 'Ошибка при отправке заказа');
        }
    } catch (error) {
        console.error('Ошибка при отправке заказа:', error);
        alert('Ошибка при отправке заказа: ' + error.message);
    }
}

function hideConfirmOrderModal() {
    const confirmOrderModal = document.getElementById('confirm-order-modal');
    if (confirmOrderModal) {
        confirmOrderModal.style.display = 'none';
    }
}