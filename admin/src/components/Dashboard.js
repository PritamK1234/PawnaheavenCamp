import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyAPI, authAPI } from '../services/api';

const Dashboard = () => {
  const [properties, setProperties] = useState([]);
  const [categorySettings, setCategorySettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const navigate = useNavigate();

  const [expandedCard, setExpandedCard] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      setAdmin(JSON.parse(adminData));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [propRes, settingsRes] = await Promise.all([
        propertyAPI.getAll(),
        propertyAPI.getCategorySettings()
      ]);
      if (propRes.data.success) {
        setProperties(propRes.data.data);
      }
      if (settingsRes.data.success) {
        setCategorySettings(settingsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategory = async (category, currentStatus) => {
    let reason = '';
    let closedFrom = null;
    let closedTo = null;

    if (!currentStatus) {
      reason = window.prompt('Enter Closure Reason:', 'Maintenance');
      if (reason === null) return;
      
      const closureDate = window.prompt('Enter Closure Date/Period (e.g., 10th Jan):', '');
      if (closureDate === null) return;
      
      closedFrom = closureDate;
      closedTo = closureDate; // Use same value for simplicity if needed by DB, but we'll focus on 'from'
    }
    
    try {
      const response = await propertyAPI.updateCategorySettings(category, {
        is_closed: !currentStatus,
        closed_reason: reason,
        closed_from: closedFrom,
        closed_to: closedTo
      });
      if (response.data.success) {
        fetchData();
      }
    } catch (error) {
      alert('Failed to update category status');
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      navigate('/login', { replace: true });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      const response = await propertyAPI.delete(id);
      if (response.data.success) {
        alert('Property deleted successfully');
        fetchData();
      }
    } catch (error) {
      alert('Failed to delete property');
      console.error(error);
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToggleActive = async (id, currentValue) => {
    try {
      const response = await propertyAPI.toggleStatus(
        id,
        'is_active',
        !currentValue
      );
      if (response.data.success) {
        fetchData();
      }
    } catch (error) {
      alert('Failed to update property status');
      console.error(error);
    }
  };

  const handleToggleTopSelling = async (id, currentValue) => {
    try {
      const response = await propertyAPI.toggleStatus(
        id,
        'is_top_selling',
        !currentValue
      );
      if (response.data.success) {
        fetchData();
      }
    } catch (error) {
      alert('Failed to update property status');
      console.error(error);
    }
  };

  const handleToggleAvailability = async (id, currentValue) => {
    try {
      const response = await propertyAPI.toggleStatus(
        id,
        'is_available',
        !currentValue
      );
      if (response.data.success) {
        fetchData();
      }
    } catch (error) {
      alert('Failed to update property availability');
      console.error(error);
    }
  };

  const activeProperties = properties.filter((p) => p.is_active).length;
  const topSellingProperties = properties.filter((p) => p.is_top_selling).length;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className={`property-card-overlay ${expandedCard ? 'visible' : ''}`} onClick={() => setExpandedCard(null)}></div>
      <header className="admin-header">
        <div className="container">
          <h1>LoonCamp Admin</h1>
          <div className="header-actions">
            <button className="icon-btn" title="Transactions" onClick={() => alert('Transactions view coming soon')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </button>
            <button className="icon-btn" title="Call Support" onClick={() => window.open('tel:+918669505727')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
            <button className="icon-btn" title="WhatsApp Support" onClick={() => window.open('https://wa.me/918669505727')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </button>
            <button className="icon-btn" title="Notifications">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span className="badge">3</span>
            </button>
            <button className="icon-btn logout" title="Logout" onClick={handleLogout}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="dashboard-grid">
          <div className="dashboard-card total-properties">
            <p>Total Properties</p>
            <h3>{properties.length}</h3>
          </div>
          {categorySettings.map(setting => (
            <div 
              key={setting.category} 
              className={`dashboard-card category-card ${setting.category} ${setting.is_closed ? 'closed' : ''}`}
            >
              <div className="card-header">
                <h3>{setting.category}</h3>
                <button 
                  className={`btn-status-toggle ${setting.is_closed ? 'btn-success' : 'btn-danger'}`}
                  onClick={() => handleToggleCategory(setting.category, setting.is_closed)}
                >
                  {setting.is_closed ? 'Open' : 'Close'}
                </button>
              </div>
              <div className="card-body">
                <span className="status-text">{setting.is_closed ? 'Closed' : 'Active'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="category-tabs">
          {['all', 'camping', 'cottage', 'villa'].map(cat => (
            <button
              key={cat}
              className={`tab-btn ${activeCategory === cat ? 'active' : ''}`}
              style={{ textTransform: 'capitalize' }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="properties-section">
        <div className="properties-header">
          <h2>All Properties</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-container" style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  width: '250px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  background: '#f8fafc'
                }}
              />
            </div>
            <button
              className="btn btn-success"
              onClick={() => navigate('/property/new')}
            >
              Add New Property
            </button>
          </div>
        </div>

          {properties.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              No properties found. Add your first property!
            </p>
          ) : (
            <>
              {/* Mobile Card Grid */}
              <div className="properties-grid">
                {filteredProperties.map((property) => (
                  <div 
                    key={property.id} 
                    className={`property-card ${expandedCard === property.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedCard(expandedCard === property.id ? null : property.id)}
                  >
                    <img 
                      src={property.images && property.images[0] ? property.images[0] : 'https://via.placeholder.com/300x200?text=No+Image'} 
                      alt={property.title}
                      className="property-card-image"
                    />
                    <div className="property-card-content">
                      <h4 className="property-card-title">{property.title}</h4>
                      <p className="property-card-price">₹{property.price}</p>
                      <div className="property-card-actions">
                        <div className="property-contact-btns">
                          <button 
                            className="contact-mini-btn btn-call-mini"
                            title="Call Owner"
                            onClick={(e) => { e.stopPropagation(); window.open(`tel:${property.owner_mobile || property.phone || '+918669505727'}`); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          </button>
                          <button 
                            className="contact-mini-btn btn-whatsapp-mini"
                            title="WhatsApp Owner"
                            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${(property.owner_mobile || property.whatsapp || '918669505727').replace(/[^0-9]/g, '')}?text=Admin inquiry about ${property.title}`); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                          </button>
                        </div>
                        <button 
                          className="btn-edit-mini"
                          onClick={(e) => { e.stopPropagation(); navigate(`/property/edit/${property.id}`); }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="property-card-expanded-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        <button
                          className="action-btn action-btn-edit"
                          onClick={() => navigate(`/property/edit/${property.id}`)}
                        >
                          Edit
                        </button>
                        <button
                          className={`action-btn ${property.is_active ? 'action-btn-deactivate' : 'action-btn-toggle'}`}
                          onClick={() => handleToggleActive(property.id, property.is_active)}
                        >
                          {property.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className={`action-btn ${property.is_available ? 'action-btn-booked' : 'action-btn-available'}`}
                          onClick={() => handleToggleAvailability(property.id, property.is_available)}
                        >
                          {property.is_available ? 'Mark Booked' : 'Mark Available'}
                        </button>
                        <button
                          className={`action-btn ${property.is_top_selling ? 'action-btn-remove-top' : 'action-btn-top'}`}
                          onClick={() => handleToggleTopSelling(property.id, property.is_top_selling)}
                        >
                          {property.is_top_selling ? 'Remove Top' : 'Mark Top'}
                        </button>
                        <button
                          className="action-btn action-btn-delete"
                          onClick={() => handleDelete(property.id)}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="property-contact-btns" style={{ marginTop: '15px', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ width: 'auto', flex: 1 }}
                          onClick={() => window.open(`tel:${property.owner_mobile || property.phone || '+918669505727'}`)}
                        >
                          Call Owner
                        </button>
                        <button 
                          className="btn btn-success" 
                          style={{ width: 'auto', flex: 1 }}
                          onClick={() => window.open(`https://wa.me/${(property.owner_mobile || property.whatsapp || '918669505727').replace(/[^0-9]/g, '')}?text=Admin inquiry about ${property.title}`)}
                        >
                          WhatsApp Owner
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="properties-table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="properties-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Price</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((property) => (
                    <tr key={property.id}>
                      <td data-label="ID">{property.id}</td>
                      <td data-label="Title">{property.title}</td>
                      <td data-label="Category">
                        <span
                          style={{
                            textTransform: 'capitalize',
                            padding: '4px 8px',
                            background: '#e2e8f0',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          {property.category}
                        </span>
                      </td>
                      <td data-label="Location">{property.location}</td>
                      <td data-label="Price">{property.price}</td>
                      <td data-label="Rating">{property.rating}</td>
                      <td data-label="Status">
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <span
                            className={`status-badge ${
                              property.is_active ? 'status-active' : 'status-inactive'
                            }`}
                          >
                            {property.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span
                            className={`status-badge ${
                              property.is_available ? 'status-active' : 'status-inactive'
                            }`}
                            style={{ 
                              background: property.is_available ? 'rgba(0, 255, 65, 0.2)' : 'rgba(255, 69, 0, 0.2)',
                              color: property.is_available ? '#00FF41' : '#FF4500'
                            }}
                          >
                            {property.is_available ? 'Available' : 'Booked'}
                          </span>
                          {property.is_top_selling && (
                            <span className="status-badge status-top-selling">
                              Top Selling
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Actions">
                        <div className="action-buttons">
                          <button
                            className="action-btn action-btn-edit"
                            onClick={() => navigate(`/property/edit/${property.id}`)}
                          >
                            Edit
                          </button>
                          <button
                            className={`action-btn ${property.is_active ? 'action-btn-deactivate' : 'action-btn-toggle'}`}
                            onClick={() =>
                              handleToggleActive(property.id, property.is_active)
                            }
                          >
                            {property.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            className={`action-btn ${property.is_available ? 'action-btn-booked' : 'action-btn-available'}`}
                            onClick={() =>
                              handleToggleAvailability(property.id, property.is_available)
                            }
                          >
                            {property.is_available ? 'Mark Booked' : 'Mark Available'}
                          </button>
                          <button
                            className={`action-btn ${property.is_top_selling ? 'action-btn-remove-top' : 'action-btn-top'}`}
                            onClick={() =>
                              handleToggleTopSelling(
                                property.id,
                                property.is_top_selling
                              )
                            }
                          >
                            {property.is_top_selling ? 'Remove Top' : 'Mark Top'}
                          </button>
                          <button
                            className="action-btn action-btn-delete"
                            onClick={() => handleDelete(property.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
