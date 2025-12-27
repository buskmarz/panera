from fastapi.testclient import TestClient
from backend.main import app
from backend import models
from backend.database import Base, engine, SessionLocal
import pytest

# Create test db
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_register_and_login():
    # Register
    username = "testuser"
    password = "testpassword"
    response = client.post("/register", json={"username": username, "password": password})
    assert response.status_code == 200
    assert "access_token" in response.json()

    # Login
    response = client.post("/token", data={"username": username, "password": password})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return token

def test_create_sale():
    token = test_register_and_login()
    headers = {"Authorization": f"Bearer {token}"}
    
    sale_data = {
        "id": "sale1",
        "folio": "PAN-0001",
        "fecha": "2023-10-27T10:00:00",
        "subtotal": 100.0,
        "descuento": 0.0,
        "total": 100.0,
        "saldo": 0.0,
        "estatusPago": "Pagado",
        "estatusEntrega": "Entregado",
        "items": [{"prod": "Cake", "cant": 1, "precio": 100}],
        "pagos": [{"monto": 100, "metodo": "Efectivo"}]
    }
    
    response = client.post("/api/sales", json=sale_data, headers=headers)
    assert response.status_code == 200
    
    # Get sales
    response = client.get("/api/sales", headers=headers)
    assert response.status_code == 200
    sales = response.json()
    assert len(sales) > 0
    assert sales[0]["folio"] == "PAN-0001"

if __name__ == "__main__":
    # Manual run if needed
    try:
        test_create_sale()
        print("Tests passed!")
    except Exception as e:
        print(f"Tests failed: {e}")
