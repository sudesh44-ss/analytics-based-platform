// Backend SSRF Gateway Service — delegates to canonical @sitescope/shared security module
export {
  validateTargetUrl,
  isIpAddressDisallowed,
  createSsrfLookup,
  createSsrfAgents,
  type ValidatedTarget,
  type ValidateUrlOptions,
} from '@sitescope/shared';
