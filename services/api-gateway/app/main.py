from fastapi import Body, Depends, FastAPI, Request
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm

from app.config import settings
from app.proxy import forward_request
from app.security import require_token

app = FastAPI(title=settings.SERVICE_NAME)


@app.get("/health", summary="Gateway health check", description="Check whether the API Gateway is running successfully.")
def health_check():
    return {"status": "ok", "service": settings.SERVICE_NAME}


# Auth service
@app.post(
    "/api/auth/register",
    summary="Register user",
    description="Register a new user in the auth-service.",
)
async def auth_register(request: Request, payload: dict = Body(...)):
    return await forward_request(request, settings.AUTH_SERVICE_URL, "auth/register", json_body=payload)


@app.post(
    "/api/auth/login",
    summary="Login user",
    description="Login and receive a JWT access token from the auth-service.",
)
async def auth_login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    form_body = {"username": form_data.username, "password": form_data.password}
    return await forward_request(request, settings.AUTH_SERVICE_URL, "auth/login", form_body=form_body)


@app.get(
    "/api/auth/me",
    summary="Get current user",
    description="Get the current authenticated user from the auth-service.",
)
async def auth_me(request: Request, _: dict = Depends(require_token)):
    return await forward_request(request, settings.AUTH_SERVICE_URL, "auth/me")


@app.get(
    "/api/users",
    summary="List users",
    description="Get all users from the auth-service.",
)
async def auth_users(request: Request, _: dict = Depends(require_token)):
    return await forward_request(request, settings.AUTH_SERVICE_URL, "users")


# Product service
@app.post(
    "/api/products",
    summary="Create product",
    description="Create a new product in the product-service. Requires JWT.",
)
async def create_product(request: Request, payload: dict = Body(...), _: dict = Depends(require_token)):
    return await forward_request(request, settings.PRODUCT_SERVICE_URL, "products", json_body=payload)


@app.get(
    "/api/products",
    summary="List products",
    description="Get all products from the product-service.",
)
async def list_products(request: Request):
    return await forward_request(request, settings.PRODUCT_SERVICE_URL, "products")


@app.get(
    "/api/products/{product_id}",
    summary="Get product by id",
    description="Get a single product by its id from the product-service.",
)
async def get_product(product_id: int, request: Request):
    return await forward_request(request, settings.PRODUCT_SERVICE_URL, f"products/{product_id}")


@app.put(
    "/api/products/{product_id}",
    summary="Update product",
    description="Update an existing product in the product-service. Requires JWT.",
)
async def update_product(product_id: int, request: Request, payload: dict = Body(...), _: dict = Depends(require_token)):
    return await forward_request(request, settings.PRODUCT_SERVICE_URL, f"products/{product_id}", json_body=payload)


@app.delete(
    "/api/products/{product_id}",
    summary="Delete product",
    description="Delete a product from the product-service. Requires JWT.",
)
async def delete_product(product_id: int, request: Request, _: dict = Depends(require_token)):
    return await forward_request(request, settings.PRODUCT_SERVICE_URL, f"products/{product_id}")


# Order service
@app.post(
    "/api/orders",
    summary="Create order",
    description="Create an order in the order-service. Requires JWT.",
)
async def create_order(request: Request, payload: dict = Body(...), _: dict = Depends(require_token)):
    return await forward_request(request, settings.ORDER_SERVICE_URL, "orders", json_body=payload)


@app.get(
    "/api/orders",
    summary="List orders",
    description="Get current user's orders from the order-service. Requires JWT.",
)
async def list_orders(request: Request, _: dict = Depends(require_token)):
    return await forward_request(request, settings.ORDER_SERVICE_URL, "orders")


@app.get(
    "/api/orders/{order_id}",
    summary="Get order by id",
    description="Get a single order by id from the order-service. Requires JWT.",
)
async def get_order(order_id: int, request: Request, _: dict = Depends(require_token)):
    return await forward_request(request, settings.ORDER_SERVICE_URL, f"orders/{order_id}")


# Notification service
@app.get(
    "/api/notifications",
    summary="List notifications",
    description="Get notifications from the notification-service. Requires JWT.",
)
async def list_notifications(request: Request, _: dict = Depends(require_token)):
    return await forward_request(request, settings.NOTIFICATION_SERVICE_URL, "notifications")


@app.get(
    "/api/notifications/{notification_id}",
    summary="Get notification by id",
    description="Get a single notification by id from the notification-service. Requires JWT.",
)
async def get_notification(notification_id: int, request: Request, _: dict = Depends(require_token)):
    return await forward_request(request, settings.NOTIFICATION_SERVICE_URL, f"notifications/{notification_id}")
