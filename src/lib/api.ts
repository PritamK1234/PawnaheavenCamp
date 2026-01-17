const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const parseJsonField = (field: any) => {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  }
  return Array.isArray(field) ? field : [];
};

const transformProperty = (property: any) => {
  return {
    ...property,
    amenities: parseJsonField(property.amenities),
    activities: parseJsonField(property.activities),
    highlights: parseJsonField(property.highlights),
    policies: parseJsonField(property.policies),
  };
};

export const propertyAPI = {
  getPublicList: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties`, {
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
        success: result.success || true,
        data: (result.data || []).map(transformProperty)
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
      const response = await fetch(`${API_BASE_URL}/api/properties/${slug}`, {
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
        success: result.success || true,
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
};
