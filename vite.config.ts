import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ftTmsApiBaseUrl = env.FT_TMS_API_BASE_URL || 'https://api.freighttiger.com/api'
  const ftTmsProxyUrl = env.FT_TMS_PROXY_URL || ''
  const ftTmsUniqueId = env.FT_TMS_UNIQUE_ID || ''
  const ftTmsAppId = env.FT_TMS_APP_ID || 'web'
  const ftTmsBranchFteid = env.FT_TMS_BRANCH_FTEID || ''
  const clientBaseUrl = mode === 'development' ? '/__ft_tms' : ftTmsApiBaseUrl

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_FT_TMS_API_BASE_URL': JSON.stringify(clientBaseUrl),
      'import.meta.env.VITE_FT_TMS_UNIQUE_ID': JSON.stringify(ftTmsUniqueId),
      'import.meta.env.VITE_FT_TMS_APP_ID': JSON.stringify(ftTmsAppId),
      'import.meta.env.VITE_FT_TMS_BRANCH_FTEID': JSON.stringify(ftTmsBranchFteid),
      'import.meta.env.VITE_FT_TMS_AUTH_URL': JSON.stringify(env.FT_TMS_AUTH_URL || 'https://api.freighttiger.com/api/authentication/v1/auth/login')
    },
    server: {
      port: 5173,
      proxy: (ftTmsProxyUrl || ftTmsApiBaseUrl) ? {
        '/__ft_tms': {
          target: (() => {
            // If proxy URL is set, use it; otherwise use API base URL directly
            if (ftTmsProxyUrl) {
              return ftTmsProxyUrl
            }
            // Normalize target URL - remove trailing /api if present to avoid double /api
            // FT_TMS_API_BASE_URL=https://api.freighttiger.com/api -> https://api.freighttiger.com
            return ftTmsApiBaseUrl.endsWith('/api') ? ftTmsApiBaseUrl.slice(0, -4) : ftTmsApiBaseUrl
          })(),
          changeOrigin: true,
          secure: true,
          rewrite: (proxyPath) => {
            if (ftTmsProxyUrl) {
              // When using external proxy server (FT_TMS_PROXY_URL), keep the /__ft_tms prefix
              // The proxy server will strip it and handle the path correctly
              return proxyPath
            }
            // Remove /__ft_tms prefix and forward the rest
            // /__ft_tms/api/authentication/v1/auth/login -> /api/authentication/v1/auth/login
            return proxyPath.replace(/^\/__ft_tms/, '')
          },
          configure: (proxyServer) => {
            // Proxy configuration - authentication headers are added by ftTmsFetch
            // based on tokens stored from login API
            proxyServer.on('proxyReq', (proxyReq, req) => {
              if (req.url && req.url.includes('/journey-snapshot/')) {
                proxyReq.setHeader('Origin', 'https://www.freighttiger.com')
                proxyReq.setHeader('Referer', 'https://www.freighttiger.com/')
              }
            })
          }
        },
        '/__planning': {
          target: 'https://planning-engine-service.freighttiger.com',
          changeOrigin: true,
          secure: true,
          rewrite: (proxyPath) => proxyPath.replace(/^\/__planning/, '')
        }
      } : {
        '/__planning': {
          target: 'https://planning-engine-service.freighttiger.com',
          changeOrigin: true,
          secure: true,
          rewrite: (proxyPath) => proxyPath.replace(/^\/__planning/, '')
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
