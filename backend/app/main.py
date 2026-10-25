import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from starlette.exceptions import HTTPException as StarletteHTTPException

from .auth import hash_password
from .config import settings
from .database import Base, SessionLocal, engine, ensure_columns
from .models import User
from .routers import auth, menus, profiles, recipes, share, shopping, users
from .services.pipeline import enqueue_missing_nutrition

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def bootstrap_admin() -> None:
    """Crea el usuario administrador inicial si no existe ningún usuario."""
    db = SessionLocal()
    try:
        if db.scalar(select(User).limit(1)) is None:
            db.add(
                User(
                    username=settings.admin_username.strip().lower(),
                    display_name=settings.admin_username,
                    password_hash=hash_password(settings.admin_password),
                    is_admin=True,
                )
            )
            db.commit()
            logger.info("Usuario administrador '%s' creado", settings.admin_username)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_columns()
    bootstrap_admin()
    if settings.gemini_api_key:
        pending = enqueue_missing_nutrition()
        if pending:
            logger.info("Calculando valores nutricionales de %d recetas en segundo plano", pending)
    yield


app = FastAPI(title="Recetas", docs_url=None, redoc_url=None, lifespan=lifespan)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(recipes.router)
app.include_router(profiles.router)
app.include_router(menus.router)
app.include_router(shopping.router)
app.include_router(share.router)

# Los archivos multimedia usan nombres UUID no adivinables
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


class SPAStaticFiles(StaticFiles):
    """Sirve el frontend y devuelve index.html para las rutas del router de React."""

    async def get_response(self, path: str, scope):
        try:
            response = await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise
        if response.status_code == 404:
            return await super().get_response("index.html", scope)
        return response


static_dir = Path(__file__).resolve().parent.parent / "static"
if static_dir.is_dir():
    app.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="spa")
