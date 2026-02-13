import type {NextConfig} from 'next';

import fs from 'fs';
import path from 'path';
import process from 'process';
import {getApiUrl} from 'src/utils/environment';

// Импортируем package.json для получения версии (безопасным способом)
const packageInfo = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// Определяем окружение приложения
const appEnv = process.env.NODE_ENV || 'development';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@radix-ui/themes'],

  // Добавляем настройки для отладки
  ...(appEnv === 'development' && {
    webpack: (config, {dev, isServer}) => {
      if (dev) {
        config.devtool = 'eval-source-map';
      }
      return config;
    }
  }),

  sassOptions: {
    includePaths: [path.resolve(process.cwd(), 'src/styles')],
    prependData: `
      @use 'variables' as *;
      @use 'mixins' as *;
    `
  },
  // Делаем переменные окружения доступными для клиентского кода
  env: {
    NEXT_PUBLIC_APP_ENV: appEnv,
    NEXT_PUBLIC_APP_VERSION: packageInfo.version,
    NEXT_PUBLIC_API_URL: getApiUrl(),
    NEXT_PUBLIC_EDITION: process.env.NEXT_PUBLIC_EDITION || 'cloud'
  }
};

export default nextConfig;
