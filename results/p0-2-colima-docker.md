# P0-2 — Colima install + start · evidence

**Executed:** 2026-08-27 ~16:12 SGT · by Claude `[relay]` (command was already in flight when
Mehul's "codex is not offline" correction landed; letting brew abort mid-install was worse.
Codex to APPROVE/BLOCK per PROTOCOL §6 and owns the container path from here.)

## Commands

```
brew install colima docker
colima start
docker info
```

## Result — PASS (exit 0). BLOCKER-3 cleared pending Codex verification.

- `brew install colima docker` succeeded; docker context switched to `colima`.
- `colima start` completed: `level=info msg=done`.
- `docker info` (verbatim excerpt):

```
Client: Docker Engine - Community
 Version:    29.7.2
 Context:    colima
Server:
 Containers: 0 (Running 0, Paused 0, Stopped 0)
 Images: 0
 Server Version: 29.5.2
 Storage Driver: overlayfs (io.containerd.snapshotter.v1)
 Cgroup Version: 2
 Network: bridge host ipvlan macvlan null overlay
```

## Open items for Codex (owner)

- Colima was started with defaults (no explicit CPU/RAM sizing). Resize if the runtime image
  needs it: `colima stop && colima start --cpu 4 --memory 8`.
- Pull/build the Codex runtime image required by `ContainerCodexRunner.isAvailable()`
  (`containerRuntimeImage` in `apps/server/src/config.ts`) before P0-4.
- Colima does not auto-start at login; each session needs `colima start` (or
  `brew services start colima`).
