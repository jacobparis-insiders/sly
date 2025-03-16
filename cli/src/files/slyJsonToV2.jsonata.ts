export default {
  type: "jsonata" as const,
  name: "sly.json",
  content: /* jsonata */ `(
  /* Define icon, component, and utils categories */
  /* These get special treatment because they were the Sly v1 Registry, so we carry their config forward */
  $icons := [
    {
      "name": "tailwindlabs/heroicons",
      "iconifyName": "iconify:heroicons",
      "displayName": "Hero Icons"
    },
    {
      "name": "iconoir",
      "iconifyName": "iconify:iconoir",
      "displayName": "Iconoir"
    },
    {
      "name": "lucide-icons",
      "iconifyName": "iconify:lucide",
      "displayName": "Lucide Icons"
    },
    {
      "name": "material-design-icons",
      "iconifyName": "iconify:mdi",
      "displayName": "Material Design Icons"
    },
    {
      "name": "phosphor-icons",
      "iconifyName": "iconify:phosphor",
      "displayName": "Phosphor Icons"
    },
    {
      "name": "@radix-ui/icons",
      "iconifyName": "iconify:radix-icons",
      "displayName": "Radix Icons"
    },
    {
      "name": "remixicon",
      "iconifyName": "iconify:ri",
      "displayName": "Remix Icon"
    },
    {
      "name": "simple-icons",
      "iconifyName": "iconify:simple-icons",
      "displayName": "Simple Icons"
    },
    {
      "name": "tabler-icons",
      "iconifyName": "iconify:tabler",
      "displayName": "Tabler Icons"
    }
  ];
  $components := ["draft-ui", "jacobparis/ui", "jolly-ui", "@shadcn/ui"];
  $utils := ["just"];
  
  /* Function to determine the type of a library */
  $getType := function($key) {
    $exists($icons[name=$key]) ? "icons" :
    $exists($components[$key=$]) ? "components" :
    $exists($utils[$key=$]) ? "utils" : null
  };
  
  /* Function to remove the "name" field from a library */
  $removeName := function($lib) {
    $sift($lib, function($v, $k) { $k != "name" })
  };
  
  /* Collect common configs for each type (icons, components, utils), excluding the "name" field */
  $collectConfigs := function($type) {
    (
      $libs := $filter(libraries, function($lib) { $getType($lib.name) = $type });
      
      /* Exclude "name" field from the config */
      $libs[0] ? $removeName($libs[0]) : {}
    )
  };
  
  /* Build final config and libraries list */
  {
    "$schema": "https://sly-cli.fly.dev/registry/config.v2.json",
    "config": {
      /* Add common config for each type if it exists */
      "icons": $collectConfigs("icons"),
      "components": $collectConfigs("components"),
      "utils": $collectConfigs("utils")
    },
    "libraries": $reduce(libraries, function($result, $libConfig) {
      (
        $libType := $getType($libConfig.name);
        $libInfo := $libType = "icons"
          ? $icons[$libConfig.name = $.name]
          : { "name": $libConfig.name, "displayName": $libConfig.name, "iconifyName": $libConfig.name };
        $commonConfig := $exists($collectConfigs($libType)) ? $libType : null;
        
        /* If the common config is at the top level, point to it. Otherwise, retain the original config */
        $merge([$result, {
          ($libInfo.iconifyName): {
            /* This is an optional display name */
            "name": $libType = "icons" ? $libInfo.displayName : undefined,
            /* No libType means this is an unknown library, just print $removeName($lib) */
            "config": $libType ? $collectConfigs($libType) = $removeName($libConfig) ? $commonConfig : $removeName($libConfig)  /* Retain full config if not moved */ : $removeName($libConfig)
          }
        }])
      )
    }, {})
  }
)
`,
}

// "iconify:heroicons": {
//   "name": "HeroIcons",
//   "config": "icons"
// },
// "iconify:iconoir": {
//   "name": "Iconoir",
//   "config": "icons"
// },
// "iconify:lucide": {
//   "name": "Lucide",
//   "config": "icons"
// },
// "iconify:mdi": {
//   "name": "Material Design Icons",
//   "config": "icons"
// },
// "iconify:ph": {
//   "name": "Phosphor",
//   "config": "icons"
// },
// "iconify:radix-icons": {
//   "name": "Radix Icons",
//   "config": "icons"
// },
// "iconify:ri": {
//   "name": "Remix Icon",
//   "config": "icons"
// },
// "iconify:simple-icons": {
//   "name": "Simple Icons",
//   "config": "icons"
// },
// "iconify:tabler": {
//   "name": "Tabler Icons",
//   "config": "icons"
// }
