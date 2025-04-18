<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Путь к файлу с заказами
$ordersFile = 'orders.json';

// Проверяем существование файла
if (!file_exists($ordersFile)) {
    echo json_encode([]); // Возвращаем пустой массив, если файл не существует
    exit;
}

// Читаем содержимое файла
$ordersContent = file_get_contents($ordersFile);

// Проверяем, что содержимое является валидным JSON
$orders = json_decode($ordersContent, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка при разборе JSON: ' . json_last_error_msg()]);
    exit;
}

// Сортируем заказы по времени (новые сверху)
usort($orders, function($a, $b) {
    return $b['timestamp'] - $a['timestamp'];
});

// Отправляем заказы
echo json_encode($orders);
?> 