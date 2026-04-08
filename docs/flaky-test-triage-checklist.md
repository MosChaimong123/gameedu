# Flaky Test Triage Checklist

Use this checklist when a test fails intermittently in CI or only under load.

## First Pass

- Is the failure in `unit`, `integration`, or `build-smoke`?
- Can it be reproduced locally with the same command?
- Did the failure come from timing, shared state, network access, or build artifacts?

## Common Causes

- shared in-memory state not reset between tests
- timers or reconnect delays that are too tight
- test order dependency
- route mocks missing a newly added export
- build smoke relying on artifacts that were not produced yet

## Socket And Integration Tests

- ensure ports are released in `afterEach`
- ensure sockets are disconnected in all paths
- avoid racing on events without timeout handling
- prefer explicit waits after disconnect or leave flows

## Route Tests

- if a helper export changed, update the test mock instead of letting it silently fall through
- assert `error.code` in addition to status
- reset global stores between tests

## Resolution Rule

If a test flakes more than once:

- tighten cleanup
- reduce shared mutable state
- or split the assertion into a smaller deterministic test
