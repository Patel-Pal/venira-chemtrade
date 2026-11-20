'use client';
import Button from '@mui/material/Button';

export default function PrintButton() {
  return <Button variant="contained" onClick={() => window.print()}>Print / Save as PDF</Button>;
}
