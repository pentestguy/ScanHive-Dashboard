from sqlalchemy.orm import Session

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)

from app.repositories.user_repository import UserRepository
from app.services.organization_service import create_organization_with_admin


class DisabledAccountError(Exception):
    pass


class DuplicateEmailError(Exception):
    pass


class AuthService:

    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register(self, email, first_name, last_name, password, organization_name):

        if self.repo.get_by_email(email):
            raise DuplicateEmailError("Email address already exists")

        _organization, user = create_organization_with_admin(
            self.repo.db,
            organization_name=organization_name,
            admin_email=email,
            admin_first_name=first_name,
            admin_last_name=last_name,
            admin_password_hash=hash_password(password),
        )

        self.repo.db.commit()
        self.repo.db.refresh(user)

        return create_access_token(user.email)

    def login(self, email, password):

        user = self.repo.get_by_email(email)

        if user and not user.is_active:
            raise DisabledAccountError("User account is disabled. Please reach out to your administrator.")

        if not user or not user.organization.is_active:
            return None

        if not verify_password(
            password,
            user.password_hash
        ):
            return None

        return create_access_token(user.email)
