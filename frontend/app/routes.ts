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
  ]),
  route("login", "./routes/login.tsx"),
  route("logout", "./routes/logout.tsx"),
] satisfies RouteConfig;

