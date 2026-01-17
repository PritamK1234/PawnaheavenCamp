import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { propertyAPI } from '../services/api';

const PropertyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'camping',
    location: '',
    map_link: '',
    rating: 4.5,
    price: '',
    price_note: 'per person with meal',
    capacity: 4,
    check_in_time: '2:00 PM',
    check_out_time: '11:00 AM',
    status: 'Verified',
    is_top_selling: false,
    is_active: true,
    is_available: true,
    contact: '+91 8806092609',
    property_category: 'affordable',
    owner_mobile: '',
    amenities: [''],
    activities: [''],
    highlights: [''],
    policies: [''],
    images: [''],
  });

  useEffect(() => {
    if (isEditMode) {
      fetchProperty();
    }
  }, [id]);

  const fetchProperty = async () => {
    setLoading(true);
    try {
      const response = await propertyAPI.getById(id);
      if (response.data.success) {
        const property = response.data.data;
        const imageUrls = Array.isArray(property.images) 
          ? property.images.map(img => typeof img === 'string' ? img : img.image_url).filter(Boolean)
          : [];
          
        setFormData({
          title: property.title || '',
          description: property.description || '',
          category: property.category || 'camping',
          location: property.location || '',
          map_link: property.map_link || '',
          rating: property.rating || 4.5,
          price: property.price || '',
          price_note: property.price_note || 'per person with meal',
          capacity: property.capacity || 4,
          check_in_time: property.check_in_time || '2:00 PM',
          check_out_time: property.check_out_time || '11:00 AM',
          status: property.status || 'Verified',
          is_top_selling: property.is_top_selling || false,
          is_active: property.is_active !== undefined ? property.is_active : true,
          is_available: property.is_available !== undefined ? property.is_available : true,
          contact: property.contact || '+91 8806092609',
          property_category: property.property_category || 'affordable',
          owner_mobile: property.owner_mobile || '',
          amenities: property.amenities?.length > 0 ? property.amenities : [''],
          activities: property.activities?.length > 0 ? property.activities : [''],
          highlights: property.highlights?.length > 0 ? property.highlights : [''],
          policies: property.policies?.length > 0 ? property.policies : [''],
          images: imageUrls.length > 0 ? imageUrls : [''],
        });
      }
    } catch (error) {
      alert('Failed to fetch property details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleArrayChange = (field, index, value) => {
    setFormData((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData((prev) => {
      const newArray = prev[field].filter((_, i) => i !== index);
      return {
        ...prev,
        [field]: newArray.length > 0 ? newArray : [''],
      };
    });
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await propertyAPI.uploadImage(formData);
        if (!response.data.success) throw new Error(response.data.message || 'Upload failed');
        return response.data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images.filter(img => img !== ''), ...uploadedUrls],
      }));
    } catch (error) {
      alert(`Failed to upload images: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanedData = {
        ...formData,
        amenities: formData.amenities.filter(i => i.trim()),
        activities: formData.activities.filter(i => i.trim()),
        highlights: formData.highlights.filter(i => i.trim()),
        policies: formData.policies.filter(i => i.trim()),
        images: formData.images.filter(i => i.trim()),
        rating: parseFloat(formData.rating),
        capacity: parseInt(formData.capacity),
      };

      const response = isEditMode 
        ? await propertyAPI.update(id, cleanedData)
        : await propertyAPI.create(cleanedData);

      if (response.data.success) {
        alert(isEditMode ? 'Updated!' : 'Created!');
        navigate('/');
      }
    } catch (error) {
      alert('Error saving property');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) return <div className="loading">Loading...</div>;

  return (
    <div>
      <header className="admin-header">
        <div className="container header-container">
          <h1>{isEditMode ? 'Edit Property' : 'Add New Property'}</h1>
          <div className="header-actions">
            <button className="btn btn-secondary btn-header-back" onClick={() => navigate('/')}>Back</button>
          </div>
        </div>
      </header>

      <div className="container">
        <form className="property-form" onSubmit={handleSubmit}>
          <div className="status-checkbox-section">
            <div className="status-group">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="Verified">Verified</option>
                  <option value="Pending">Pending</option>
                  <option value="Unverified">Unverified</option>
                </select>
              </div>
            </div>
            <div className="checkbox-row">
              <label className="checkbox-label">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
                Active
              </label>
              <label className="checkbox-label">
                <input type="checkbox" name="is_available" checked={formData.is_available} onChange={handleChange} />
                Available
              </label>
              <label className="checkbox-label">
                <input type="checkbox" name="is_top_selling" checked={formData.is_top_selling} onChange={handleChange} />
                Top Selling
              </label>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Property Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select name="category" value={formData.category} onChange={handleChange} required>
                <option value="camping">Camping</option>
                <option value="cottage">Cottage</option>
                <option value="villa">Villa</option>
              </select>
            </div>

            <div className="form-group">
              <label>Property Category (Filter) *</label>
              <select name="property_category" value={formData.property_category || 'affordable'} onChange={handleChange} required>
                <option value="affordable">Affordable</option>
                <option value="premium">Premium</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>

            <div className="form-group">
              <label>Location *</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} required />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Find us on map (Google Maps Link) *</label>
              <input 
                type="text" 
                name="map_link" 
                value={formData.map_link} 
                onChange={handleChange} 
                required 
                placeholder="Paste Google Maps URL here"
              />
            </div>

            <div className="form-group">
              <label>Price *</label>
              <input type="text" name="price" value={formData.price} onChange={handleChange} required className="price-input" />
            </div>

            <div className="form-group">
              <label>Price Note *</label>
              <input type="text" name="price_note" value={formData.price_note} onChange={handleChange} required />
            </div>

            <div className="form-group full-width">
              <div className="inline-group">
                <div className="aligned-field">
                  <label>Max Capacity *</label>
                  <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} required />
                </div>
                <div className="aligned-field">
                  <label>Rating (0-5) *</label>
                  <input type="number" name="rating" value={formData.rating} onChange={handleChange} required step="0.1" />
                </div>
              </div>
            </div>

            <div className="form-group full-width">
              <div className="inline-group">
                <div className="aligned-field">
                  <label>Check-in Time</label>
                  <input type="text" name="check_in_time" value={formData.check_in_time} onChange={handleChange} />
                </div>
                <div className="aligned-field">
                  <label>Check-out Time</label>
                  <input type="text" name="check_out_time" value={formData.check_out_time} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Owner Mobile Number *</label>
              <input type="text" name="owner_mobile" value={formData.owner_mobile} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Contact Phone (WhatsApp) *</label>
              <input type="text" name="contact" value={formData.contact} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Amenities *</label>
            {formData.amenities.map((item, index) => (
              <div key={index} className="array-input-group">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleArrayChange('amenities', index, e.target.value)}
                  placeholder="Amenity"
                  required
                />
                <button type="button" className="btn-remove" onClick={() => removeArrayItem('amenities', index)}>×</button>
              </div>
            ))}
            <button type="button" className="btn btn-add" onClick={() => addArrayItem('amenities')}>+ Add Amenity</button>
          </div>

          <div className="form-group">
            <label>Activities *</label>
            {formData.activities.map((item, index) => (
              <div key={index} className="array-input-group">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleArrayChange('activities', index, e.target.value)}
                  placeholder="Activity"
                  required
                />
                <button type="button" className="btn-remove" onClick={() => removeArrayItem('activities', index)}>×</button>
              </div>
            ))}
            <button type="button" className="btn btn-add" onClick={() => addArrayItem('activities')}>+ Add Activity</button>
          </div>

          <div className="form-group">
            <label>Highlights *</label>
            {formData.highlights.map((item, index) => (
              <div key={index} className="array-input-group">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleArrayChange('highlights', index, e.target.value)}
                  placeholder="Highlight"
                  required
                />
                <button type="button" className="btn-remove" onClick={() => removeArrayItem('highlights', index)}>×</button>
              </div>
            ))}
            <button type="button" className="btn btn-add" onClick={() => addArrayItem('highlights')}>+ Add Highlight</button>
          </div>

          <div className="form-group">
            <label>Policies</label>
            {formData.policies.map((item, index) => (
              <div key={index} className="array-input-group">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleArrayChange('policies', index, e.target.value)}
                  placeholder="Policy"
                />
                <button type="button" className="btn-remove" onClick={() => removeArrayItem('policies', index)}>×</button>
              </div>
            ))}
            <button type="button" className="btn btn-add" onClick={() => addArrayItem('policies')}>+ Add Policy</button>
          </div>

          <div className="form-group">
            <label>Property Images *</label>
            <div className="image-upload-section">
              <input type="file" multiple onChange={handleFileUpload} accept="image/*" disabled={uploading} />
              {uploading && <p className="loading-text">Uploading images...</p>}
              
              <div className="image-preview-grid">
                {formData.images.map((url, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={url} alt={`Preview ${index}`} />
                    <button type="button" className="btn-remove-image" onClick={() => removeArrayItem('images', index)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required rows="4" />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {isEditMode ? 'Update' : 'Create'} Property
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyForm;
