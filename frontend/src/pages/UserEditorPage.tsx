import { ArrowLeft, RefreshCw } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRoles, getUser, updateUser } from "../api/iamApi";
import { getApiErrorMessage } from "../utils/apiError";

function errorMessage(error: unknown) {
  return getApiErrorMessage(error, "Unable to save user.");
}

export function UserEditorPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = Number(userId);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [accountDisabled, setAccountDisabled] = useState(false);
  const [roleIds, setRoleIds] = useState<number[]>([]);

  const userQuery = useQuery({ queryKey: ["iam-user", id], queryFn: () => getUser(id), enabled: Number.isInteger(id) && id > 0 });
  const rolesQuery = useQuery({ queryKey: ["iam-roles"], queryFn: getRoles });

  useEffect(() => {
    if (!userQuery.data) return;
    setFirstName(userQuery.data.first_name);
    setLastName(userQuery.data.last_name);
    setEmail(userQuery.data.email);
    setAccountDisabled(!userQuery.data.is_active);
    setRoleIds(userQuery.data.roles.map((role) => role.id));
  }, [userQuery.data]);

  const mutation = useMutation({
    mutationFn: () => updateUser(id, { first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), is_active: !accountDisabled, role_ids: roleIds }),
    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(["iam-user", id], updatedUser);
      queryClient.setQueryData(
        ["iam-users"],
        (users: (typeof updatedUser)[] | undefined) => users?.map((user) => user.id === updatedUser.id ? updatedUser : user),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["iam-user", id] }),
        queryClient.invalidateQueries({ queryKey: ["iam-users"] }),
      ]);
      navigate("/settings/iam?section=users");
    },
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.mutateAsync();
  }

  return (
    <div className="page-container role-editor-page user-editor-page">
      <Link to="/settings/iam?section=users" className="back-link"><ArrowLeft size={17} /> Back to users</Link>
      <div className="page-heading role-editor-heading"><div><h1>Edit user</h1></div></div>

      {userQuery.isLoading && <div className="loading-state"><RefreshCw className="spin" size={22} /> Loading user...</div>}
      {userQuery.isError && <div className="alert-error">Unable to load this user.</div>}

      {userQuery.data && (
        <form className="role-editor-form" onSubmit={submit}>
          {mutation.isError && <div className="alert-error">{errorMessage(mutation.error)}</div>}
          <section className="role-editor-panel">
            <div className="role-editor-panel-heading"><div><h2>User details</h2></div></div>
            <div className="user-editor-fields">
              <label className="form-group"><span>First name</span><input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></label>
              <label className="form-group"><span>Last name</span><input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
              <label className="form-group user-editor-email"><span>Email address</span><input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            </div>
            <label className={`user-status-toggle user-editor-status ${accountDisabled ? "account-disabled" : ""}`}>
              <input type="checkbox" checked={accountDisabled} onChange={(e) => setAccountDisabled(e.target.checked)} />
              <span><strong>Account disabled</strong><small>Block password sign-in, API keys, and all existing authenticated sessions.</small></span>
            </label>
          </section>

          <section className="role-editor-panel">
            <div className="role-editor-permission-heading"><div><h2>Role mapping</h2><p>{roleIds.length} roles assigned</p></div></div>
            <div className="user-editor-roles">
              {(rolesQuery.data ?? []).map((role) => (
                <label key={role.id}>
                  <input type="checkbox" checked={roleIds.includes(role.id)} onChange={(e) => setRoleIds((current) => e.target.checked ? [...current, role.id] : current.filter((value) => value !== role.id))} />
                  <span><strong>{role.name}</strong><small>{role.description}</small></span>
                </label>
              ))}
            </div>
          </section>

          <div className="role-editor-actions"><Link to="/settings/iam?section=users" className="secondary-button">Cancel</Link><button type="submit" className="primary-button small" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save user"}</button></div>
        </form>
      )}
    </div>
  );
}
