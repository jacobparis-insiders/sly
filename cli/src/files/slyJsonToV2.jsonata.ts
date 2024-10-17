export default {
  type: "jsonata" as const,
  name: "sly.json",
  content: /* jsonata */ `(
  /* Define icon, component, and utils categories */
  $icons := [
    "@blueprintjs/icons", "tailwindlabs/heroicons", "iconoir", "lucide-icons", "material-design-icons", 
    "phosphor-icons", "@radix-ui/icons", "remixicon", "simple-icons", "tabler-icons"
  ];
  $components := ["draft-ui", "jacobparis/ui", "jolly-ui", "@shadcn/ui"];
  $utils := ["just"];
  
  /* Function to determine the type of a library */
  $getType := function($name) {
    $exists($icons[$name=$]) ? "icons" :
    $exists($components[$name=$]) ? "components" :
    $exists($utils[$name=$]) ? "utils" : null
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
    "libraries": $reduce(libraries, function($result, $lib) {
      (
        $libType := $getType($lib.name);
        $commonConfig := $exists($collectConfigs($libType)) ? $libType : null;
        
        /* If the common config is at the top level, point to it. Otherwise, retain the original config */
        $merge([$result, {
          ($lib.name): {
            /* No libType means this is an unknown library, just print $removeName($lib) */
            "config": $libType ? $collectConfigs($libType) = $removeName($lib) ? $commonConfig : $removeName($lib)  /* Retain full config if not moved */ : $removeName($lib)
          }
        }])
      )
    }, {})
  }
)
`,
}
