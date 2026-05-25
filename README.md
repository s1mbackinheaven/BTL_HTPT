# Microservice Food Ordering Project

## Services
- `auth-service` on port `8001`
- `product-service` on port `8002`
- `order-service` on port `8003`
- `notification-service` on port `8004`

## Infrastructure
- MySQL
- RabbitMQ

## Notes
Each service uses its own MySQL database:
- `auth_db`
- `product_db`
- `order_db`
- `notification_db`

RabbitMQ is used for the asynchronous flow from `order-service` to `notification-service`.
