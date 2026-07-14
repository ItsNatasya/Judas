from flask import Blueprint, request, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt,
)

from database.extensions import db, limiter
from models.admin_user import AdminUser
from models.audit_log import AuditLog
from utils.response import ok, bad_request, unauthorized_credentials, unauthorized_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/auth/login")
@limiter.limit("10/minute")
def login():
    """
    Login Admin
    ---
    tags: [Auth]
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [username, password]
          properties:
            username: {type: string}
            password: {type: string}
    responses:
      200:
        description: Login berhasil, mengembalikan accessToken & refreshToken
    """
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    if not username or not password:
        return bad_request(detail="Field username dan password wajib diisi.")

    user = AdminUser.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return unauthorized_credentials(detail="Username atau password yang Anda masukkan salah.")

    claims = {"role": user.role}
    access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=claims)

    db.session.add(AuditLog(admin_username=username, action="LOGIN", ip_address=request.remote_addr))
    db.session.commit()

    return ok({
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "expiresIn": int(current_app.config["JWT_ACCESS_TOKEN_EXPIRES"].total_seconds()),
        "role": user.role,
    }, "Login berhasil.")


@auth_bp.post("/auth/refresh")
@jwt_required(refresh=True)
def refresh():
    """
    Refresh Token
    ---
    tags: [Auth]
    security: [{Bearer: []}]
    responses:
      200:
        description: Access token baru
    """
    identity = get_jwt_identity()
    claims = get_jwt()
    new_access_token = create_access_token(identity=identity, additional_claims={"role": claims.get("role")})
    return ok({
        "accessToken": new_access_token,
        "expiresIn": int(current_app.config["JWT_ACCESS_TOKEN_EXPIRES"].total_seconds()),
    }, "Token berhasil diperbarui.")


@auth_bp.post("/auth/logout")
@jwt_required()
def logout():
    """
    Logout Admin
    ---
    tags: [Auth]
    security: [{Bearer: []}]
    responses:
      200:
        description: Logout berhasil
    """
    claims = get_jwt()
    db.session.add(AuditLog(
        admin_username=claims.get("sub"), action="LOGOUT", ip_address=request.remote_addr
    ))
    db.session.commit()
    return ok(None, "Logout berhasil.")
