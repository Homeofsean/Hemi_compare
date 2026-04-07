# GitHub Upload Guide (Revision 3)

## 1) Commit and tag Revision 3

```powershell
git add .
git commit -m "Revision 3"
git tag -a revision-3 -m "Revision 3"
```

If repository is not initialized yet:

```powershell
git init
git add .
git commit -m "Revision 3"
git tag -a revision-3 -m "Revision 3"
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

## 3) Push code and tags

```powershell
git branch -M main
git push -u origin main
git push origin revision-1
git push origin revision-2
git push origin revision-3
```

## 4) Optional release artifacts

- Upload `GWS_file_intake_revision1.zip` to GitHub Releases for tag `revision-1` if you are preserving Revision 1 artifact history.
- Upload `GWS_file_intake_revision2.zip` to GitHub Releases for tag `revision-2` if you create a Revision 2 bundle.
- Upload `GWS_file_intake_revision3.zip` to GitHub Releases for tag `revision-3` if you create a Revision 3 bundle.

## 5) Verify remote state

```powershell
git fetch origin --tags
git log --oneline -n 5
git tag --list
```
