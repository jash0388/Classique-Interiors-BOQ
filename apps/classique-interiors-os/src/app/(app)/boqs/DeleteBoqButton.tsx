"use client";

import { trashBOQ } from "./actions";
import { btn } from "@/components/ui";

export default function DeleteBoqButton({ id, number }: { id: string; number: string }) {
  return (
    <form
      action={trashBOQ}
      onSubmit={(event) => {
        if (!window.confirm(`Move ${number} to Trash? It can be restored for 15 days before permanent deletion.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="boqId" value={id} />
      <button type="submit" className={`${btn.sm} border-red-200 text-red-700 hover:bg-red-50`}>
        Delete BOQ
      </button>
    </form>
  );
}
