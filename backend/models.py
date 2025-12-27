from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user") # admin, user

class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, index=True) # Using String ID to match frontend UUIDs or we can switch to Integer
    nombre = Column(String, index=True)
    telefono = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    notas = Column(Text, nullable=True)
    creadoEn = Column(String, default=datetime.utcnow().isoformat)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    categoria = Column(String, index=True)
    producto = Column(String, index=True)
    variantes = Column(JSON) # Storing variants as JSON: {"MINI": 220, "CH": 390}
    activo = Column(Boolean, default=True)

class Sale(Base):
    __tablename__ = "sales"

    id = Column(String, primary_key=True, index=True)
    folio = Column(String, unique=True, index=True)
    fecha = Column(String, index=True) # ISO format
    clienteId = Column(String, ForeignKey("clients.id"), nullable=True)
    clienteNombre = Column(String)
    canal = Column(String)
    subtotal = Column(Float)
    descuento = Column(Float)
    total = Column(Float)
    saldo = Column(Float)
    estatusPago = Column(String)
    estatusEntrega = Column(String)
    notas = Column(Text, nullable=True)
    entrega = Column(JSON) # {metodo, fecha, dir}
    envioMetodo = Column(String)
    items = Column(JSON) # List of items
    pagos = Column(JSON) # List of payments

    # Relationships
    # client = relationship("Client") # Optional, if we want strict FK

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, index=True)
    fecha = Column(String, index=True)
    categoria = Column(String, index=True)
    proveedor = Column(String, nullable=True)
    metodo = Column(String)
    monto = Column(Float)
    desc = Column(String, nullable=True)

class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    nombre = Column(String)
    fecha = Column(String)
    relevante = Column(Boolean, default=False)

class Config(Base):
    __tablename__ = "config"

    key = Column(String, primary_key=True, index=True)
    value = Column(JSON)
