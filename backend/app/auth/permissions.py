from fastapi import HTTPException


def user_has_permission(user, permission: str) -> bool:
    group_roles = [role for group in user.groups for role in group.roles]
    return any(
        permission in (role.permissions or [])
        for role in [*user.roles, *group_roles]
    )


def require_permission(user, permission: str) -> None:
    if not user_has_permission(user, permission):
        raise HTTPException(
            status_code=403,
            detail=f"Permission required: {permission}",
        )
