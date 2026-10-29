// Worker SSRF Security Gateway — delegates to canonical @sitescope/shared security module
export {
  validateTargetUrl,
  isIpAddressDisallowed,
  createSsrfLookup,
  createSsrfAgents,
  type ValidatedTarget,
  type ValidateUrlOptions,
} from '@sitescope/shared';
