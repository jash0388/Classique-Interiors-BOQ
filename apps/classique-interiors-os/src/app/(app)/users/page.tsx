import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { addUser, toggleUserActive, resetPassword } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import { Card, Empty, btn } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/status";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  await requireRole("OWNER");
  const users = await db.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-lg font-bold text-stone-900">Users</h1>

      <Card title="Add user" subtitle="They can sign in immediately with the password you set.">
        <form action={addUser} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label>Name *</label>
            <input name="name" type="text" required placeholder="e.g. Varsha" />
          </div>
          <div>
            <label>Email *</label>
            <input name="email" type="email" required placeholder="name@classiqueinteriors.in" />
          </div>
          <div>
            <label>Role *</label>
            <select name="role" required defaultValue="MANAGER">
              <option value="MANAGER">Procurement manager</option>
              <option value="FIELD">Site executive</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          <div>
            <label>City</label>
            <input name="city" type="text" placeholder="e.g. Kolkata" />
          </div>
          <div>
            <label>Phone (for WhatsApp)</label>
            <input name="phone" type="tel" placeholder="+91…" />
          </div>
          <div>
            <label>Password * (min 6 chars)</label>
            <input name="password" type="text" required minLength={6} placeholder="Set an initial password" />
          </div>
          <div className="sm:col-span-3">
            <SubmitButton className={btn.primary} pendingLabel="Adding…">
              Add user
            </SubmitButton>
          </div>
        </form>
      </Card>

      <Card title={`Team (${users.length})`}>
        {users.length === 0 ? (
          <Empty>No users.</Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-stone-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">Added</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                    <td className="px-3 py-2 font-medium">{u.name}</td>
                    <td className="px-3 py-2 text-stone-500">{u.email}</td>
                    <td className="px-3 py-2">{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="px-3 py-2">{u.city || "—"}</td>
                    <td className="px-3 py-2 text-xs text-stone-500">{formatDate(u.createdAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <form action={toggleUserActive}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button type="submit" className={btn.sm}>
                            {u.active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                        <form action={resetPassword} className="flex items-center gap-1">
                          <input type="hidden" name="userId" value={u.id} />
                          <input name="password" type="text" placeholder="New password" className="!w-32 !py-1 !text-xs" minLength={6} required />
                          <button type="submit" className={btn.sm}>
                            Reset
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
