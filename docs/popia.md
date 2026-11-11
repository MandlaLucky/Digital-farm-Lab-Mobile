# POPIA note — A14

## Personal data held
- User id (UUID), display name, role — from JWT in the shared token.
- No emails, phones, ID numbers, addresses or health data stored by this product.
- Farm names / provinces are user-supplied and could contain a name — treat as low-risk.

## Why
- To attribute runs and submissions to the learner for scoring and trainer reporting.

## Consent
- Consent screen shown on first run of the mobile app (placeholder — implement).
- Data minimisation: only uuid, display name, role.

## Deletion
- Facilitation user can request deletion; cascade deletes runs and submissions via FK `ON DELETE CASCADE`.
- Export: runs and submissions are already returned as JSON from `/api/v1/workspace/runs`.

## Retention
- Teaching semester; archived at end of cohort.
