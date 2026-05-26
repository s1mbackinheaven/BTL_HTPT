from fastapi import Body, Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm

from app.config import settings
from app.correlation import get_request_id
from app.logging_utils import configure_logging, get_logger
from app.monitoring import ServiceCheck, check_service_health
from app.proxy import forward_request
from app.request_logging import RequestLoggingMiddleware
from app.security import require_token

configure_logging("api-gateway")
logger = get_logger("api-gateway")

app = FastAPI(title=settings.SERVICE_NAME)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)


@app.get("/health", summary="Gateway health check", description="Check whether the API Gateway is running successfully.")
def health_check():
    logger.info("health check requested request_id=%s", get_request_id())
    return {"status": "ok", "service": settings.SERVICE_NAME}


@app.get("/dashboard", response_class=HTMLResponse, summary="Service monitoring dashboard", description="Show health status of all core services in one page.")
async def dashboard():
    services = [
        ServiceCheck(name="auth-service", url=settings.AUTH_SERVICE_URL),
        ServiceCheck(name="product-service", url=settings.PRODUCT_SERVICE_URL),
        ServiceCheck(name="order-service", url=settings.ORDER_SERVICE_URL),
        ServiceCheck(name="notification-service", url=settings.NOTIFICATION_SERVICE_URL),
    ]
    results = await __import__("asyncio").gather(*(check_service_health(service) for service in services))
    healthy_count = sum(1 for item in results if item["status"] == "healthy")
    total_count = len(results)
    overall = "healthy" if healthy_count == total_count else "degraded" if healthy_count > 0 else "down"

    rows = "".join(
        f"""
        <tr>
            <td>{item['name']}</td>
            <td><code>{item['url']}</code></td>
            <td><span class='badge {item['status']}'>{item['status']}</span></td>
            <td>{item['http_status'] if item['http_status'] is not None else '-'}</td>
            <td>{item['response_time_ms']} ms</td>
            <td>{item['payload'].get('service', '-') if item['payload'] else '-'}</td>
            <td>{item['error'] or '-'}</td>
        </tr>
        """
        for item in results
    )

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Service Monitoring Dashboard</title>
        <style>
            :root {{
                --bg: #0f172a;
                --panel: #111827;
                --card: #1f2937;
                --text: #e5e7eb;
                --muted: #9ca3af;
                --green: #22c55e;
                --yellow: #f59e0b;
                --red: #ef4444;
                --blue: #38bdf8;
                --border: #334155;
            }}
            * {{ box-sizing: border-box; }}
            body {{ margin: 0; font-family: Inter, system-ui, sans-serif; background: linear-gradient(180deg, #0b1120, #111827); color: var(--text); }}
            .container {{ max-width: 1200px; margin: 0 auto; padding: 32px 20px 48px; }}
            .header {{ display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }}
            .title h1 {{ margin: 0 0 8px; font-size: 32px; }}
            .title p {{ margin: 0; color: var(--muted); }}
            .summary {{ display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }}
            .card {{ background: rgba(17, 24, 39, 0.8); border: 1px solid var(--border); border-radius: 16px; padding: 18px; box-shadow: 0 20px 40px rgba(0,0,0,.2); }}
            .card .label {{ color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }}
            .card .value {{ font-size: 28px; font-weight: 700; margin-top: 10px; }}
            .table-wrap {{ overflow-x: auto; }}
            table {{ width: 100%; border-collapse: collapse; background: rgba(17, 24, 39, 0.8); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }}
            th, td {{ padding: 14px 12px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; font-size: 14px; }}
            th {{ color: #cbd5e1; background: rgba(15, 23, 42, 0.8); position: sticky; top: 0; }}
            code {{ color: #7dd3fc; }}
            .badge {{ display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; font-weight: 600; text-transform: capitalize; }}
            .badge.healthy {{ background: rgba(34, 197, 94, .15); color: #86efac; }}
            .badge.degraded {{ background: rgba(245, 158, 11, .15); color: #fcd34d; }}
            .badge.down {{ background: rgba(239, 68, 68, .15); color: #fca5a5; }}
            .footer {{ margin-top: 18px; color: var(--muted); font-size: 13px; }}
            @media (max-width: 900px) {{ .summary {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }} }}
            @media (max-width: 640px) {{ .summary {{ grid-template-columns: 1fr; }} .header {{ flex-direction: column; align-items: flex-start; }} }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="title">
                    <h1>Service Monitoring Dashboard</h1>
                    <p>Live health overview for core microservices behind the API Gateway.</p>
                </div>
                <div class="card">
                    <div class="label">Overall status</div>
                    <div class="value"><span class="badge {overall}">{overall}</span></div>
                </div>
            </div>

            <div class="summary">
                <div class="card"><div class="label">Total services</div><div class="value">{total_count}</div></div>
                <div class="card"><div class="label">Healthy</div><div class="value" style="color: var(--green)">{healthy_count}</div></div>
                <div class="card"><div class="label">Degraded</div><div class="value" style="color: var(--yellow)">{sum(1 for item in results if item['status'] == 'degraded')}</div></div>
                <div class="card"><div class="label">Down</div><div class="value" style="color: var(--red)">{sum(1 for item in results if item['status'] == 'down')}</div></div>
            </div>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>URL</th>
                            <th>Status</th>
                            <th>HTTP</th>
                            <th>Latency</th>
                            <th>Payload</th>
                            <th>Error</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
            </div>
            <div class="footer">Refresh this page to re-check service health.</div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


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
