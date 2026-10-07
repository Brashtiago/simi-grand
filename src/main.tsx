import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from '@/lib/auth';
import { RoomsProvider } from '@/lib/rooms';
import { HotelDataProvider } from '@/lib/hotel-data';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <HotelDataProvider>
        <RoomsProvider>
          <App />
        </RoomsProvider>
      </HotelDataProvider>
    </AuthProvider>
  </StrictMode>
);
