import * as path from 'path';

// Set DATABASE_URL before any module loads.
// Prisma 7.x with prisma.config.ts reads this at construction time.
// rootDir is the monorepo root when running from there.
const dbPath = path.resolve(process.cwd(), 'database/canteen.db');
process.env['DATABASE_URL'] = `file:${dbPath}`;
process.env['AUTH_DISABLED'] = 'true';
process.env['NODE_ENV'] = 'test';

// PosApprovalService refuses to authorize approvals when MANAGER_PIN is
// unset (it used to fall back to a hardcoded '1234'). Tests that exercise the
// approval gate need a known value; specs assert against this one.
process.env['MANAGER_PIN'] = '1234';
