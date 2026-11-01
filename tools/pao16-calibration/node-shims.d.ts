// Tool-only declarations: use installed Node built-ins without changing dependency manifests.
declare module 'node:fs' { const fs: any; export default fs; }
declare module 'node:crypto' { const crypto: any; export default crypto; }
