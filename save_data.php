<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Получаем данные из POST-запроса
    $input = file_get_contents('php://input');
    if ($input === false) {
        throw new Exception('Failed to read input data');
    }

    // Декодируем JSON
    $data = json_decode($input, true);
    if ($data === null) {
        throw new Exception('Invalid JSON data');
    }

    // Преобразуем числовые значения
    function convertNumericValues($data) {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    $data[$key] = convertNumericValues($value);
                } else if (is_string($value) && is_numeric($value)) {
                    $data[$key] = floatval($value);
                }
            }
        }
        return $data;
    }

    $data = convertNumericValues($data);

    // Сохраняем данные в файл
    $result = file_put_contents('data.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    if ($result === false) {
        throw new Exception('Failed to save data.json');
    }

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 