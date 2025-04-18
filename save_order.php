<?php
header('Content-Type: application/json');

// Включаем отображение ошибок для отладки
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Функция для логирования
function logError($message, $data = null) {
    $logMessage = date('Y-m-d H:i:s') . " - " . $message;
    if ($data) {
        $logMessage .= "\nData: " . print_r($data, true);
    }
    error_log($logMessage . "\n", 3, "order_errors.log");
}

try {
    // Получаем данные из POST-запроса
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // Проверяем валидность данных
    if (!$data || !isset($data['items']) || !is_array($data['items']) || empty($data['items'])) {
        throw new Exception('Неверный формат данных заказа');
    }

    // Генерируем уникальный ID заказа
    $orderId = uniqid('ORDER_');
    
    // Добавляем timestamp и ID к данным заказа
    $orderData = [
        'id' => $orderId,
        'timestamp' => time(),
        'items' => $data['items'],
        'total' => $data['total'],
        'comment' => $data['comment'] ?? '',
        'status' => 'new'
    ];

    // Путь к файлу с заказами
    $ordersFile = 'orders.json';
    $orders = [];
    
    // Читаем существующие заказы, если файл существует
    if (file_exists($ordersFile)) {
        $ordersContent = file_get_contents($ordersFile);
        $orders = json_decode($ordersContent, true) ?? [];
    }
    
    // Добавляем новый заказ
    $orders[] = $orderData;
    
    // Сохраняем обновленный список заказов
    if (file_put_contents($ordersFile, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        throw new Exception('Не удалось сохранить заказ');
    }

    // Отправляем успешный ответ
    echo json_encode([
        'success' => true,
        'orderId' => $orderId,
        'message' => 'Заказ успешно сохранен'
    ]);

} catch (Exception $e) {
    logError($e->getMessage(), $data ?? null);
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?> 