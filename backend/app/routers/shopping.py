import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..auth import get_current_user
from ..database import get_db
from ..models import Menu, ShoppingList, User
from ..schemas import ShareResponse, ShoppingListCreate, ShoppingListOut, ShoppingListSummary
from ..services.shopping import create_shopping_list

router = APIRouter(prefix="/api/shopping-lists", tags=["shopping"])


class ItemCheck(BaseModel):
    checked: bool


def list_to_out(db: Session, shopping_list: ShoppingList) -> ShoppingListOut:
    out = ShoppingListOut.model_validate(shopping_list, from_attributes=True)
    if shopping_list.menu_id:
        menu = db.get(Menu, shopping_list.menu_id)
        out.menu_title = menu.title if menu else None
    return out


def set_item_checked(db: Session, shopping_list: ShoppingList, item_id: str, checked: bool) -> None:
    for section in shopping_list.sections or []:
        for item in section.get("items", []):
            if item.get("id") == item_id:
                item["checked"] = checked
                flag_modified(shopping_list, "sections")
                db.commit()
                return
    raise HTTPException(status_code=404, detail="Artículo no encontrado")


@router.get("", response_model=list[ShoppingListSummary])
def list_shopping_lists(
    menu_id: str = "",
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(ShoppingList).order_by(ShoppingList.created_at.desc())
    if menu_id:
        query = query.where(ShoppingList.menu_id == menu_id)
    return db.scalars(query).all()


@router.post("", response_model=ShoppingListOut)
def create_list(body: ShoppingListCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    shopping_list = create_shopping_list(db, body, user)
    return list_to_out(db, shopping_list)


@router.get("/{list_id}", response_model=ShoppingListOut)
def get_list(list_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    shopping_list = db.get(ShoppingList, list_id)
    if shopping_list is None:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    return list_to_out(db, shopping_list)


@router.delete("/{list_id}")
def delete_list(list_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    shopping_list = db.get(ShoppingList, list_id)
    if shopping_list is None:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    db.delete(shopping_list)
    db.commit()
    return {"ok": True}


@router.post("/{list_id}/items/{item_id}", response_model=ShoppingListOut)
def check_item(
    list_id: str,
    item_id: str,
    body: ItemCheck,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    shopping_list = db.get(ShoppingList, list_id)
    if shopping_list is None:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    set_item_checked(db, shopping_list, item_id, body.checked)
    return list_to_out(db, shopping_list)


@router.post("/{list_id}/share", response_model=ShareResponse)
def enable_share(list_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    shopping_list = db.get(ShoppingList, list_id)
    if shopping_list is None:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    if not shopping_list.share_token:
        shopping_list.share_token = secrets.token_urlsafe(16)
        db.commit()
    return ShareResponse(share_token=shopping_list.share_token)


@router.delete("/{list_id}/share", response_model=ShareResponse)
def disable_share(list_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    shopping_list = db.get(ShoppingList, list_id)
    if shopping_list is None:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    shopping_list.share_token = None
    db.commit()
    return ShareResponse(share_token=None)
