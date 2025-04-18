<?php
header('Content-Type: image/jpeg');

$width = 300;
$height = 200;
$image = imagecreatetruecolor($width, $height);

// Создаем цвета
$bg = imagecolorallocate($image, 240, 240, 240);
$text = imagecolorallocate($image, 150, 150, 150);

// Заполняем фон
imagefill($image, 0, 0, $bg);

// Добавляем текст
$text = "No Image";
$font = 5;
$text_width = imagefontwidth($font) * strlen($text);
$text_height = imagefontheight($font);
$x = ($width - $text_width) / 2;
$y = ($height - $text_height) / 2;
imagestring($image, $font, $x, $y, $text, $text);

// Выводим изображение
imagejpeg($image);
imagedestroy($image); 