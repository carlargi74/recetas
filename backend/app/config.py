from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    secret_key: str = "inseguro-cambiar-en-produccion"
    admin_username: str = "admin"
    admin_password: str = "cambiame"
    data_dir: Path = Path("./data")
    token_expire_days: int = 30
    max_upload_mb: int = 500

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def media_dir(self) -> Path:
        return self.data_dir / "media"

    @property
    def videos_dir(self) -> Path:
        return self.media_dir / "videos"

    @property
    def images_dir(self) -> Path:
        return self.media_dir / "images"


settings = Settings()

for d in (settings.data_dir, settings.media_dir, settings.videos_dir, settings.images_dir):
    d.mkdir(parents=True, exist_ok=True)
