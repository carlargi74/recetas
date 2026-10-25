from pathlib import Path

import yt_dlp


def download_video(url: str, dest_dir: Path, basename: str) -> Path:
    """Descarga el video de la URL (TikTok, Instagram, YouTube...) y devuelve la ruta local."""
    opts = {
        "outtmpl": str(dest_dir / f"{basename}.%(ext)s"),
        "format": "mp4/bestvideo*+bestaudio/best",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])

    matches = sorted(dest_dir.glob(f"{basename}.*"))
    if not matches:
        raise RuntimeError("La descarga terminó pero no se encontró el archivo de video")
    return matches[0]
