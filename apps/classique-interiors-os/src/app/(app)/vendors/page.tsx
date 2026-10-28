import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, Empty, btn } from "@/components/ui";
import { saveVendor, toggleVendor } from "./actions";

export const metadata = { title: "Vendors" };

export default async function VendorsPage() {
  await requireRole("OWNER", "MANAGER");
  const vendors = await db.vendor.findMany({ orderBy: [{ active: "desc" }, { trade: "asc" }, { name: "asc" }] });
  return <div className="mx-auto max-w-5xl space-y-4">
    <div><h1 className="text-lg font-bold">Vendors</h1><p className="text-sm text-stone-500">Save trusted suppliers and their work types so managers can reuse them for future BOQs.</p></div>
    <Card title="Add vendor">
      <form action={saveVendor} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label>Vendor / company name *</label><input name="name" required placeholder="e.g. Shree Enterprises" /></div>
        <div><label>Work type / trade *</label><input name="trade" required placeholder="e.g. Electrical, carpentry, flooring" /></div>
        <div><label>Phone</label><input name="phone" type="tel" /></div>
        <div><label>Email</label><input name="email" type="email" /></div>
        <div><label>City</label><input name="city" /></div>
        <div><label>Notes</label><input name="notes" placeholder="Capacity, preferred materials, etc." /></div>
        <div className="sm:col-span-2"><button className={btn.primary}>Save vendor</button></div>
      </form>
    </Card>
    <Card title={`Saved vendors (${vendors.length})`}>
      {vendors.length === 0 ? <Empty>No vendors saved yet.</Empty> : <div className="space-y-2">{vendors.map(v => <div key={v.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 p-3 ${v.active ? "" : "opacity-50"}`}>
        <div><p className="font-semibold">{v.name} <span className="ml-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">{v.trade}</span></p><p className="text-sm text-stone-500">{[v.phone, v.email, v.city].filter(Boolean).join(" · ") || "No contact details"}</p>{v.notes ? <p className="mt-1 text-xs text-stone-500">{v.notes}</p> : null}</div>
        <div className="flex items-center gap-2"><details className="relative"><summary className={`${btn.sm} cursor-pointer list-none`}>Edit</summary><form action={saveVendor} className="absolute right-0 z-10 mt-2 grid w-72 gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-lg"><input type="hidden" name="id" value={v.id} /><div><label>Name *</label><input name="name" required defaultValue={v.name} /></div><div><label>Work type *</label><input name="trade" required defaultValue={v.trade} /></div><div><label>Phone</label><input name="phone" defaultValue={v.phone ?? ""} /></div><div><label>Email</label><input name="email" type="email" defaultValue={v.email ?? ""} /></div><div><label>City</label><input name="city" defaultValue={v.city ?? ""} /></div><div><label>Notes</label><input name="notes" defaultValue={v.notes ?? ""} /></div><button className={btn.primary}>Save changes</button></form></details><form action={toggleVendor}><input type="hidden" name="id" value={v.id} /><button className={btn.sm}>{v.active ? "Archive" : "Restore"}</button></form></div>
      </div>)}</div>}
    </Card>
  </div>;
}
