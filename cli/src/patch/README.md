## Patch Features

These are utilities for generating and working with patches, currently used in the Sly Templates feature but with plans to allow sly components to include diffs as well for patching configuration files

## Current issues with applying patches

- a patch with a single line to change will reject if that line appears twice in the target file. I should detect that and add additional context from the target file even if it wasn't present in the original patch
- a one line change in the diff may represent 5 wrapped lines (for example a component with each prop on its own line) depending on line length and formatting settings. It would be ideal to recognize this and adapt the patch
- the presence of brackets around args `(a) => a` vs `a => a`, the use of single vs double quotes, and other small formatting changes can prevent the patch from matching.
