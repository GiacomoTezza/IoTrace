import {
  type RouteConfig,
  index,
  route,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  layout("./layout.tsx", [
    index("./routes/dashboard.tsx"),               // -> "/"
    route("device/:did", "./routes/device.tsx"),  // -> "/device/:did"
    route("device/:did/sbom/:sbomId", "./routes/device.$did.sbom.$sbomId.ts"), // -> "/device/:did/sbom/:sbomId"
  ]),
  route("login", "./routes/login.tsx"),
  route("logout", "./routes/logout.tsx"),
] satisfies RouteConfig;

