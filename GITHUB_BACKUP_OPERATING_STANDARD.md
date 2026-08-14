# GitHub Backup Operating Standard

**Repository:** [limitlessaiel/mygf-ai-prelaunch](https://github.com/limitlessaiel/mygf-ai-prelaunch)  
**Repository visibility:** Private  
**Primary code-recovery remote:** `github-backup`

## Recovery Model

The managed-project checkpoint is the recovery mechanism for the deployed application. GitHub is the independent source-code recovery layer. Every meaningful release must therefore exist in both places: as a managed checkpoint and as a pushed source milestone.

| Layer | Purpose | Current controlled-beta reference |
| --- | --- | --- |
| Managed project | Restores the deployable project version. | `29927c63` |
| Git tag | Immutable-by-convention marker for exact source recovery. | `backup/controlled-beta-20260814` |
| Git branch | Readable recovery pointer available in the remote repository. | `recovery/controlled-beta-20260814` |
| Recovery record | Explains the scope and rollback boundary. | `RELEASE_RECOVERY.md` |

## Required Milestone Procedure

For every completed feature or verified release, the operating procedure is to save a managed checkpoint, commit the source change, push `main` to `github-backup`, create an annotated `backup/<milestone>-<YYYYMMDD>` tag, create a matching `recovery/<milestone>-<YYYYMMDD>` branch, push both references, verify their remote presence, and update `RELEASE_RECOVERY.md`. A milestone is incomplete until all of these checks have passed.

No force-pushes, history rewrites, or tag deletions are permitted on `main`, `backup/*`, or `recovery/*`. Routine work proceeds on `main` only after the prior recovery marker is verified. A new tag or recovery branch is created for each new milestone rather than changing an older reference.

## Audit Results — 14 August 2026

The local `main` commit and `github-backup/main` were identical at audit time. The controlled-beta, error-coverage, and live-pilot backup tags and recovery branches were all confirmed on the GitHub remote. Repository-object validation completed without reported corruption. A detached, isolated checkout from `backup/controlled-beta-20260814` contained the recovery record and server implementation files and had no working-tree changes.

The audit also found no tracked environment file, certificate/key file, or committed `OHAPI_API_KEY=` assignment. The provider credential remains supplied through managed server configuration rather than Git.

## Protection Limitation and Mitigation

GitHub reported that branch-protection and repository-ruleset configuration for this private repository requires a plan upgrade or a public repository. Those remote controls are therefore **not currently enforceable** for this repository. GitHub documents branch-protection configuration through its protected-branch endpoint. [1]

Until remote protection becomes available, the operative safeguards are the private repository, a verified source push at each milestone, dual recovery references, the no-force-push operating rule above, checkpoint recovery, and the restore rehearsal recorded in this document. If irreversible GitHub-side enforcement becomes required, the account owner should enable a plan that supports private-repository branch protection and then require pull requests, passing checks, and no force-pushes on `main`. [1]

## Restore Procedure

To restore the application, select the desired managed checkpoint in the project version history. To inspect an exact source milestone locally without modifying the working branch, check out the corresponding backup tag in a detached worktree. To resume development from a recovery point, create a new branch from the matching `recovery/*` branch; do not commit directly onto a historical recovery branch.

## References

[1]: https://docs.github.com/rest/branches/branch-protection#get-branch-protection "GitHub REST API — Get branch protection"
