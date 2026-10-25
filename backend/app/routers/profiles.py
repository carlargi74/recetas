from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Profile, User
from ..schemas import ProfileIn, ProfileOut

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

VALID_SEX = {"hombre", "mujer", "otro"}
VALID_ACTIVITY = {"sedentario", "ligero", "moderado", "activo", "muy_activo"}


def _validate(body: ProfileIn, db: Session) -> None:
    if body.sex and body.sex not in VALID_SEX:
        raise HTTPException(status_code=400, detail="Sexo no válido")
    if body.activity_level and body.activity_level not in VALID_ACTIVITY:
        raise HTTPException(status_code=400, detail="Nivel de actividad no válido")
    if body.user_id and db.get(User, body.user_id) is None:
        raise HTTPException(status_code=400, detail="Usuario vinculado no encontrado")


@router.get("", response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.scalars(select(Profile).order_by(Profile.created_at)).all()


@router.post("", response_model=ProfileOut)
def create_profile(body: ProfileIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _validate(body, db)
    profile = Profile(**body.model_dump(), created_by=user.id)
    db.add(profile)
    db.commit()
    return profile


@router.get("/{profile_id}", response_model=ProfileOut)
def get_profile(profile_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    profile = db.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return profile


@router.put("/{profile_id}", response_model=ProfileOut)
def update_profile(
    profile_id: str,
    body: ProfileIn,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    profile = db.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    _validate(body, db)
    for field, value in body.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    return profile


@router.delete("/{profile_id}")
def delete_profile(profile_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    profile = db.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    db.delete(profile)
    db.commit()
    return {"ok": True}
