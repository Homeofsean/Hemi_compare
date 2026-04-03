# GitHub Upload Guide (Revision 1)

## 1) Initialize and tag Revision 1 (already prepared by agent if run)

```powershell
git init
git add .
git commit -m "Revision 1"
git tag -a revision-1 -m "Revision 1"
```

## 2) Create GitHub repository

Create an empty repository in GitHub, then set remote:

```powershell
git remote add origin <your-repo-url>
```

Example:

```powershell
git remote add origin https://github.com/<user>/<repo>.git
```

## 3) Push code and tag

```powershell
git branch -M main
git push -u origin main
git push origin revision-1
```

## 4) Optional release artifact

Upload `GWS_file_intake_revision1.zip` to GitHub Releases for tag `revision-1`.
