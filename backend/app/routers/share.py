from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Menu, Recipe, ShoppingList
from ..schemas import MenuOut, RecipeOut, ShoppingListOut
from .menus import menu_to_out
from .shopping import ItemCheck, list_to_out, set_item_checked

router = APIRouter(prefix="/api/share", tags=["share"])


@router.get("/menu/{token}", response_model=MenuOut)
def get_shared_menu(token: str, db: Session = Depends(get_db)):
    menu = db.scalar(select(Menu).where(Menu.share_token == token))
    if menu is None or menu.status != "ready":
        raise HTTPException(status_code=404, detail="Menú no encontrado")
    out = menu_to_out(db, menu)
    # En el enlace público no se exponen los datos personales de los perfiles
    out.profiles = []
    return out


@router.get("/list/{token}", response_model=ShoppingListOut)
def get_shared_list(token: str, db: Session = Depends(get_db)):
    shopping_list = db.scalar(select(ShoppingList).where(ShoppingList.share_token == token))
    if shopping_list is None:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    return list_to_out(db, shopping_list)


@router.post("/list/{token}/items/{item_id}", response_model=ShoppingListOut)
def check_shared_item(token: str, item_id: str, body: ItemCheck, db: Session = Depends(get_db)):
    shopping_list = db.scalar(select(ShoppingList).where(ShoppingList.share_token == token))
    if shopping_list is None:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    set_item_checked(db, shopping_list, item_id, body.checked)
    return list_to_out(db, shopping_list)


@router.get("/{token}", response_model=RecipeOut)
def get_shared_recipe(token: str, db: Session = Depends(get_db)):
    recipe = db.scalar(select(Recipe).where(Recipe.share_token == token))
    if recipe is None or recipe.status != "ready":
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return recipe
