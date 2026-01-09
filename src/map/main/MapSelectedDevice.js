import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import dimensions from '../../common/theme/dimensions';
import { map } from '../core/MapView';
import { usePrevious } from '../../reactHelper';
import { useAttributePreference } from '../../common/util/preferences';
import maplibregl from "maplibre-gl";
export const popup = new maplibregl.Popup({offset: 25})
import { createPortal } from "react-dom";
import StatusCard from "../../common/components/StatusCard";
import {devicesActions} from '../../store';
import {useDispatch} from 'react-redux';

let dispatchRef
popup.on('close', () => {
  if (!window.location.pathname.includes('/replay') && !window.location.pathname.includes('/reports')) {
    dispatchRef && dispatchRef(devicesActions.selectId(null))
  }
})

const MapSelectedDevice = ({ mapReady }) => {
  dispatchRef = useDispatch();
  const currentTime = useSelector((state) => state.devices.selectTime);
  const currentId = useSelector((state) => state.devices.selectedId);
  const previousTime = usePrevious(currentTime);
  const previousId = usePrevious(currentId);

  const selectZoom = useAttributePreference('web.selectZoom', 10);
  const mapFollow = useAttributePreference('mapFollow', false);

  const position = useSelector((state) => state.session.positions[currentId]);
  const device = useSelector((state) => state.devices.items[currentId]);
  const containerRef = useRef(document.createElement("div"));


  const previousPosition = usePrevious(position);

  useEffect(() => {
    if (!mapReady) return;

    const positionChanged = position && (!previousPosition || position.latitude !== previousPosition.latitude || position.longitude !== previousPosition.longitude);

    if ((currentId !== previousId || currentTime !== previousTime || (mapFollow && positionChanged)) && position) {
      map.easeTo({
        center: [position.longitude, position.latitude],
        zoom: Math.max(map.getZoom(), selectZoom),
        offset: [0, -dimensions.popupMapOffset / 2],
      });
    }

    if (position) {
      popup.setLngLat([position.longitude, position.latitude])
      if (!popup.isOpen()) {
        popup.setDOMContent(containerRef.current);
        popup.addTo(map)
      }
    }
  }, [currentId, previousId, currentTime, previousTime, mapFollow, position, selectZoom, mapReady]);
  return position
      ? createPortal(
          React.createElement(StatusCard, {
            deviceId: device.id,
            position,
          }),
          containerRef.current)
      : null;
};

MapSelectedDevice.handlesMapReady = true;

export default MapSelectedDevice;
