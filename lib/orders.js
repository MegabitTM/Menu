// Функции для работы с заказами
const Orders = {
    // Инициализация
    init: async function() {
        try {
            // Загружаем заказы из orders.json
            const response = await fetch('orders.json');
            if (response.ok) {
                const orders = await response.json();
                if (Array.isArray(orders)) {
                    // Сохраняем в localStorage
                    localStorage.setItem('orders', JSON.stringify(orders));
                    console.log('Заказы загружены из orders.json');
                }
            }
        } catch (error) {
            console.error('Ошибка при загрузке orders.json:', error);
        }
    },

    // Получить все заказы
    getAll: function() {
        try {
            const ordersStr = localStorage.getItem('orders');
            if (!ordersStr) {
                console.log('В localStorage нет заказов');
                return [];
            }
            const orders = JSON.parse(ordersStr);
            if (!Array.isArray(orders)) {
                console.error('Данные в localStorage не являются массивом');
                return [];
            }
            return orders;
        } catch (error) {
            console.error('Ошибка при получении заказов:', error);
            return [];
        }
    },

    // Сохранить все заказы
    saveAll: async function(orders) {
        try {
            // Сохраняем в localStorage
            localStorage.setItem('orders', JSON.stringify(orders));
            
            // Сохраняем в orders.json
            const response = await fetch('orders.json', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orders)
            });
            
            if (!response.ok) {
                console.error('Ошибка при сохранении в orders.json');
            }
        } catch (error) {
            console.error('Ошибка при сохранении заказов:', error);
        }
    },

    // Получить заказы по статусу
    getByStatus: function(status) {
        const orders = this.getAll();
        return orders.filter(order => order.status === status);
    },

    // Обновить статус заказа
    updateStatus: async function(orderId, newStatus) {
        try {
            console.log('Orders.updateStatus вызван с параметрами:', { orderId, newStatus });
            
            // Получаем текущие заказы
            const orders = this.getAll();
            console.log('Текущие заказы:', orders);
            
            // Находим индекс заказа
            const orderIndex = orders.findIndex(order => String(order.id) === String(orderId));
            
            console.log('Индекс найденного заказа:', orderIndex);
            
            if (orderIndex !== -1) {
                console.log('Текущий статус заказа:', orders[orderIndex].status);
                console.log('Новый статус:', newStatus);
                
                // Обновляем статус
                orders[orderIndex].status = newStatus;
                orders[orderIndex].updated_at = Math.floor(Date.now() / 1000);
                
                // Сохраняем обновленные заказы
                await this.saveAll(orders);
                
                // Проверяем, что данные сохранились
                const savedOrders = this.getAll();
                const savedOrder = savedOrders.find(o => String(o.id) === String(orderId));
                
                if (savedOrder && savedOrder.status === newStatus) {
                    console.log('Статус успешно обновлен и сохранен');
                    return true;
                } else {
                    console.error('Ошибка при проверке сохраненных данных');
                    return false;
                }
            }
            
            console.log('Заказ не найден');
            return false;
        } catch (error) {
            console.error('Ошибка в updateStatus:', error);
            return false;
        }
    },

    // Удалить заказ
    delete: async function(orderId) {
        const orders = this.getAll();
        const filteredOrders = orders.filter(order => String(order.id) !== String(orderId));
        await this.saveAll(filteredOrders);
    },

    // Получить статистику
    getStats: function() {
        const orders = this.getAll();
        return {
            total: orders.length,
            new: orders.filter(o => o.status === 'new').length,
            preparing: orders.filter(o => o.status === 'preparing').length,
            completed: orders.filter(o => o.status === 'completed').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            totalAmount: orders.reduce((sum, order) => sum + (order.total || 0), 0)
        };
    }
};

// Инициализируем при загрузке
Orders.init(); 