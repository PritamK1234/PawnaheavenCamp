const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const categories = ['campings_cottages', 'villa'];
    const propertiesPerCategory = 5;

    const data = {
      campings_cottages: [
        { title: 'Riverfront Tent Stay', location: 'Rishikesh, Uttarakhand' },
        { title: 'Mountain View Camping', location: 'Manali, Himachal Pradesh' },
        { title: 'Desert Safari Camp', location: 'Jaisalmer, Rajasthan' },
        { title: 'Forest Edge Glamping', location: 'Wayanad, Kerala' },
        { title: 'Lakeside Stargazing Camp', location: 'Pawna Lake, Maharashtra' }
      ],
      villa: [
        { title: 'Infinity Pool Villa', location: 'Lonavala, Maharashtra' },
        { title: 'Mediterranean Beach Villa', location: 'Goa' },
        { title: 'Royal Heritage Villa', location: 'Udaipur, Rajasthan' },
        { title: 'Coffee Plantation Mansion', location: 'Coorg, Karnataka' },
        { title: 'Modern Hilltop Estate', location: 'Mahabaleshwar, Maharashtra' }
      ]
    };

    const imageUrls = {
      campings_cottages: [
        'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=60',
        'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=800&q=60',
        'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=60',
        'https://images.unsplash.com/photo-1496080174650-637e3f22fa03?auto=format&fit=crop&w=800&q=60'
      ],
      villa: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=60',
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=60',
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=60',
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=60'
      ]
    };

    for (const category of categories) {
      for (let i = 0; i < propertiesPerCategory; i++) {
        const prop = data[category][i];
        const slug = `${prop.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${i}`;
        
        const res = await client.query(
          `INSERT INTO properties (
            title, slug, description, category, location, rating, price, price_note,
            capacity, amenities, activities, highlights, policies, is_active, is_available
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, true)
          RETURNING id`,
          [
            prop.title,
            slug,
            `Beautiful property located in ${prop.location}. Perfect for a relaxing getaway.`,
            category,
            prop.location,
            4.5 + Math.random() * 0.5,
            category === 'campings_cottages' ? '₹1,999' : '₹12,999',
            'per night',
            category === 'villa' ? 8 : 4,
            JSON.stringify(['Wifi', 'Parking', 'Kitchen', 'View']),
            JSON.stringify(['Hiking', 'Photography', 'Nature Walk']),
            JSON.stringify(['Stunning Views', 'Peaceful Atmosphere']),
            JSON.stringify(['No Smoking', 'No Pets'])
          ]
        );

        const propertyId = res.rows[0].id;
        const imgs = imageUrls[category];
        for (let j = 0; j < imgs.length; j++) {
          await client.query(
            'INSERT INTO property_images (property_id, image_url, display_order) VALUES ($1, $2, $3)',
            [propertyId, imgs[j], j]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Successfully seeded 15 properties');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error seeding data:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();