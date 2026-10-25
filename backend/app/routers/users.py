from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_admin_user, hash_password
from ..database import get_db
from ..models import User
from ..schemas import PasswordChange, UserCreate, UserOut

router = APIRouter(prefix="/api/users", tags=["users"], dependencies=[Depends(get_admin_user)])


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.created_at)).all()


@router.post("", response_model=UserOut)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    username = body.username.strip().lower()
    if db.scalar(select(User).where(User.username == username)):
        raise HTTPException(status_code=409, detail="Ese nombre de usuario ya existe")
    user = User(
        username=username,
        display_name=body.display_name.strip() or username,
        password_hash=hash_password(body.password),
        is_admin=body.is_admin,
    )
    db.add(user)
    db.commit()
    return user


@router.post("/{user_id}/password")
def reset_password(user_id: str, body: PasswordChange, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(user)
    db.commit()
    return {"ok": True}
