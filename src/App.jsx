import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery, useTheme } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import BottomMenu from './common/components/BottomMenu';
import SocketController from './SocketController';
import CachingController from './CachingController';
import { useCatch, useEffectAsync } from './reactHelper';
import { useEffect } from 'react';
import { sessionActions } from './store';
import UpdateController from './UpdateController';
import TermsDialog from './common/components/TermsDialog';
import Loader from './common/components/Loader';
import * as Sentry from "@sentry/react";

const useStyles = makeStyles(() => ({
  page: {
    flexGrow: 1,
    overflow: 'auto',
  },
  menu: {
    '@media print': {
      display: 'none !important'
    },
    zIndex: 4,
  },
}));

const App = () => {
  const classes = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const newServer = useSelector((state) => state.session.server.newServer);
  const termsUrl = useSelector((state) => state.session.server.attributes.termsUrl);
  const user = useSelector((state) => state.session.user);

  const acceptTerms = useCatch(async () => {
    const response = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, attributes: { ...user.attributes, termsAccepted: true } }),
    });
    if (response.ok) {
      dispatch(sessionActions.updateUser(await response.json()));
    } else {
      throw Error(await response.text());
    }
  });

  const printing = useSelector((state) => state.session.printing);

  useEffect(() => {
    const handleNavigationMessage = (event) => {
      if (event.data.type === 'navigate' && event.data.path) {
        navigate(event.data.path);
      }
    };

    window.addEventListener('message', handleNavigationMessage);

    return () => {
      window.removeEventListener('message', handleNavigationMessage);
    };
  }, [navigate]);

  useEffectAsync(async () => {
    if (!user) {
      const response = await fetch('/api/session');
      if (response.ok) {
        const user = await response.json()
        dispatch(sessionActions.updateUser(user));
        Sentry.setContext('user', user)
      } else if (newServer) {
        navigate('/register');
      } else {
        navigate('/login');
      }
    }
    return null;
  }, [user]);

  if (user == null) {
    return (<Loader />);
  }
  if (termsUrl && !user.attributes.termsAccepted) {
    return (<TermsDialog open onCancel={() => navigate('/login')} onAccept={() => acceptTerms()} />);
  }
  return (
    <>
      <SocketController />
      <CachingController />
      <UpdateController />
      <div className={classes.page}>
        <Outlet />
      </div>
      {!desktop && !printing && (
        <div className={classes.menu}>
          <BottomMenu />
        </div>
      )}
    </>
  );
};

export default App;
