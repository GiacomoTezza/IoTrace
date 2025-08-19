import type { Route } from "./+types/home";
import { getDevices } from "~/requests";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Dashboard - IoTrace" },
    { name: "description", content: "Device Dashboard" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const devices = await getDevices();
  if (devices && devices.success) {
    return devices.data;
  }
}

export default function Dashboard({
  loaderData,
}: Route.ComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
        <h1 className="text-2xl font-bold">Welcome to the Dashboard</h1>
        <p className="mt-4 text-muted-foreground">
          This is your device dashboard where you can manage and monitor your devices.
        </p>
      </div>
    </div>
  )
}

