import { sharedTests } from "../../test/add.js"

void sharedTests({
  versions: ["latest"],
  cli: () => "node ./start.js",
})
