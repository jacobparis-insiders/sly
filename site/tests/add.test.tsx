/* @ts-ignore */ // This will be created by the test runner
import supportedVersions from "./versions.json"

import { sharedTests } from "../../test/add.js"

void sharedTests({
  // When we update the registry, we need to make sure that the tests pass
  // for all supported versions of the CLI in the wild
  versions: supportedVersions as Array<string>,
  cli: (version) => `npx @sly-cli/sly@${version}`,
})
