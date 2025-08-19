import type { Route } from "./+types/home";
import { getDeviceSbom } from "~/requests";

export async function loader({ params }: Route.LoaderArgs) {
  const { sbomId, did } = params;
  if (!sbomId || !/^[a-f\d]{24}$/i.test(sbomId)) {
    throw new Response("Invalid sbom id", { status: 400 });
  }
  // server-side fetch to your backend (runs in the dev server / node environment)
  const res = await getDeviceSbom(sbomId);

  if (!res.success) {
    throw new Response("Failed to fetch SBOM", { status: res.message });
  }

  const data = res.data;
  return data;
}
