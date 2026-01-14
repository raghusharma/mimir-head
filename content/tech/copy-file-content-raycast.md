---
title: Copy File Content using Raycast
status: good-enough
publish: "true"
---

# What does this script do?
Helps copy contents of the files quickly (residing inside a destination folder) using [Raycast](https://www.raycast.com/).

# Important Directories
`$HOME/snippets or SNIPPET_DIR`: Files to be copied are picked from here. Change this location in the script (look for variable `SNIPPET_DIR`).
`$HOME/Library/Application\ Support/com.raycast.macos/commands`: This is where raycast scripts will live.
# One time setup
```zsh
mkdir $HOME/Library/Application\ Support/com.raycast.macos/commands
vim $HOME/Library/Application\ Support/com.raycast.macos/commands/snippets-sync.sh
```

Here are the contents of the script:
```bash
#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title sync-directory
# @raycast.mode compact
# @raycast.packageName Snippets

set -euo pipefail

# Folder where your source text files live
SNIPPET_DIR="$HOME/snippets"

# Raycast Script Commands folder (default)
RAYCAST_DIR="$HOME/Library/Application Support/com.raycast.macos/commands"

# Keep generated scripts grouped + distinguishable
PACKAGE_NAME="Snippets"
PREFIX="snippet-"

mkdir -p "$RAYCAST_DIR"

# Generate/update scripts for each file
find "$SNIPPET_DIR" -maxdepth 1 -type f -print0 | while IFS= read -r -d '' file; do
  base="$(basename "$file")"
  title="${base%.*}"  # remove extension

  # Safe filename for the generated script
  safe_id="$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"
  script_path="$RAYCAST_DIR/${PREFIX}${safe_id}.sh"

  cat > "$script_path" <<EOF
#!/bin/bash
# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title ${title}
# @raycast.mode silent
# @raycast.packageName ${PACKAGE_NAME}

cat "$(printf '%q' "$file")" | pbcopy
echo "Copied: ${base}"
EOF

  chmod +x "$script_path"
done

```

## Prepare Raycast
Go to Raycast settings > Extensions > Scripts (filter). Select `script commands` & add the directory `$HOME/Library/Application\ Support/com.raycast.macos/commands`

# Trigger sync from Raycast:
Whenever you create a new file in your directory, open raycast and type `sync-directory` and hit enter. This will trigger your above script.
The script itself is created as a Raycast command
## Note
Script trigger is required only when new file is created, not when file contents are changed.
## I want to change the name of sync script
Make change in the following line in script:
`# @raycast.title`

# How does it work?
The script creates the Raycast commands corresponding to the file names in the `$SNIPPET_DIR`, which can be easily typed in Raycast.
- Create a file in the `$SNIPPET_DIR`
  ![[create-file.png|400]]
- Sync using raycast command
  ![[sync-raycast-commands.png|400]]
  ![[Screenshot 2026-01-14 at 13.12.59.png|400]]
- The command to copy content of the file is created
- ![[command-created.png|400]]

# Limitations
- No cleanup. If you delete a file, the Raycast command still remains
- No auto-trigger. This can be done (in next version) if required. But start with this and see if it works for you.
- The script ignores the file extensions. So if you have 2 files: `aws-prod.txt` & `aws-prod.md`, both become `aws-prod` in Raycast script.
- Works for low number of files (a few hundreds)