import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardRedirect = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const ownerDataString = localStorage.getItem('ownerData');
    if (!ownerDataString) {
      navigate('/owner/login');
      return;
    }

    try {
      const ownerData = JSON.parse(ownerDataString);
      // Backend uses 'campings_cottages' or 'villa'
      if (ownerData.property_type === 'villa') {
        navigate('/owner/dashboard/villa');
      } else {
        navigate('/owner/dashboard/camping');
      }
    } catch (e) {
      navigate('/owner/login');
    }
  }, [navigate]);

  return null;
};

export default DashboardRedirect;
