import posthog from 'posthog-js'

const token = import.meta.env.VITE_POSTHOG_KEY
const host = import.meta.env.VITE_POSTHOG_HOST
const isProduction = import.meta.env.PROD

if (!token || !host) {
  if (!isProduction) {
    console.warn(
      `${!token ? 'VITE_POSTHOG_KEY' : 'VITE_POSTHOG_HOST'} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This warning stops appearing once ${!token ? 'VITE_POSTHOG_KEY' : 'VITE_POSTHOG_HOST'} is configured`
    )
  }
} else {
  posthog.init(token, {
    api_host: host,
    defaults: '2026-05-30',
  })
  posthog.startExceptionAutocapture()
}

export default posthog