# Invoice assurance

This documentation records the durable identifier and test guarantees for
customer-visible invoices. Rendering, storage, and regeneration behavior remain
owned by the invoice helpers under `src/lib/helpers/`.

- [Architecture](./ARCHITECTURE.md) describes invoice and booking identifiers,
  persistence, and concurrent allocation.
- [Security test plan](./SECURITY-TEST-PLAN.md) defines the repeatable unit and
  disposable-PostgreSQL gates.

The documentation deliberately contains no production database endpoint,
credentials, customer data, or persistent test-database name.
