from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
import logging

from sqlalchemy.orm import Session

from app.db.session import get_db, translate_integrity_error

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    InvitationPreviewResponse,
    AcceptInvitationRequest,
)

from app.services.auth_service import AuthService, DisabledAccountError, DuplicateEmailError
from app.services.invitation_service import (
    InvitationService,
    InvitationNotFoundError,
    DuplicateInvitationEmailError,
)
from app.core.security import create_access_token

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

logger = logging.getLogger(__name__)


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    service = AuthService(db)

    try:
        with translate_integrity_error(db, "Organization name already exists"):
            token = service.register(
                email=request.email,
                first_name=request.first_name,
                last_name=request.last_name,
                password=request.password,
                organization_name=request.organization_name,
            )
    except DuplicateEmailError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):

    service = AuthService(db)

    try:
        token = service.login(
            request.email,
            request.password
        )
    except DisabledAccountError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/invitations/{token}", response_model=InvitationPreviewResponse)
def preview_invitation(token: str, db: Session = Depends(get_db)):
    invitation = InvitationService(db).get_valid_by_token(token)
    if invitation is None:
        raise HTTPException(404, "Invitation not found or no longer valid")
    return {
        "organization_name": invitation.organization.name,
        "email": invitation.email,
    }


@router.post("/invitations/{token}/accept", response_model=TokenResponse)
def accept_invitation(
    token: str,
    request: AcceptInvitationRequest,
    db: Session = Depends(get_db),
):
    service = InvitationService(db)

    try:
        user = service.accept(
            token=token,
            first_name=request.first_name,
            last_name=request.last_name,
            password=request.password,
        )
    except InvitationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DuplicateInvitationEmailError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {
        "access_token": create_access_token(user.email),
        "token_type": "bearer",
    }
