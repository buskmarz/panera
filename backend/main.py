import os
import sys
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from mangum import Mangum

# Ensure function directory is on sys.path for Netlify runtime imports.
function_dir = Path(__file__).resolve().parent
if str(function_dir) not in sys.path:
    sys.path.insert(0, str(function_dir))

import models, database, auth

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()
handler = Mangum(app)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

AUTH_USERNAME = os.getenv("APP_USERNAME", "panera1")
AUTH_PASSWORD = os.getenv("APP_PASSWORD", "panque123")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None or username != AUTH_USERNAME:
            raise credentials_exception
    except auth.JWTError:
        raise credentials_exception
    return {"username": username, "role": "admin"}

# Pydantic Models (Schemas)
class Token(BaseModel):
    access_token: str
    token_type: str

class SaleCreate(BaseModel):
    id: str
    folio: str
    fecha: str
    clienteId: Optional[str] = None
    clienteNombre: Optional[str] = None
    canal: Optional[str] = None
    subtotal: float
    descuento: float
    total: float
    saldo: float
    estatusPago: str
    estatusEntrega: str
    notas: Optional[str] = None
    entrega: Optional[dict] = None
    envioMetodo: Optional[str] = None
    items: List[dict]
    pagos: List[dict]

# Auth Endpoints
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username != AUTH_USERNAME or form_data.password != AUTH_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": AUTH_USERNAME}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register")
def register():
    raise HTTPException(status_code=403, detail="Registration disabled")

@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"], "role": current_user["role"]}

# Data Endpoints
@app.get("/api/sales")
def get_sales(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Sale).all()

@app.post("/api/sales")
def create_sale(sale: SaleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_sale = db.query(models.Sale).filter(models.Sale.id == sale.id).first()
    if db_sale:
        # Update existing
        for key, value in sale.dict().items():
            setattr(db_sale, key, value)
    else:
        # Create new
        db_sale = models.Sale(**sale.dict())
        db.add(db_sale)
    db.commit()
    return {"status": "ok"}

@app.delete("/api/sales/{sale_id}")
def delete_sale(sale_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db.query(models.Sale).filter(models.Sale.id == sale_id).delete()
    db.commit()
    return {"status": "deleted"}

# ... (Similar endpoints for Clients, Products, Expenses, etc. - adding basic ones for now)

@app.get("/api/clients")
def get_clients(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Client).all()

@app.post("/api/clients")
def create_client(client: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Simplified for brevity, normally use Pydantic model
    db_client = db.query(models.Client).filter(models.Client.id == client['id']).first()
    if db_client:
        for k,v in client.items(): setattr(db_client, k, v)
    else:
        db.add(models.Client(**client))
    db.commit()
    return {"status": "ok"}

@app.get("/api/products")
def get_products(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Product).all()

@app.post("/api/products")
def create_product(product: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Simplified
    # Check if exists by ID or Name? Using ID for now if provided, else auto-increment
    # For initial seed, we might need special handling.
    # Assuming products come with ID or we let DB handle it.
    # If product has no ID, it's new.
    if 'id' in product and product['id']:
        db_prod = db.query(models.Product).filter(models.Product.id == product['id']).first()
        if db_prod:
             for k,v in product.items(): setattr(db_prod, k, v)
        else:
             db.add(models.Product(**product))
    else:
        db.add(models.Product(**product))
    db.commit()
    return {"status": "ok"}

# Serve Frontend
# Mount assets only when running with local static files available.
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
assets_dir = os.path.join(base_dir, "assets")
if os.path.isdir(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Serve index.html and login.html
from fastapi.responses import FileResponse

@app.get("/")
async def read_index():
    index_path = os.path.join(base_dir, "index.html")
    if not os.path.isfile(index_path):
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(index_path)

@app.get("/login")
async def read_login():
    login_path = os.path.join(base_dir, "login.html")
    if not os.path.isfile(login_path):
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(login_path)

from datetime import timedelta
