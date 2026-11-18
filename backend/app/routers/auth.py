from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..schemas import LoginIn, PasswordChangeIn
from ..security import (
    COOKIE_NAME,
    RateLimiter,
    client_ip,
    current_user,
    hash_password,
    require_admin_header,
    set_session_cookie,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
login_limiter = RateLimiter(limit=10, window=900)


def user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "is_active": u.is_active}


@router.post("/login", dependencies=[Depends(require_admin_header)])
def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    if not login_limiter.allow(client_ip(request)):
        raise HTTPException(429, "Слишком много попыток входа. Подождите 15 минут.")
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.strip().lower()))
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Неверный email или пароль")
    set_session_cookie(response, user.id)
    return user_out(user)


@router.post("/logout")
def logout(response: Response):
    # Сессия на сервере не хранится: токен истекает по времени (см. app/security.py)
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return user_out(user)


@router.post("/password", dependencies=[Depends(require_admin_header)])
def change_password(payload: PasswordChangeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, "Текущий пароль указан неверно")
    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    return {"ok": True}
