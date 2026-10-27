import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-700 text-2xl font-bold text-white shadow-lg">
            CI
          </div>
          <h1 className="text-xl font-bold text-stone-900">{COMPANY.name} OS</h1>
          <p className="mt-1 text-sm text-stone-500">Internal app — sign in to continue</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-stone-400">
          Accounts are managed by the company. Contact the owner if you cannot sign in.
        </p>
      </div>
    </main>
  );
}
