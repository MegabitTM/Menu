<?php
header('Content-Type: application/json');

// Получаем данные из POST-запроса
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['orderId']) || !isset($input['status'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Неверные данные']);
    exit;
}

$orderId = $input['orderId'];
$newStatus = $input['status'];

// Проверяем допустимые статусы
$validStatuses = ['new', 'preparing', 'ready', 'completed'];
if (!in_array($newStatus, $validStatuses)) {
    http_response_code(400);
    echo json_encode(['error' => 'Неверный статус']);
    exit;
}

// Функция для обновления статуса заказа
function updateOrderStatus($orderId, $newStatus) {
    $ordersFile = 'orders.json';
    
    if (!file_exists($ordersFile)) {
        return false;
    }
    
    $orders = json_decode(file_get_contents($ordersFile), true);
    if (!$orders) {
        return false;
    }
    
    $orderFound = false;
    foreach ($orders as &$order) {
        if ($order['id'] === $orderId) {
            $order['status'] = $newStatus;
            $order['updated_at'] = time();
            $orderFound = true;
            break;
        }
    }
    
    if (!$orderFound) {
        return false;
    }
    
    return file_put_contents($ordersFile, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) !== false;
}

// Обновляем статус заказа
if (updateOrderStatus($orderId, $newStatus)) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Заказ не найден']);
}
?> 