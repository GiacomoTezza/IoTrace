import { Link, Outlet } from "react-router"
import { Button } from "./components/ui/button"
import { LogOut } from "lucide-react"
import { redirect } from "react-router";

export async function loader({ request }) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)jwt=([^;]+)/);
  if (!match) {
    throw redirect("/login");
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="flex h-auto shrink-0 items-center justify-between gap-2 border-b px-4 bg-sidebar">
        <Link className="text-lg font-semibold" to="/">
          IoTrace
        </Link>
        <form method="post" action="/logout">
          <Button variant={"ghost"} size="icon" type="submit">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </header >
      <main>
        <Outlet />
      </main>
    </>
  )
}
