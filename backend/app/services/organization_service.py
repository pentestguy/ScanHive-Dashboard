import re

from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.role import Role
from app.models.user import User
from app.services.role_templates import DEFAULT_ROLE_TEMPLATES


def generate_slug(db: Session, name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-") or "org"
    slug = base
    suffix = 2
    while db.query(Organization.id).filter(Organization.slug == slug).first():
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


def create_organization_with_admin(
    db: Session,
    *,
    organization_name: str,
    admin_email: str,
    admin_first_name: str,
    admin_last_name: str,
    admin_password_hash: str,
) -> tuple[Organization, User]:
    organization = Organization(
        name=organization_name.strip(),
        slug=generate_slug(db, organization_name),
    )
    db.add(organization)
    db.flush()

    admin_role = None
    for template in DEFAULT_ROLE_TEMPLATES:
        role = Role(
            name=template["name"],
            description=template["description"],
            permissions=list(template["permissions"]),
            is_system=True,
            organization_id=organization.id,
        )
        db.add(role)
        if template["name"] == "Platform Administrator":
            admin_role = role

    administrator = User(
        email=admin_email.lower(),
        first_name=admin_first_name.strip(),
        last_name=admin_last_name.strip(),
        password_hash=admin_password_hash,
        organization_id=organization.id,
        is_active=True,
    )
    administrator.roles = [admin_role]
    db.add(administrator)
    db.flush()

    return organization, administrator
