// Test shim: `next/server` isn't resolvable outside the Next runtime, and the
// service layer under test only imports NextResponse transitively (via
// api-error) without exercising it. A minimal stand-in keeps imports loading.
export const NextResponse = {
  json: (body, init = {}) => ({ body, status: init.status ?? 200 }),
};
