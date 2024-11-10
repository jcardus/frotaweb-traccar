#!/bin/bash
git clone --depth 1 https://github.com/jcardus/traccar-web || true
find traccar-web/src -type f -name "*.js" -exec sed -i "s/'text-size': 12,/'text-size': 14,/g" {} +

perl -pi -e 's/Noto Sans Regular/Noto Sans Bold/g' traccar-web/src/map/core/mapUtil.js
grep "Noto Sans" traccar-web/src/map/core/mapUtil.js

perl -pi -e 's|\{window.location.origin\}|\{window.location.origin}/traccar|g' traccar-web/src/settings/SharePage.jsx
grep "{window.location.origin}" traccar-web/src/settings/SharePage.jsx

perl -pi -e 's|<BrowserRouter>|<BrowserRouter basename="/traccar">|g' traccar-web/src/index.jsx
grep "BrowserRouter" traccar-web/src/index.jsx

perl -pi -e "s|width: theme.dimensions.drawerWidthDesktop,| maxWidth:theme.dimensions.drawerWidthDesktop,position:'relative !important'|" traccar-web/src/common/components/PageLayout.jsx
grep "theme.dimensions.drawerWidthDesktop" traccar-web/src/common/components/PageLayout.jsx


cp -vr src/* traccar-web/src
cp -v vite.config.js traccar-web

if [ -n "${LOGO_URL}" ]; then
  curl "${LOGO_URL}" > traccar-web/public/logo.svg
fi
if [ -n "${LOGO_LARGE_URL}" ]; then
  curl "${LOGO_LARGE_URL}" > traccar-web/src/resources/images/logo.svg
fi
