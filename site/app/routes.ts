import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export const routes: RouteConfig = [
  index("./routes/_index.tsx"),
  route("/registry/index.json", "./routes/registry+/index[.json].ts"),
  route("/registry/config.json", "./routes/registry+/config[.json].ts"),
  route("/registry/@blueprintjs/icons/:name.json", "./routes/registry+/@blueprintjs.icons.$name[.json].ts"),
  route("/registry/@blueprintjs/icons.json", "./routes/registry+/@blueprintjs.icons[.json].ts"),
  route("/registry/@radix-ui/icons/:name.json", "./routes/registry+/@radix-ui.icons.$name[.json].ts"),
  route("/registry/@radix-ui/icons.json", "./routes/registry+/@radix-ui.icons[.json].ts"),
  route("/registry/@shadcn.ui/$name.json", "./routes/registry+/@shadcn.ui.$name[.json].ts"),
  route("/registry/@shadcn.ui.json", "./routes/registry+/@shadcn.ui[.json].ts"),
  route("/registry/@sly-cli.transformers/$name.json", "./routes/registry+/@sly-cli.transformers.$name[.json].ts"),
  route("/registry/@sly-cli.transformers.json", "./routes/registry+/@sly-cli.transformers[.json].ts"),
  route("/registry/draft-ui/:name.json", "./routes/registry+/draft-ui.$name[.json].ts"),
  route("/registry/draft-ui.json", "./routes/registry+/draft-ui[.json].ts"),
  route("/registry/iconoir/:type/:name.json", "./routes/registry+/iconoir.$type.$name[.json].ts"),
  route("/registry/iconoir.json", "./routes/registry+/iconoir[.json].ts"),
  route("/registry/jolly-ui/:name.json", "./routes/registry+/jolly-ui.$name[.json].ts"),
  route("/registry/jolly-ui.json", "./routes/registry+/jolly-ui[.json].ts"),
  route("/registry/just/:name.json", "./routes/registry+/just.$name[.json].ts"),
  route("/registry/just.json", "./routes/registry+/just[.json].ts"),
  route("/registry/lucide-icons/:name.json", "./routes/registry+/lucide-icons.$name[.json].ts"),
  route("/registry/lucide-icons.json", "./routes/registry+/lucide-icons[.json].ts"),
  route("/registry/material-design-icons/:name.json", "./routes/registry+/material-design-icons.$name[.json].ts"),
  route("/registry/material-design-icons.json", "./routes/registry+/material-design-icons[.json].ts"),
  route("/registry/phosphor-icons/:name.json", "./routes/registry+/phosphor-icons.$name[.json].ts"),
  route("/registry/phosphor-icons.json", "./routes/registry+/phosphor-icons[.json].ts"),
  route("/registry/remixicon/:variant/:name.json", "./routes/registry+/remixicon.$variant.$name[.json].ts"),
  route("/registry/remixicon.json", "./routes/registry+/remixicon[.json].ts"),
  route("/registry/simple-icons/:name.json", "./routes/registry+/simple-icons.$name[.json].ts"),
  route("/registry/simple-icons.json", "./routes/registry+/simple-icons[.json].ts"),
  route("/registry/tabler-icons/:name.json", "./routes/registry+/tabler-icons.$name[.json].ts"),
  route("/registry/tabler-icons.json", "./routes/registry+/tabler-icons[.json].ts"),
  route("/registry/tailwindlabs.heroicons/:name.json", "./routes/registry+/tailwindlabs.heroicons.$name[.json].ts"),
  route("/registry/tailwindlabs.heroicons.json", "./routes/registry+/tailwindlabs.heroicons[.json].ts"),
]
