// Функции для работы с заказами
const Orders = {
    // Получить все заказы
    getAll: function() {
        return JSON.parse(localStorage.getItem('orders') || '[]');
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
            
            const orders = this.getAll();
            console.log('Текущие заказы:', orders);
            
            // Преобразуем orderId в число для сравнения
            const numericOrderId = typeof orderId === 'string' ? parseInt(orderId) : orderId;
            console.log('Ищем заказ с ID:', numericOrderId);
            
            const orderIndex = orders.findIndex(order => {
                // Преобразуем ID заказа в число для сравнения
                const orderNumericId = typeof order.id === 'string' ? parseInt(order.id) : order.id;
                console.log('Сравниваем:', { orderNumericId, numericOrderId });
                return orderNumericId === numericOrderId;
            });
            
            console.log('Индекс найденного заказа:', orderIndex);
            
            if (orderIndex !== -1) {
                console.log('Обновляем статус заказа:', orders[orderIndex]);
                orders[orderIndex].status = newStatus;
                
                try {
                    localStorage.setItem('orders', JSON.stringify(orders));
                    console.log('Заказы успешно сохранены в localStorage');
                    return true;
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
        const filteredOrders = orders.filter(order => order.id !== orderId);
        localStorage.setItem('orders', JSON.stringify(filteredOrders));
    },

    // Получить статистику
    getStats: function() {
        const orders = this.getAll();
        const stats = {
            total: orders.length,
            new: orders.filter(o => o.status === 'new').length,
            inProgress: orders.filter(o => o.status === 'in_progress').length,
            completed: orders.filter(o => o.status === 'completed').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            totalAmount: orders.reduce((sum, order) => sum + order.total, 0)
        };
        return stats;
    }
}; 