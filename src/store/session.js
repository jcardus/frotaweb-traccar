import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'session',
  initialState: {
    server: null,
    user: null,
    socket: null,
    includeLogs: false,
    logs: [],
    positions: {},
    history: {},
    printing: false,
  },
  reducers: {
    setPrinting(state, action) {
      state.printing = action.payload;
    },
    updateServer(state, action) {
      state.server = action.payload;
    },
    updateUser(state, action) {
      state.user = action.payload;
    },
    updateSocket(state, action) {
      state.socket = action.payload;
    },
    enableLogs(state, action) {
      state.includeLogs = action.payload;
      if (!action.payload) {
        state.logs = [];
      }
    },
    updateLogs(state, action) {
      state.logs.push(...action.payload);
    },
    updatePositions(state, action) {
      const liveRoutes = state.user.attributes.mapLiveRoutes || state.server.attributes.mapLiveRoutes || 'none';
      const liveRoutesLimit = state.user.attributes['web.liveRouteLength'] || state.server.attributes['web.liveRouteLength'] || 10;
      action.payload.forEach((position) => {
        state.positions[position.deviceId] = position;
        if (liveRoutes !== 'none') {
          const route = state.history[position.deviceId] || [];
          const last = route.at(-1);
          if (!last || (last[0] !== position.longitude && last[1] !== position.latitude)) {
            state.history[position.deviceId] = [...route.slice(1 - liveRoutesLimit), [position.longitude, position.latitude]];
          }
        } else {
          state.history = {};
        }
      });
    },
  },
});

export { actions as sessionActions };
export { reducer as sessionReducer };
