---
title: Publish Status
status: notion
---
# Published notes:
```dataview
LIST rows.file.path
WHERE publish = "true"
GROUP BY default(status, "No status")
```

# Unpublished notes:
```dataview
LIST rows.file.path
WHERE publish != "true"
GROUP BY default(status, "No status")
```