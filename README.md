# AgroRobot Frontend

Веб-интерфейс управления AgroRobot. Проект представляет собой статический frontend для конечного устройства робота: страница открывается в браузере с ноутбука, планшета или телефона в той же локальной сети и управляет backend-сервисом, который работает на вычислительном модуле робота.

![Скриншот интерфейса AgroRobot](2026-04-25%20152721.png)

## Роль в системе

Frontend является публичной точкой входа в проект AgroRobot. Остальные части системы могут находиться в private-репозиториях и предоставляться по запросу, но этот интерфейс показывает общую архитектуру, сценарии управления и связь с робототехническими модулями.

Интерфейс работает как тонкий клиент:

- отображает видеопоток с камеры робота;
- запускает обработку изображения и детекцию сорняков;
- отправляет команды delta-роботу;
- управляет механизмом изменения ширины шасси;
- управляет поворотным механизмом колес;
- запускает калибровку отдельных контроллеров;
- показывает логи, события и состояние команд;
- позволяет выбрать serial-порт, через который backend общается с RS-485 шиной.

## Связанные части проекта

- Backend робота: https://github.com/ErlanAyapov/agro-robot-backend
- Прошивка delta-робота: https://github.com/ErlanAyapov/delta-robot-firmware
- Прошивка механизма ширины: https://github.com/ErlanAyapov/robot-width-firmware
- Прошивка поворотного механизма: https://github.com/ErlanAyapov/turn-firmware

Прошивки управляют STM32-контроллерами нижнего уровня. Backend работает на вычислительном устройстве робота, объединяет компьютерное зрение, API и Modbus RTU команды. Frontend обращается к backend по HTTP/WebSocket.

## Развертывание на конечном устройстве

На роботе frontend размещается как статический сайт под Nginx. Это удобно для полевого использования: устройство робота подключается к локальной сети или поднимает свою сеть, после чего оператор открывает интерфейс с любого другого устройства в этой сети.

Типовая схема:

```text
Телефон / ноутбук оператора
        |
        |  http://<robot-ip>/
        v
Nginx на вычислительном модуле робота
        |
        |  статические файлы frontend
        v
index.html, static/, bootstrap/, images/

Браузер дополнительно обращается к:
http://<robot-ip>:8000/api/v1
ws://<robot-ip>:8000/api/v1/ws
```

Текущая логика `index.html` автоматически берет host из адреса страницы:

```js
const API_HOST = IS_FILE_MODE || !window.location.hostname ? "127.0.0.1" : window.location.hostname;
const API_BASE = `${API_PROTOCOL}://${API_HOST}:8000`;
const API_V1 = `${API_BASE}/api/v1`;
```

То есть если оператор открыл `http://192.168.1.50/`, frontend будет обращаться к backend по `http://192.168.1.50:8000/api/v1`. Поэтому backend должен быть доступен на порту `8000`, а Nginx должен отдавать статические файлы frontend.

## Пример Nginx-конфигурации

Пример для размещения frontend в `/var/www/agro-robot/frontend`:

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/agro-robot/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        try_files $uri =404;
    }

    location /bootstrap/ {
        try_files $uri =404;
    }

    location /images/ {
        try_files $uri =404;
    }
}
```

Backend при этом запускается отдельно:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Если нужно скрыть порт `8000` и проксировать API через Nginx, можно добавить reverse proxy для `/api/` и `/ws`, но текущий frontend уже рассчитан на прямое обращение к `:8000`.

## Структура проекта

- `index.html` - основной интерфейс и JavaScript-логика.
- `static/style.css` - стили интерфейса.
- `static/sw.js` - service worker для кеширования статических ресурсов.
- `static/manifest.webmanifest` - PWA manifest.
- `bootstrap/` - локальная копия Bootstrap CSS/JS.
- `images/` - логотипы, favicon и иконки приложения.
- `2026-04-25 152721.png` - скриншот интерфейса.

Проект не требует сборщика. Для запуска достаточно отдать каталог статическим веб-сервером.

## Основные экраны и функции

- `Dashboard` - основной экран управления и видеопотока.
- `Калибровать` - запуск калибровки модулей:
  - delta-робот, slave `1`;
  - поворотный механизм, slave `2`;
  - ширина шасси, slave `3`.
- `Подключение` - выбор serial-порта backend для RS-485.
- `Координация` - ручная отправка XYZ-координат delta-роботу.
- `Лимит` - управление механизмом сужения/расширения.
- `Поворот` - управление поворотным механизмом колес.
- `Настройки видео` - параметры зоны обработки, поворота координат, инверсии осей и confidence детекции.

## API, используемое интерфейсом

Frontend обращается к backend по `/api/v1`:

- `GET /api/v1/system/ports` - список доступных serial-портов.
- `POST /api/v1/system/port` - выбор активного serial-порта.
- `GET /api/v1/robot/state` - агрегированное состояние робота.
- `POST /api/v1/delta/home` - калибровка/выход delta-робота в рабочую позицию.
- `POST /api/v1/delta/move` - ручное перемещение delta-робота по X/Y/Z.
- `GET /api/v1/platform-width/state` - состояние механизма ширины.
- `POST /api/v1/platform-width/target` - установка целевой ширины.
- `POST /api/v1/platform-width/stop` - остановка механизма ширины.
- `GET /api/v1/platform-turn/state` - состояние поворотного механизма.
- `POST /api/v1/platform-turn/calibrate` - калибровка поворотного механизма.
- `POST /api/v1/platform-turn/target-angle` - установка целевого угла колес.
- `POST /api/v1/vision/start` и `POST /api/v1/vision/stop` - управление видеопайплайном.
- `GET /api/v1/vision/video` - сырой MJPEG-видеопоток.
- `GET /api/v1/vision/processed-video` - видеопоток с детекцией и опциональной отправкой команд.
- `GET /api/v1/vision/visualize-video` - визуализация на тестовом видео.
- `GET/POST /api/v1/vision/zone` - чтение и настройка зоны обработки.
- `GET/POST /api/v1/system/settings/robot` - настройки координат, инверсии осей и confidence.
- `WS /api/v1/ws` - события команд, fault-события и агрегированное состояние.

## Сетевой сценарий

1. На вычислительном модуле робота запускается backend на `0.0.0.0:8000`.
2. Nginx отдает frontend на `80` порту.
3. Оператор подключается к той же сети, что и робот.
4. Оператор открывает `http://<robot-ip>/`.
5. Браузер загружает статический интерфейс с Nginx.
6. Интерфейс обращается к `http://<robot-ip>:8000/api/v1`.
7. Backend через USB/RS-485 отправляет Modbus RTU команды на STM32-контроллеры.

## Локальный запуск для разработки

Самый простой вариант:

```bash
python -m http.server 8080
```

Затем открыть:

```text
http://127.0.0.1:8080/
```

При открытии файла напрямую через `file://` frontend использует `127.0.0.1:8000` как адрес backend.

## Контакты

Рекомендованный способ связи: Telegram `@yerlan_ayapov`.

Email:

- `E.Ayapov@stud.satbayev.university`
- `www.yerlan4@gmail.com`
