# Workforce NON DOT C/TPA Portal

This package is cloned from the current DOT C/TPA portal shell so the visual system remains identical.

Brand configuration:
- Portal: Workforce NON DOT
- Domain: ctpa-non-dot.screenings4u.com
- Portal code: ctpa_workforce
- Surface: workforce
- Regular logo: images/workforce-non-dot.png
- White logo: images/workforce-non-dot2.png
- Runtime: nondot-workforce-ctpa-portal

The NON-DOT runtime is live in Supabase. Existing legacy workforce module endpoints are routed through the organized NON-DOT runtime while individual modules are migrated.

Safety note: DOT-only store/distribution runtime calls have been removed from this NON-DOT package; unmigrated NON-DOT modules return a migration-required response instead of writing to DOT workflows.
