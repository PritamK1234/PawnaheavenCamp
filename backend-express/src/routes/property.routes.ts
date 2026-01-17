import { Router, Request, Response } from 'express';
import { PropertyRepository } from '../repositories/property.repository';

const router = Router();
const propertyRepo = new PropertyRepository();

const parseJsonField = (field: any): any[] => {
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

router.get('/', async (req: Request, res: Response) => {
  try {
    const properties = await propertyRepo.findAll();

    const propertiesWithImages = await Promise.all(
      properties.map(async (property) => {
        const images = await propertyRepo.findImagesByPropertyId(property.id);
        return {
          ...transformProperty(property),
          images: images.map(img => ({
            id: img.id,
            image_url: img.image_url,
            display_order: img.display_order
          }))
        };
      })
    );

    res.json({
      success: true,
      data: propertiesWithImages
    });
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message
    });
  }
});

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const property = await propertyRepo.findBySlug(slug);

    if (!property) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Property not found'
      });
    }

    const images = await propertyRepo.findImagesByPropertyId(property.id);

    const propertyWithImages = {
      ...transformProperty(property),
      images: images.map(img => ({
        id: img.id,
        image_url: img.image_url,
        display_order: img.display_order
      }))
    };

    res.json({
      success: true,
      data: propertyWithImages
    });
  } catch (error: any) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

export default router;
