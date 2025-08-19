import type { Route } from "./+types/home";
import { LoginForm } from "~/components/login-form"
import { useForm } from "react-hook-form"
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from "yup"

import { login } from "~/requests"
import { redirect } from "react-router";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Login - IoTrace" },
    { name: "description", content: "Login to your IoTrace account" },
  ];
}

function buildCookie(token: string) {
  const maxAge = 24 * 60 * 60; // 1 day in seconds
  const secure = process.env.NODE_ENV === "production";
  // NOTE: SameSite=Lax is reasonable for typical login flows
  return `jwt=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax; ${secure ? "Secure;" : ""}`;
}

function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...init?.headers },
    status: init?.status || 200,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");

  try {
    // login() is your helper that talks to the auth backend
    const response = await login(email, password);
    if (response && response.success) {
      const token = response.data?.token;
      if (!token) {
        return json({ success: false, message: "Auth server did not return token" }, { status: 502 });
      }
      const cookieHeader = buildCookie(token);

      // Return a redirect and set the cookie on the frontend origin (action runs on server)
      return redirect("/", { headers: { "Set-Cookie": cookieHeader } });
    }

    // Login failed: return JSON with message (status 401)
    return json({ success: false, message: response?.message || "Invalid credentials" }, { status: 401 });
  } catch (err) {
    console.error("Login action error", err);
    if (err.code === 400) {
      return json({ success: false, message: "Invalid data" }, { status: 400 });
    }
    return json({ success: false, message: "Error logging in" }, { status: 500 });
  }
}

export default function LoginPage({
  actionData,
}: Route.ComponentProps) {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  )
}
