#!/bin/bash
rm -rf traccar-web
GIT_TRACE=1 git clone --depth 1 https://github.com/jcardus/traccar-web || true
curl https://raw.githubusercontent.com/entrack-plataforma/frotaweb/refs/heads/main/src/theme/palette.js > traccar-web/src/common/theme/palette.js

perl -pi -e "s|'text-field': '▲',|'text-field': '▲','text-size': 20,|g" traccar-web/src/map/MapRoutePoints.js
perl -pi -e "s|'line-width': 2,|'line-width': 3,|g" traccar-web/src/map/MapRoutePath.js
perl -pi -e "s|<ArrowBackIcon />||g" traccar-web/src/common/components/PageLayout.jsx
perl -pi -e 's|"start": "vite"|"start": "vite --host"|g' traccar-web/package.json
perl -pi -e 's|itemSize={72|itemSize={60|' traccar-web/src/main/DeviceList.jsx
perl -pi -e 's|\{window.location.origin\}|\{window.location.origin}/fleet_traccar/static/traccar|g' traccar-web/src/settings/SharePage.jsx
perl -pi -e 's|<BrowserRouter>|<BrowserRouter basename="/fleet_traccar/static/traccar">|g' traccar-web/src/index.jsx
perl -pi -e 's|<Route path="/" element={<App />|<Route path="/index.html" element={<App />|g' traccar-web/src/navigation.jsx
cp -v vite.odoo.config.js traccar-web/vite.config.js
cp -v index.html traccar-web
node prebuild.js

cp -vr src/* traccar-web/src
{
    echo "import './instrument.js';"
    echo "(() => {
            const originalFetch = window.fetch;
            window.fetch = async (input, init) => {
              if (typeof input === 'string' && input.startsWith('/')) {
                input = '/fleet_traccar' + input;
              }
              return originalFetch(input, init);
            };
          })();"
    cat traccar-web/src/index.jsx
} > temp && mv temp traccar-web/src/index.jsx

cd traccar-web || exit
npm install @sentry/vite-plugin @sentry/react maplibregl-mapbox-request-transformer
export VITE_APP_VERSION=$npm_package_version && npm run build

