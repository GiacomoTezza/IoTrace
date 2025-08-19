import { redirect } from "react-router";

export async function action() {
  // expire cookie immediately
  const cookie = `jwt=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax;${process.env.NODE_ENV === "production" ? " Secure;" : ""}`;
  return redirect("/login", {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}
