import DeviceCard from "~/components/device-card";
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
      <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {loaderData.sort((a: any, b: any) => a.deviceId.localeCompare(b.deviceId)).map((device: any) => (
          <DeviceCard device={device} key={device._id} />
        ))}
      </div>
    </div>
  )
}

