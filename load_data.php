<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    if (!file_exists('data.json')) {
        // Если файл не существует, создаем его с пустой структурой
        $defaultData = [
            'categories' => [],
            'menuData' => [],
            'settings' => [
                'theme' => 'light',
                'categoryBackgrounds' => [],
                'headerBackground' => '',
                'logo' => ''
            ]
        ];
        file_put_contents('data.json', json_encode($defaultData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    $data = file_get_contents('data.json');
    if ($data === false) {
        throw new Exception('Failed to read data.json');
    }

    echo $data;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 