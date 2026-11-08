# Build Project Workflow

This workflow installs dependencies and builds the Next.js project.

## Steps

### [STEP 1] Install Dependencies
Run this step to install all the necessary node packages.
// turbo
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; npm install
```

### [STEP 2] Build Project
Run this step to create an optimized production build.
// turbo
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; npm run build
```
