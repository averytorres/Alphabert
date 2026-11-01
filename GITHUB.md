# Put the project on GitHub

GitHub shows files that have been committed and pushed to a GitHub repository. Files sitting on your computer are local until that happens. You do not need to publish the Android app, upload an APK, or release it in an app store first.

## Work from the project root

Use the folder containing `app.js`, `index.html`, `content`, `audio`, and `android`. Run the commands below from that folder.

## GitHub Desktop

1. Select **File → Add local repository**.
2. Choose the project folder containing `app.js` and `index.html`.
3. Confirm the Changes list shows files such as `app.js`, `README.md`, and `content/words.json`.
4. Review the changes, enter a summary such as **Initial game source**, and click **Commit to master** (or the branch name shown).
5. Click **Publish repository**. Choose the repository name, owner and visibility you want.
6. After publishing, use **View on GitHub** to confirm the source files are visible.

For later updates, commit the changes and click **Push origin**.

## Command line alternative

From PowerShell:

```powershell
git status
git add .
git diff --cached --stat
git commit -m "Initial game source"
```

Create an empty repository on GitHub without generating another README, license or `.gitignore`. Then connect it using the actual URL GitHub provides:

```powershell
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin HEAD
```

Replace the placeholder URL before running it. If `origin` already exists, inspect `git remote -v` rather than adding it again.

## What belongs in the repository

Commit the game source, editable content, runtime artwork/audio, documentation, build scripts and tests. Bundled audio is needed to run the game offline.

The `.gitignore` excludes API credentials/caches, signing keystores, dependency downloads, generated APKs, test screenshots, speech trials, downloaded research material and local working notes. Keep signing keys and speech generation masters backed up separately; ignoring them does not create a backup.

Some advanced speech tests and regeneration tools require the ignored local source recordings, receipts or models. A fresh clone can preview/build the bundled runtime, but those source-dependent checks need the local development material described in `scripts/SPEECH.md`.

## Privacy check before publishing

Run from the project root:

```powershell
npm run audit:privacy -- --forbid-name "$env:USERNAME"
```

The audit scans tracked files and nonignored untracked files, including files already tracked despite ignore rules. It checks the supplied name, common credential patterns, personal home-directory paths, device identifiers and email addresses requiring review. It prints filenames/categories rather than matched secret values. Public third-party license notice emails are reported separately and retained with their notices.

This is a pattern-based check, not a guarantee that every form of personal information is detectable. Ignored caches and local research material are outside the publication set. Git commit author metadata is separate from file contents; changing files or ignore rules does not anonymize the author of a commit.

## Sharing the game

Source publishing and APK distribution are separate. Build with `scripts/build-android.ps1`; generated APKs stay ignored by Git. You can send an APK directly or attach it to a GitHub Release when you choose to make a release. Installing an APK does not require publishing the source.
