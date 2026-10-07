import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { installPortalScope } from '@/lib/portalScope';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Student, parent and teacher reads are confined to the current academic session.
export const base44 = installPortalScope(client);