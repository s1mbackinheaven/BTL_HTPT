# Microservice Food Ordering Project

A FastAPI-based microservice system for food ordering, designed for the distributed systems course/project.

## Table of Contents
- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Services](#services)
- [Ports](#ports)
- [Features](#features)
- [Requirements](#requirements)
- [Environment Variables](#environment-variables)
- [Run with Docker Compose](#run-with-docker-compose)
- [Run Services Locally with Python Virtual Environments](#run-services-locally-with-python-virtual-environments)
- [API Gateway](#api-gateway)
- [How the Flows Work](#how-the-flows-work)
- [Testing Guide](#testing-guide)
- [RabbitMQ Dashboard](#rabbitmq-dashboard)
- [Database Guide](#database-guide)
- [Troubleshooting](#troubleshooting)
- [Project Status vs Requirements](#project-status-vs-requirements)

## Project Overview
This project demonstrates a microservice architecture with:
- synchronous communication using RESTful APIs
- asynchronous communication using RabbitMQ
- independently deployable services
- business-flow testing across services
- request and message logging for observability

## Architecture
The system is composed of the following services:
- `api-gateway`
- `auth-service`
- `product-service`
- `order-service`
- `notification-service`
- `mysql`
- `rabbitmq`

### High-level flow
- Client talks to `api-gateway`
- `api-gateway` forwards requests to internal services
- `auth-service` handles authentication and JWT issuing
- `product-service` handles product CRUD
- `order-service` handles order creation and publishes `order.created` events
- `notification-service` consumes `order.created` events and stores notifications

## Services
### `api-gateway`
Single entry point for the client.
- Routes requests to the right service
- Exposes clean Swagger docs for each route
- Validates JWT for protected routes
- Forwards JSON/form bodies correctly

### `auth-service`
Authentication and user management.
- register user
- login user
- get current user (`/auth/me`)
- list users (`/users`)
- issues JWT access tokens

### `product-service`
Product management.
- create product
- list products
- get product by id
- update product
- delete product
- admin-only write operations

### `order-service`
Order management.
- create order
- list current user's orders
- get order by id
- computes total amount from product data
- publishes `order.created` events to RabbitMQ

### `notification-service`
Notification management.
- consumes `order.created` events
- stores notifications in MySQL
- exposes APIs to view notifications

## Ports
### Host ports
- `api-gateway` -> `8000`
- `auth-service` -> `8001`
- `product-service` -> `8002`
- `order-service` -> `8003`
- `notification-service` -> `8004`
- `mysql` -> `3307` on host, mapped to `3306` inside container
- `rabbitmq management UI` -> `15672`
- `rabbitmq AMQP` -> `5672`

## Features
- JWT authentication
- role-based access control for product CRUD
- RESTful synchronous communication
- RabbitMQ-based asynchronous event handling
- independent services with separate databases
- Swagger UI for every service and for the gateway
- logging for requests and message consumption

## Requirements
### System requirements
- Windows 10/11, Linux, or macOS
- Docker Desktop
- Python 3.11+
- PowerShell / bash / terminal

### Python packages
Each service has its own `requirements.txt`.

## Environment Variables
You can use `.env` files or environment variables.

### Shared environment values
```env
MYSQL_HOST=localhost
MYSQL_PORT=3307
MYSQL_USER=root
MYSQL_PASSWORD=adminmySQL2004
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
JWT_SECRET=change_me_please
JWT_ALGORITHM=HS256
AUTH_DB_NAME=auth_db
PRODUCT_DB_NAME=product_db
ORDER_DB_NAME=order_db
NOTIFICATION_DB_NAME=notification_db
AUTH_SERVICE_PORT=8001
PRODUCT_SERVICE_PORT=8002
ORDER_SERVICE_PORT=8003
NOTIFICATION_SERVICE_PORT=8004
GATEWAY_PORT=8000
```

## Run with Docker Compose
This is the recommended way to run the whole system.

### 1) Start containers
From the project root:

```bash
docker compose up -d --build
```

This starts:
- MySQL
- RabbitMQ
- auth-service
- product-service
- order-service
- notification-service
- api-gateway

### 2) Check containers

```bash
docker compose ps
```

### 3) Open Swagger UI
- API Gateway: `http://localhost:8000/docs`
- Auth service: `http://localhost:8001/docs`
- Product service: `http://localhost:8002/docs`
- Order service: `http://localhost:8003/docs`
- Notification service: `http://localhost:8004/docs`

### 4) Open RabbitMQ management UI
- `http://localhost:15672`
- username: `guest`
- password: `guest`

### 5) Stop containers

```bash
docker compose down
```

### 6) Remove volumes if you want a clean database reset
Warning: this deletes MySQL data.

```bash
docker compose down -v
```

## Run Services Locally with Python Virtual Environments
You can also run each service directly using Python and virtual environments.

## Global setup notes
- MySQL should still be running on `localhost:3307`
- RabbitMQ should be available on `localhost:5672`
- Each service uses its own `.venv`

---

## 1) `auth-service`
### Create and activate venv
```bash
cd services/auth-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Run service
```bash
uvicorn app.main:app --reload --port 8001
```

---

## 2) `product-service`
### Create and activate venv
```bash
cd services/product-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Run service
```bash
uvicorn app.main:app --reload --port 8002
```

---

## 3) `order-service`
### Create and activate venv
```bash
cd services/order-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Run service
```bash
uvicorn app.main:app --reload --port 8003
```

---

## 4) `notification-service`
### Create and activate venv
```bash
cd services/notification-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Run service
```bash
uvicorn app.main:app --reload --port 8004
```

---

## 5) `api-gateway`
### Create and activate venv
```bash
cd services/api-gateway
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Run gateway
```bash
uvicorn app.main:app --reload --port 8000
```

## API Gateway
The gateway is the single entry point for client requests.

### Gateway routes
#### Auth
- `POST /api/auth/register` -> register a new user
- `POST /api/auth/login` -> login and get JWT token
- `GET /api/auth/me` -> get current user
- `GET /api/users` -> list users

#### Products
- `POST /api/products` -> create product (JWT required)
- `GET /api/products` -> list products
- `GET /api/products/{product_id}` -> get product by id
- `PUT /api/products/{product_id}` -> update product (JWT required)
- `DELETE /api/products/{product_id}` -> delete product (JWT required)

#### Orders
- `POST /api/orders` -> create order (JWT required)
- `GET /api/orders` -> list current user orders (JWT required)
- `GET /api/orders/{order_id}` -> get order by id (JWT required)

#### Notifications
- `GET /api/notifications` -> list notifications (JWT required)
- `GET /api/notifications/{notification_id}` -> get notification by id (JWT required)

### Swagger behavior
- Each route is exposed individually, not as a wildcard route
- `POST/PUT` routes show request bodies properly
- `POST /api/auth/login` uses form input (`username` and `password`) because the auth service expects OAuth2 form data

## How the Flows Work

### 1) Authentication flow
1. Client registers via `POST /api/auth/register`
2. Client logs in via `POST /api/auth/login`
3. Auth service returns JWT access token
4. Client uses token in `Authorize` dialog for protected routes

### 2) Product flow
1. Admin logs in and gets JWT token
2. Admin creates/updates/deletes product through gateway
3. Product service verifies token and role
4. Product data is stored in `product_db`

### 3) Order flow
1. User logs in and gets JWT token
2. User creates order through gateway
3. `order-service` fetches product price from `product-service`
4. `order-service` calculates total amount
5. Order is stored in `order_db`
6. `order-service` publishes `order.created` event to RabbitMQ

### 4) Notification flow
1. `notification-service` consumes `order.created` from RabbitMQ
2. Notification is created and stored in `notification_db`
3. The notification status starts as `unread`
4. Client can view notifications through the API

## Testing Guide

## A) Test authentication
### 1. Register user
Call through gateway:
```http
POST http://localhost:8000/api/auth/register
```

Example body:
```json
{
  "full_name": "Test User",
  "email": "test@gmail.com",
  "password": "123456",
  "phone": "0912345678"
}
```

### 2. Login
Call through gateway:
```http
POST http://localhost:8000/api/auth/login
```

In Swagger, use form fields:
- `username` = email
- `password` = password

### 3. Authorize in Swagger
Paste token into `Authorize` dialog.

For gateway Swagger, paste only the token value if Swagger adds `Bearer` automatically.

### 4. Get current user
```http
GET http://localhost:8000/api/auth/me
```

---

## B) Test product CRUD
### 1. Create product as admin
```http
POST http://localhost:8000/api/products
```

Example body:
```json
{
  "name": "Com ga",
  "description": "Com ga xoi mo",
  "price": 45000,
  "category": "food",
  "image_url": "https://example.com/comga.jpg",
  "is_available": true
}
```

### 2. List products
```http
GET http://localhost:8000/api/products
```

### 3. Get product by id
```http
GET http://localhost:8000/api/products/1
```

### 4. Update product as admin
```http
PUT http://localhost:8000/api/products/1
```

### 5. Delete product as admin
```http
DELETE http://localhost:8000/api/products/1
```

---

## C) Test order flow
### 1. Login user and authorize
Use a normal user token.

### 2. Create order
```http
POST http://localhost:8000/api/orders
```

Example body:
```json
{
  "user_id": 1,
  "order_items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ]
}
```

### 3. List orders
```http
GET http://localhost:8000/api/orders
```

### 4. Get order by id
```http
GET http://localhost:8000/api/orders/1
```

---

## D) Test notification flow
After creating an order:
1. check `notification-service` logs
2. check RabbitMQ queue state
3. query notifications

### List notifications
```http
GET http://localhost:8000/api/notifications
```

### Get notification by id
```http
GET http://localhost:8000/api/notifications/1
```

## RabbitMQ Dashboard
Open:
- `http://localhost:15672`

Default login:
- username: `guest`
- password: `guest`

### Useful items to check
- exchange: `order_exchange`
- queue: `notification_queue`
- routing key: `order.created`
- message count and consumer state

## Database Guide
Each service has its own MySQL database.

### Databases
- `auth_db`
- `product_db`
- `order_db`
- `notification_db`

### MySQL host/port
If running locally with Docker Compose:
- host: `localhost`
- port: `3307`

Inside Docker network, services use:
- host: `mysql`
- port: `3306`

### Init script
`init-mysql.sql` creates all databases automatically on first MySQL container startup.

## Logging / Observability
The project includes logs for:
- HTTP requests in each FastAPI service
- RabbitMQ consumer startup
- RabbitMQ event processing
- order creation and notification processing

You can monitor:
- service terminal output
- Docker logs
- RabbitMQ dashboard
- MySQL data directly

## Troubleshooting

### 1. `Unknown database 'auth_db'`
Possible causes:
- MySQL container not initialized yet
- wrong MySQL port
- wrong connection target

Fix:
- ensure MySQL is running on port `3307` from the host
- restart containers if needed
- verify `init-mysql.sql` was mounted

### 2. `Invalid or expired token`
Possible causes:
- wrong JWT secret
- token from an old login session
- malformed token

Fix:
- login again and copy a fresh token
- ensure all services use the same `JWT_SECRET`

### 3. `Missing token`
Possible causes:
- no `Authorization` header
- token not attached in Swagger Authorize
- route not protected properly

Fix:
- re-open Swagger
- click `Authorize`
- paste the token correctly

### 4. `Stream consumed`
Possible cause:
- request body read more than once in gateway

Fix:
- gateway now forwards `json_body` and `form_body` explicitly

### 5. Login returns `Invalid email or password`
Possible causes:
- wrong credentials
- user not registered yet

Fix:
- register first
- login with the same email/password

### 6. Notification not created
Possible causes:
- RabbitMQ not running
- order not published
- notification consumer not started

Fix:
- verify RabbitMQ dashboard
- check `order-service` logs
- check `notification-service` logs

## Project Status vs Requirements

### 1. Giao tiếp đồng bộ bằng RESTful API
**Đã đáp ứng.**

Evidence:
- `api-gateway` routes to each service via REST
- services expose REST endpoints
- `order-service` calls `product-service` through REST to get product data
- `auth-service` handles login/register through REST

### 2. Giao tiếp bất đồng bộ bằng message queue
**Đã đáp ứng.**

Evidence:
- `order-service` publishes `order.created`
- `notification-service` consumes `order.created`
- RabbitMQ is used as message broker

### 3. Triển khai được nhiều service chạy độc lập
**Đã đáp ứng.**

Evidence:
- each service has its own FastAPI app
- each service has its own port
- each service has its own database
- each service can run individually with its own virtual environment or via Docker Compose

### 4. Có cơ chế kiểm thử luồng nghiệp vụ liên service
**Đã đáp ứng.**

Evidence:
- test flow covers:
  - register/login
  - create product
  - create order
  - publish RabbitMQ event
  - consume notification
  - query notifications
- gateway Swagger helps test end-to-end business flow

### 5. Có log để theo dõi request và message
**Đã đáp ứng.**

Evidence:
- FastAPI/Uvicorn request logs are visible in terminals
- order publish logs can be monitored
- notification consumer logs show message processing
- RabbitMQ dashboard shows queue/exchange state

## Summary
This project satisfies the requested microservice requirements:
- synchronous REST communication
- asynchronous message queue communication
- independently running services
- business flow testing across services
- logging for request and message tracking

## Suggested Demo Flow
1. Start Docker Compose
2. Open gateway Swagger
3. Register a user
4. Login and get token
5. Create an admin product
6. Create an order
7. Check notification logs
8. Query notifications
9. Show RabbitMQ dashboard
10. Show MySQL tables/data

---

If you want, I can also add:
- a short `Presentation Notes` section for defending the project,
- a `Run Order` checklist,
- or a `System Diagram` section in text form for your report.