import subprocess
from pathlib import Path


def get_duration_seconds(video_path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            str(video_path),
        ],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


def _extract_frame(video_path: Path, timestamp: float, out_path: Path, width: int = 720) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-ss", f"{timestamp:.2f}",
            "-i", str(video_path),
            "-frames:v", "1",
            "-vf", f"scale={width}:-2",
            "-q:v", "3",
            str(out_path),
        ],
        capture_output=True, check=True,
    )


def extract_frames(video_path: Path, out_dir: Path, basename: str, count: int = 6) -> list[str]:
    """Extrae fotogramas repartidos por el video. Devuelve los nombres de archivo."""
    duration = get_duration_seconds(video_path)
    filenames: list[str] = []
    for i in range(count):
        ts = duration * (i + 0.5) / count
        name = f"{basename}_f{i + 1}.jpg"
        _extract_frame(video_path, ts, out_dir / name)
        filenames.append(name)
    return filenames


def extract_thumbnail(video_path: Path, out_dir: Path, basename: str) -> str:
    """Extrae una miniatura hacia el final del video (suele mostrarse el plato terminado)."""
    duration = get_duration_seconds(video_path)
    name = f"{basename}_thumb.jpg"
    _extract_frame(video_path, duration * 0.85, out_dir / name, width=960)
    return name
