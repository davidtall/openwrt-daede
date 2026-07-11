# kdae Auto-Bump Design

## Goal

When `olicesx/dae:kdae` advances, the auto-bump workflow must treat it as an
upstream change, update the pinned performance-base commit, and run the existing
source assembly and SDK build gate. The assembly workflows continue to merge the
pinned `daeuniverse/dae:main` commit onto that performance base.

## Detection and pin update

`auto-bump.yml` will read the current `olicesx/dae:kdae` head into `core_new`.
The no-change condition will additionally require `core_new` to equal
`CORE_COMMIT`. When it differs, the detect step will expose the commit as the
`core` output and the staging step will replace `CORE_COMMIT` in `ci/pins.env`.

The kdae commit date will participate in the shared `DAE_VERSION` and
`DAED_VERSION` calculation. This ensures a kdae-only update receives a version
stamp that reflects the newest tracked component.

## Build flow

The existing mirror sync remains unchanged:

1. Force-sync `olicesx/dae:kdae` to `kenzok8/dae:kdae`.
2. Assemble workflows fetch the newly pinned `CORE_COMMIT` from `kenzok8/dae`.
3. They merge `CORE_UPSTREAM_COMMIT` from `daeuniverse/dae` into the temporary
   source tree.
4. Existing source assembly and SDK build gates determine whether staging can be
   promoted to `main`.

No merge result is pushed to any dae fork; it exists only in assembled source
artifacts.

## Failure behavior

If the updated kdae base conflicts with the pinned official dae commit, the
existing `git merge` command fails. The workflow then stops before promoting
`auto-bump-staging` to `main`, preserving the current release state.

## Verification

Static workflow checks will verify that:

- kdae head is queried from `olicesx/dae` branch `kdae`;
- the no-change condition compares it with `CORE_COMMIT`;
- the detect step exports it;
- the staging step writes it back to `ci/pins.env`;
- its commit date participates in version selection.

The resulting YAML will also be parsed to catch syntax errors.
