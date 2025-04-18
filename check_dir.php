<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$response = [
    'writable' => false,
    'error' => ''
];

// Проверяем существование директории
if (!file_exists('images')) {
    // Пытаемся создать директорию
    if (!mkdir('images', 0777, true)) {
        $response['error'] = 'Не удалось создать директорию images';
        echo json_encode($response);
        exit;
    }
}

// Проверяем права на запись
if (!is_writable('images')) {
    $response['error'] = 'Нет прав на запись в директорию images';
    echo json_encode($response);
    exit;
}

$response['writable'] = true;
echo json_encode($response); 