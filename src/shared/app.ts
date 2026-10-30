export const APP_ID = 'com.mehmetburaktaskaya.splitwatch';
export const PRODUCT_NAME = 'Splitwatch';

// YouTube asks native clients to identify themselves with https:// plus the app identifier
// (YouTube API Services, Required Minimum Functionality). Without it the player fails with error 153.
export const YOUTUBE_REFERER = `https://${APP_ID}`;
export const YOUTUBE_URL_PATTERNS = ['https://www.youtube.com/*', 'https://www.youtube-nocookie.com/*'];

// The renderer is served from app://splitwatch/.
export const APP_SCHEME = 'app';
export const APP_HOST = 'splitwatch';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

export const REPOSITORY = 'MehmetBurakTaskaya/splitwatch';
export const RELEASES_URL = `https://github.com/${REPOSITORY}/releases`;
