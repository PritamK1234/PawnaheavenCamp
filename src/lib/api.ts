const API_BASE_URL = window.location.origin;

const parseJsonField = (field: any) => {
  if (typeof field === 'string') {
    try {
      // Check if it's already a valid JSON string
      if (field.startsWith('[') || field.startsWith('{')) {
        return JSON.parse(field);
      }
      // If it's a comma separated string, split it
      if (field.includes(',')) {
        return field.split(',').map(item => item.trim());
      }
      return [field];
    } catch {
      return [];
    }
  }
  return Array.isArray(field) ? field : [];
};

const transformProperty = (property: any) => {
  const images = Array.isArray(property.images) ? property.images : [];
  return {
    ...property,
    amenities: parseJsonField(property.amenities),
    activities: parseJsonField(property.activities),
    highlights: parseJsonField(property.highlights),
    policies: parseJsonField(property.policies),
    schedule: parseJsonField(property.schedule),
    image: images.length > 0 ? images[0].image_url : "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4",
    images: images.map((img: any) => img.image_url),
    units: property.units || []
  };
};

export const propertyAPI = {
  // ... existing methods
  getUnitCalendar: async (unitId: number) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
      const response = await fetch(`${API_BASE_URL}/api/properties/units/${unitId}/calendar`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      if (!response.ok) throw new Error('Failed to fetch unit calendar');
      return await response.json();
    } catch (error) {
      console.error('Error fetching unit calendar:', error);
      return { success: false, data: [] };
    }
  },
  update: async (id: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update property');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating property:', error);
      return { success: false, message: 'Update failed' };
    }
  },
  getPublicList: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties/public-list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }

      const result = await response.json();

      return {
        success: result.success,
        data: (result.data || []).map(transformProperty),
        categorySettings: result.categorySettings
      };
    } catch (error) {
      console.error('Error fetching properties:', error);
      return {
        success: false,
        data: []
      };
    }
  },
  getPublicBySlug: async (slug: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties/public/${slug}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch property');
      }

      const result = await response.json();

      const transformedProperty = result.data ? transformProperty(result.data) : null;

      return {
        success: result.success,
        data: transformedProperty
      };
    } catch (error) {
      console.error('Error fetching property:', error);
      return {
        success: false,
        data: null
      };
    }
  },
  // Unit Management API
  getUnits: async (propertyId: string) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
      const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/units`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching units:', error);
      return { success: false, data: [] };
    }
  },
  createUnit: async (propertyId: string, data: any) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
      const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/units`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating unit:', error);
      return { success: false };
    }
  },
  updateUnit: async (unitId: number, data: any) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
      const response = await fetch(`${API_BASE_URL}/api/properties/units/${unitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating unit:', error);
      return { success: false };
    }
  },
  deleteUnit: async (unitId: number) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
      const response = await fetch(`${API_BASE_URL}/api/properties/units/${unitId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    } catch (error) {
      console.error('Error deleting unit:', error);
      return { success: false };
    }
  },
  updateUnitCalendar: async (unitId: number, data: any) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
      const response = await fetch(`${API_BASE_URL}/api/properties/units/${unitId}/calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating unit calendar:', error);
      return { success: false };
    }
  }
};
