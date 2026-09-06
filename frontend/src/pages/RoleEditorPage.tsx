import { ArrowLeft } from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  createRole,
  getRole,
  updateRole,
} from "../api/iamApi";
import { LoadingState } from "../components/LoadingState";
import { PermissionCheckboxGrid } from "../components/PermissionCheckboxGrid";
import { ROLE_PERMISSIONS } from "../constants/permissions";
import { getApiErrorMessage } from "../utils/apiError";

function getErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, "Unable to save role.");
}

export function RoleEditorPage() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const parsedRoleId = Number(roleId);
  const isEditing = Boolean(roleId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [validationError, setValidationError] = useState("");

  const roleQuery = useQuery({
    queryKey: ["iam-role", parsedRoleId],
    queryFn: () => getRole(parsedRoleId),
    enabled: isEditing && Number.isInteger(parsedRoleId),
  });

  useEffect(() => {
    if (!roleQuery.data) return;
    setName(roleQuery.data.name);
    setDescription(roleQuery.data.description);
    setPermissions(roleQuery.data.permissions);
  }, [roleQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const request = {
        name: name.trim(),
        description: description.trim(),
        permissions,
      };
      return isEditing
        ? updateRole(parsedRoleId, request)
        : createRole(request);
    },
    onSuccess: () => navigate("/settings/iam?section=roles"),
  });

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!name.trim() || !description.trim()) {
      setValidationError("Role name and description are required.");
      return;
    }

    setValidationError("");
    await saveMutation.mutateAsync();
  }

  return (
    <div className="page-container role-editor-page">
      <Link to="/settings/iam?section=roles" className="back-link">
        <ArrowLeft size={17} />
        Back to roles
      </Link>

      <div className="page-heading role-editor-heading">
        <div>
          <h1>{isEditing ? "Edit role" : "Create custom role"}</h1>
        </div>
      </div>

      {roleQuery.isLoading && (
        <LoadingState size={22}>Loading role...</LoadingState>
      )}

      {roleQuery.isError && (
        <div className="alert-error">Unable to load this role.</div>
      )}

      {(!isEditing || roleQuery.data) && (
        <form className="role-editor-form" onSubmit={handleSubmit}>
          {(validationError || saveMutation.isError) && (
            <div className="alert-error">
              {validationError || getErrorMessage(saveMutation.error)}
            </div>
          )}

          <section className="role-editor-panel role-basics-panel">
            <div className="role-editor-panel-heading">
              <div>
                <h2>Role details</h2>
              </div>
            </div>
            <div className="role-editor-fields">
              <label className="form-group">
                <span>Role name</span>
                <input
                  className="form-input"
                  value={name}
                  maxLength={100}
                  autoFocus
                  placeholder="Release Security Reviewer"
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="form-group">
                <span>Description</span>
                <textarea
                  className="form-input form-textarea"
                  value={description}
                  maxLength={500}
                  rows={4}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="role-editor-panel">
            <PermissionCheckboxGrid
              value={permissions}
              onChange={setPermissions}
              countLabel={
                <>
                  <h2>Permissions</h2>
                  <p>{permissions.length} of {ROLE_PERMISSIONS.length} selected</p>
                </>
              }
              headingClassName="role-editor-permission-heading"
              gridClassName="role-editor-permissions"
            />
          </section>

          <div className="role-editor-actions">
            <Link to="/settings/iam?section=roles" className="secondary-button">
              Cancel
            </Link>
            <button
              type="submit"
              className="primary-button small"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : isEditing ? "Save role" : "Create role"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
