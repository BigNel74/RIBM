import { ActionForm, SelectField, SubmitButton, TextField } from "@/ui/form";
import { StatusChip } from "@/ui/primitives";
import { createUserAction, resetPasswordAction, setUserActiveAction } from "./user-actions";

const ROLE_OPTIONS = [
  { value: "OPERATOR", label: "Operator" },
  { value: "CLIENT", label: "Client (report access only)" },
  { value: "ADMIN", label: "Admin" },
  { value: "SALES_ADVISOR", label: "Sales advisor" },
];

export function UserAdmin({
  users,
  clients,
  currentUserId,
}: {
  users: Array<{ id: string; name: string; email: string; role: string; active: boolean; client: { displayName: string } | null }>;
  clients: Array<{ id: string; displayName: string }>;
  currentUserId: string;
}) {
  return (
    <div className="space-y-5">
      <ul className="divide-y divide-ink-700">
        {users.map((u) => (
          <li key={u.id} className="py-2.5">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">{u.name}</span>
                <span className="font-mono text-xs text-bone-400">{u.email}</span>
                <StatusChip>{u.role.replace("_", " ")}</StatusChip>
                {u.client ? <span className="text-xs text-bone-400">{u.client.displayName}</span> : null}
                {u.active ? <StatusChip tone="verified">Active</StatusChip> : <StatusChip tone="critical">Inactive</StatusChip>}
              </summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {u.id !== currentUserId || !u.active ? (
                  <div className="rounded-md border border-ink-700 p-3">
                    <ActionForm action={setUserActiveAction.bind(null, u.id, !u.active)} successMessage={u.active ? "Deactivated." : "Reactivated."}>
                      <TextField name="reason" label={u.active ? "Reason to deactivate" : "Reason to reactivate"} required />
                      <SubmitButton tone="secondary">{u.active ? "Deactivate (signs out everywhere)" : "Reactivate"}</SubmitButton>
                    </ActionForm>
                  </div>
                ) : null}
                <div className="rounded-md border border-ink-700 p-3">
                  <ActionForm action={resetPasswordAction.bind(null, u.id)} resetOnSuccess successMessage="Password set. Share it privately; the user is signed out everywhere.">
                    <TextField name="password" label="New password" hint="At least 12 characters." />
                    <SubmitButton tone="secondary">Set password</SubmitButton>
                  </ActionForm>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>

      <div className="border-t border-ink-700 pt-4">
        <h3 className="mb-3 text-sm font-semibold">Add user</h3>
        <ActionForm action={createUserAction} resetOnSuccess successMessage="User created. Share the password privately.">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="name" label="Name" required />
            <TextField name="email" label="Email" type="email" required />
            <SelectField name="role" label="Role" options={ROLE_OPTIONS} defaultValue="OPERATOR" />
            <SelectField
              name="clientId"
              label="Client (required for Client role)"
              placeholder="— None —"
              options={clients.map((c) => ({ value: c.id, label: c.displayName }))}
            />
            <TextField name="password" label="Initial password" required hint="At least 12 characters. Share it privately." />
          </div>
          <SubmitButton>Add user</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
