import React from 'react';
import Leaderboard from './components/Leaderboard';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1a1a1a',
    },
    primary: {
      main: '#1a75ff',
    },
    
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Leaderboard />
    </ThemeProvider>
  );
}

export default App;
