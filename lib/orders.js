// Функции для работы с заказами
const Orders = {
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

    // Получить заказы по статусу
    getByStatus: function(status) {
        const orders = this.getAll();
        return orders.filter(order => order.status === status);
    },

    // Обновить статус заказа
    updateStatus: function(orderId, newStatus) {
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
                
                try {
                    // Сохраняем обновленные заказы
                    const ordersStr = JSON.stringify(orders);
                    console.log('Сохранение заказов:', ordersStr);
                    localStorage.setItem('orders', ordersStr);
                    
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
                } catch (error) {
                    console.error('Ошибка при сохранении в localStorage:', error);
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
    delete: function(orderId) {
        const orders = this.getAll();
        const filteredOrders = orders.filter(order => String(order.id) === String(orderId));
        localStorage.setItem('orders', JSON.stringify(filteredOrders));
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