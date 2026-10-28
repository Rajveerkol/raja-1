// =============================================================================
// Cloudflare Worker Entry Point for raja-1
// Combines Static Assets delivery with executable API & Asset streaming handlers.
// =============================================================================

import { Env, jsonResponse, errorResponse } from '../functions/types';

import { onRequestGet as getAsset } from '../functions/assets/[[path]]';
import { onRequestGet as getApps, onRequestPost as postApp } from '../functions/api/apps/index';
import { onRequestDelete as deleteApp } from '../functions/api/apps/[id]';
import { onRequestPost as downloadApp } from '../functions/api/apps/[id]/download';
import { onRequestGet as getSettings, onRequestPut as putSettings } from '../functions/api/settings';
import { onRequestPost as loginAdmin } from '../functions/api/admin/login';
import { onRequestPost as logoutAdmin } from '../functions/api/admin/logout';
import { onRequestGet as checkSession } from '../functions/api/admin/session';
import { onRequestPost as uploadApk } from '../functions/api/admin/upload-apk';
import { onRequestPost as uploadLogo } from '../functions/api/admin/upload-logo';

export interface WorkerEnv extends Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
}

function createContext<P extends string>(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
  params: Record<P, string | string[]>
) {
  const url = new URL(request.url);
  return {
    request,
    functionPath: url.pathname,
    waitUntil: (promise: Promise<unknown>) => ctx.waitUntil(promise),
    next: async () => env.ASSETS.fetch(request),
    env,
    params,
    data: {} as Record<string, unknown>
  };
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // 1. Private R2 Asset Delivery (/assets/*)
    if (pathname.startsWith('/assets/')) {
      if (method !== 'GET' && method !== 'HEAD') {
        return errorResponse('Method Not Allowed', 405);
      }
      const rawPath = pathname.replace(/^\/assets\//, '');
      const pathSegments = rawPath.split('/').filter(Boolean);
      return getAsset(createContext(request, env, ctx, { path: pathSegments }));
    }

    // 2. Apps API Endpoints
    if (pathname === '/api/apps' || pathname === '/api/apps/') {
      if (method === 'GET') {
        return getApps(createContext(request, env, ctx, {}));
      }
      if (method === 'POST') {
        return postApp(createContext(request, env, ctx, {}));
      }
      return errorResponse('Method Not Allowed', 405);
    }

    // Atomic Download Count: /api/apps/:id/download
    const downloadMatch = pathname.match(/^\/api\/apps\/([^/]+)\/download$/);
    if (downloadMatch) {
      if (method === 'POST') {
        return downloadApp(createContext(request, env, ctx, { id: decodeURIComponent(downloadMatch[1]) }));
      }
      return errorResponse('Method Not Allowed', 405);
    }

    // Single App Operations: /api/apps/:id
    const singleAppMatch = pathname.match(/^\/api\/apps\/([^/]+)$/);
    if (singleAppMatch) {
      if (method === 'DELETE') {
        return deleteApp(createContext(request, env, ctx, { id: decodeURIComponent(singleAppMatch[1]) }));
      }
      return errorResponse('Method Not Allowed', 405);
    }

    // 3. Settings API: /api/settings
    if (pathname === '/api/settings' || pathname === '/api/settings/') {
      if (method === 'GET') {
        return getSettings(createContext(request, env, ctx, {}));
      }
      if (method === 'PUT') {
        return putSettings(createContext(request, env, ctx, {}));
      }
      return errorResponse('Method Not Allowed', 405);
    }

    // 4. Admin Auth API
    if (pathname === '/api/admin/login') {
      if (method === 'POST') {
        return loginAdmin(createContext(request, env, ctx, {}));
      }
      return errorResponse('Method Not Allowed', 405);
    }

    if (pathname === '/api/admin/logout') {
      if (method === 'POST') {
        return logoutAdmin(createContext(request, env, ctx, {}));
      }
      return errorResponse('Method Not Allowed', 405);
    }

    if (pathname === '/api/admin/session') {
      if (method === 'GET') {
        return checkSession(createContext(request, env, ctx, {}));
      }
      return errorResponse('Method Not Allowed', 405);
    }

    // 5. Admin Upload Endpoints
    if (pathname === '/api/admin/upload-apk') {
      if (method === 'POST') {
        return uploadApk(createContext(request, env, ctx, {}));
      }
      return errorResponse('Method Not Allowed', 405);
    }

    if (pathname === '/api/admin/upload-logo') {
      if (method === 'POST') {
        return uploadLogo(createContext(request, env, ctx, {}));
      }
      return errorResponse('Method Not Allowed', 405);
    }

    // Fallback: 404 for unknown /api/* routes
    if (pathname.startsWith('/api/')) {
      return errorResponse(`Endpoint not found: ${pathname}`, 404);
    }

    // 6. Static Assets (HTML, CSS, JS, Images, SPA routing)
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
