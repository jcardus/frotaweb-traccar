#!/bin/bash
if [ ! -d "traccar-web" ]; then
  VERSION=cbb8e225d550be0846f34d56745df01cfb6ddef9
  curl -L -o traccar-web.zip "https://github.com/traccar/traccar-web/archive/$VERSION".zip
  unzip -q traccar-web.zip
  mv "traccar-web-$VERSION" traccar-web
  rm traccar-web.zip
fi
curl https://raw.githubusercontent.com/entrack-plataforma/frotaweb/refs/heads/main/src/theme/palette.js > traccar-web/src/common/theme/palette.js

perl -pi -e "s|'line-width': 2,|'line-width': 3,|g" traccar-web/src/map/MapRoutePath.js
perl -pi -e "s|<ArrowBackIcon />||g" traccar-web/src/common/components/PageLayout.jsx
perl -pi -e 's|"start": "vite"|"start": "vite --host"|g' traccar-web/package.json
perl -pi -e 's|itemSize={72|itemSize={60|' traccar-web/src/main/DeviceList.jsx

node prebuild.js
cp -v styles.css traccar-web/public
cp -vr src/* traccar-web/src

if [ -n "${LOGO_URL}" ]; then
  curl "${LOGO_URL}" > traccar-web/public/logo.svg
fi
if [ -n "${LOGO_LARGE_URL}" ]; then
  curl "${LOGO_LARGE_URL}" > traccar-web/src/resources/images/logo.svg
fi

FILES=("vite.config.js" "traccar-web/vite.config.js" "traccar-web/index.html")
for FILE in "${FILES[@]}"; do
    # shellcheck disable=SC2154
    echo "changing title to $TITLE $npm_package_version in $FILE"
    sed -i "s|\${title}|$TITLE $npm_package_version|g" "$FILE" || true
    echo "changing description to $DESCRIPTION in $FILE"
    sed -i "s|\${description}|$DESCRIPTION|g" "$FILE" || true
    sed -i "s|\${name}|$NAME|g" "$FILE" || true
done
cp -v vite.config.js traccar-web
perl -pi -e 's|"/traccar"|"/"|' traccar-web/vite.config.js

{
    echo "import './instrument.js';"
    cat traccar-web/src/index.jsx
} > temp && mv temp traccar-web/src/index.jsx

cat traccar-web/src/index.jsx
mkdir -p functions/traccar
cp -vr functions/api functions/traccar
