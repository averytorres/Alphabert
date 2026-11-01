# Put the project on GitHub

GitHub shows files that have been committed and pushed to a GitHub repository. Files sitting on your computer are local until that happens. You do not need to publish the Android app, upload an APK, or release it in an app store first.

## Choose the correct local folder

Choose the outer project folder that contains the game files. For example:

```text
C:\Projects\Alphabert
```

It contains `app.js`, `index.html`, `content`, `audio`, and `android`.

In the original local setup there was also a nested placeholder repository. Using the example path, that would be:

```text
C:\Projects\Alphabert\Alphabert
```

That nested repository contains only `.gitattributes`. Selecting it in GitHub Desktop will not show the app files in its parent folder. The nested folder is excluded from the main project's Git tracking; its repository has been left intact.

At the initial setup check, the actual project had no commits and no remote, and the nested repository had only its placeholder initial commit and no remote.

## GitHub Desktop

1. Select **File → Add local repository**.
2. Choose the actual project folder above, ending in a single `Alphabert`.
3. Confirm the Changes list shows files such as `app.js`, `README.md`, and `content/words.json`.
4. Review the changes, enter a summary such as **Initial game source**, and click **Commit to master** (or the branch name shown).
5. Click **Publish repository**. Choose the repository name, owner and visibility you want.
6. After publishing, use **View on GitHub** to confirm the source files are visible.

For later updates, commit the changes and click **Push origin**.

## Command line alternative

From PowerShell:

```powershell
Set-Location 'C:\Projects\Alphabert'
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

The `.gitignore` excludes API credentials/caches, signing keystores, dependency downloads, generated APKs, test screenshots, speech trials, the downloaded ISO and its inspection directory. Keep signing keys and speech generation masters backed up separately; ignoring them does not create a backup.

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
