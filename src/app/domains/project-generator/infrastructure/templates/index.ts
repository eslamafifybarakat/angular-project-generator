export * from './content-registry';
export * from './template-context.model';
// Side-effect import: registers every template module's content resolver.
// The individual `*.templates.ts` files hold generated-project source as
// string content and have no real exports of their own — see register-templates.ts.
export * from './register-templates';
