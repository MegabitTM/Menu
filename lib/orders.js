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
        const orders = this.getAll();
        // Преобразуем orderId в число для сравнения
        const numericOrderId = typeof orderId === 'string' ? parseInt(orderId) : orderId;
        const orderIndex = orders.findIndex(order => {
            // Преобразуем ID заказа в число для сравнения
            const orderNumericId = typeof order.id === 'string' ? parseInt(order.id) : order.id;
            return orderNumericId === numericOrderId;
        });
        
        if (orderIndex !== -1) {
            orders[orderIndex].status = newStatus;
            localStorage.setItem('orders', JSON.stringify(orders));
            return true;
        }
        return false;
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