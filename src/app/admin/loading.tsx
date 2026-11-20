import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

export default function Loading() {
  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000 }} role="status" aria-label="Loading">
      <LinearProgress sx={{ height: 3 }} />
    </Box>
  );
}
