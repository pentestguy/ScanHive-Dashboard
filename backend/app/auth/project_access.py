from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.associations import group_projects, group_users
from app.models.project_access import ProjectAccess


def project_permissions(db: Session, user, project) -> set[str]:
    if project.organization_id != user.organization_id:
        return set()
    if project.owner_id == user.id:
        return {"*"}
    access = db.query(ProjectAccess).filter(
        ProjectAccess.project_id == project.id,
        ProjectAccess.user_id == user.id,
    ).first()
    group_access = db.query(group_projects.c.project_id).join(
        group_users,
        group_users.c.group_id == group_projects.c.group_id,
    ).filter(
        group_projects.c.project_id == project.id,
        group_users.c.user_id == user.id,
    ).first()
    return set(user.effective_permissions) if access or group_access else set()


def require_project_permission(db: Session, user, project, *permissions: str) -> None:
    if project.organization_id != user.organization_id:
        raise HTTPException(404, "Project not found")
    granted = project_permissions(db, user, project)
    if "*" not in granted and not granted.intersection(permissions):
        raise HTTPException(403, "You do not have permission for this project action")
