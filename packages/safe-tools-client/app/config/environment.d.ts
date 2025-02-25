export default config;

/**
 * Type declarations for
 *    import config from 'my-app/config/environment'
 */
declare const config: {
  environment: string;
  locationType: 'history' | 'hash' | 'none' | 'auto';
  modulePrefix: string;
  podModulePrefix: string;
  locationType: string;
  rootURL: string;
  APP: Record<string, unknown>;
  hubUrl: string;
  infuraId: string;
};
