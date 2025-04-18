// Функция для форматирования даты
function formatDate(dateString) {
    try {
        // Проверяем, что дата не слишком далеко в будущем
        const date = new Date(dateString);
        const currentYear = new Date().getFullYear();
        const maxFutureYear = currentYear + 10; // Максимум 10 лет в будущее
        
        if (date.getFullYear() > maxFutureYear) {
            return 'Некорректная дата';
        }
        
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error('Ошибка форматирования даты:', e);
        return 'Некорректная дата';
    }
}

// Функция для загрузки заказов
async function loadOrders() {
    try {
        const response = await fetch('php/get_orders.php');
        if (!response.ok) {
            throw new Error('Ошибка загрузки заказов');
        }
        
        const orders = await response.json();
        const ordersContainer = document.getElementById('orders-container');
        
        if (!ordersContainer) {
            console.error('Контейнер заказов не найден');
            return;
        }
        
        ordersContainer.innerHTML = '';
        
        orders.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'order-card';
            orderElement.innerHTML = `
                <div class="order-header">
                    <h3>Заказ #${order.id}</h3>
                    <span class="order-date">${formatDate(order.date)}</span>
                </div>
                <div class="order-details">
                    <p><strong>Статус:</strong> ${order.status}</p>
                    <p><strong>Сумма:</strong> ${order.total} ₽</p>
                </div>
            `;
            ordersContainer.appendChild(orderElement);
        });
    } catch (error) {
        console.error('Ошибка при загрузке заказов:', error);
        const ordersContainer = document.getElementById('orders-container');
        if (ordersContainer) {
            ordersContainer.innerHTML = '<p class="error">Ошибка загрузки заказов</p>';
        }
    }
}

// Загружаем заказы при загрузке страницы
document.addEventListener('DOMContentLoaded', loadOrders);

// Обновляем заказы каждые 30 секунд
setInterval(loadOrders, 30000); 