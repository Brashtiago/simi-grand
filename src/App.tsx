import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingActions from '@/components/FloatingActions';
import ScrollToTop from '@/components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Home from '@/pages/Home';
import Rooms from '@/pages/Rooms';
import RoomDetail from '@/pages/RoomDetail';
import Experiences from '@/pages/Experiences';
import Gallery from '@/pages/Gallery';
import Restaurant from '@/pages/Restaurant';
import Amenities from '@/pages/Amenities';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Location from '@/pages/Location';
import Reviews from '@/pages/Reviews';
import Booking from '@/pages/Booking';
import BookingConfirmation from '@/pages/BookingConfirmation';
import StaffLogin from '@/pages/StaffLogin';
import SetPassword from '@/pages/SetPassword';
import Admin from '@/pages/Admin';
import Manager from '@/pages/Manager';
import Staff from '@/pages/Staff';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingActions />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isStaffRoute =
    location.pathname.startsWith('/staff-login') ||
    location.pathname.startsWith('/set-password') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/manager') ||
    location.pathname.startsWith('/staff');

  if (isStaffRoute) {
    return (
      <Routes>
        <Route path="/staff-login" element={<StaffLogin />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={['Manager', 'Admin']}>
              <Manager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['Staff']}>
              <Staff />
            </ProtectedRoute>
          }
        />
      </Routes>
    );
  }

  return (
    <PublicLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/rooms/:slug" element={<RoomDetail />} />
        <Route path="/experiences" element={<Experiences />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/restaurant" element={<Restaurant />} />
        <Route path="/amenities" element={<Amenities />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/location" element={<Location />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/booking-confirmation" element={<BookingConfirmation />} />
      </Routes>
    </PublicLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
