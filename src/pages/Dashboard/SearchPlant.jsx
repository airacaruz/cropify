import React, { useState } from 'react';
import { FaDatabase, FaLeaf, FaSearch } from 'react-icons/fa';
import Navbar from '../../components/Navbar';
import { getAllPlantsFromCollection, searchPlantByName } from '../../utils/searchPlant';

const SearchPlant = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState('all');

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      alert('Please enter a plant name to search');
      return;
    }

    setSearching(true);
    setResults(null);

    try {
      const searchResults = await searchPlantByName(searchTerm);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching for plant: ' + error.message);
    } finally {
      setSearching(false);
    }
  };

  const handleViewAll = async (collectionName) => {
    setSearching(true);
    setResults(null);

    try {
      const allPlants = await getAllPlantsFromCollection(collectionName);
      setResults({
        [collectionName]: allPlants,
        SensorKits: collectionName === 'SensorKits' ? allPlants : [],
        SensorCollection: collectionName === 'SensorCollection' ? allPlants : [],
        Growers: collectionName === 'Growers' ? allPlants : [],
        Plants: collectionName === 'Plants' ? allPlants : []
      });
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Error fetching from collection: ' + error.message);
    } finally {
      setSearching(false);
    }
  };

  const getTotalResults = () => {
    if (!results) return 0;
    return (
      results.SensorKits.length +
      results.SensorCollection.length +
      results.Growers.length +
      results.Plants.length +
      (results.RealtimeDB_Plants?.length || 0) +
      (results.RealtimeDB_Sensors?.length || 0)
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar />
      
      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px', color: '#2e7d32' }}>
          <FaLeaf style={{ marginRight: '10px' }} />
          Search Plants in Database
        </h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Search for plants across all Firestore collections
        </p>

        {/* Search Form */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Enter plant name (e.g., "letty lettuce", "tomato")'
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
              <button
                type="submit"
                disabled={searching}
                style={{
                  padding: '12px 30px',
                  backgroundColor: searching ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: searching ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.3s'
                }}
                onMouseEnter={(e) => !searching && (e.target.style.backgroundColor = '#45a049')}
                onMouseLeave={(e) => !searching && (e.target.style.backgroundColor = '#4CAF50')}
              >
                <FaSearch /> {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <p style={{ width: '100%', color: '#666', fontSize: '14px', marginBottom: '10px' }}>
              Quick Actions:
            </p>
            {['Growers', 'SensorKits', 'SensorCollection', 'Plants'].map((collection) => (
              <button
                key={collection}
                onClick={() => handleViewAll(collection)}
                disabled={searching}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#4CAF50',
                  border: '2px solid #4CAF50',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: searching ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  if (!searching) {
                    e.target.style.backgroundColor = '#4CAF50';
                    e.target.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!searching) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#4CAF50';
                  }
                }}
              >
                <FaDatabase style={{ marginRight: '5px' }} />
                View All {collection}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {results && (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
              Search Results
            </h2>

            {/* Summary */}
            <div style={{
              padding: '20px',
              backgroundColor: getTotalResults() > 0 ? '#e8f5e9' : '#ffebee',
              borderRadius: '8px',
              marginBottom: '30px'
            }}>
              <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>
                {getTotalResults() > 0 
                  ? `✅ Found ${getTotalResults()} result(s)`
                  : '❌ No results found'}
              </p>
              <div style={{ fontSize: '14px', color: '#666' }}>
                <p><strong>Firestore Collections:</strong></p>
                <p>• SensorKits: {results.SensorKits.length} matches</p>
                <p>• SensorCollection: {results.SensorCollection.length} matches</p>
                <p>• Growers: {results.Growers.length} matches</p>
                <p>• Plants: {results.Plants.length} matches</p>
                <p style={{ marginTop: '10px' }}><strong>🔥 Realtime Database:</strong></p>
                <p>• 📱 Plants (Mobile App): {results.RealtimeDB_Plants?.length || 0} matches</p>
                <p>• 🔧 Sensors: {results.RealtimeDB_Sensors?.length || 0} matches</p>
              </div>
            </div>

            {/* Detailed Results */}
            {getTotalResults() > 0 && (
              <div>
                {/* SensorKits Results */}
                {results.SensorKits.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', color: '#4CAF50' }}>
                      🔧 SensorKits Collection ({results.SensorKits.length})
                    </h3>
                    {results.SensorKits.map((item, index) => (
                      <div key={index} style={{
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderLeft: '4px solid #4CAF50',
                        borderRadius: '8px',
                        marginBottom: '10px'
                      }}>
                        <p><strong>ID:</strong> {item.id}</p>
                        <p><strong>Plant Name:</strong> {item.plantName}</p>
                        <p><strong>Sensor Code:</strong> {item.sensorCode || 'N/A'}</p>
                        <p><strong>User ID:</strong> {item.userId || 'N/A'}</p>
                        <p><strong>Linked:</strong> {item.linked ? '✅ Yes' : '❌ No'}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* SensorCollection Results */}
                {results.SensorCollection.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', color: '#4CAF50' }}>
                      📦 SensorCollection ({results.SensorCollection.length})
                    </h3>
                    {results.SensorCollection.map((item, index) => (
                      <div key={index} style={{
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderLeft: '4px solid #2196F3',
                        borderRadius: '8px',
                        marginBottom: '10px'
                      }}>
                        <p><strong>ID:</strong> {item.id}</p>
                        <p><strong>Plant Name:</strong> {item.plantName}</p>
                        <p><strong>Sensor Code:</strong> {item.sensorCode || 'N/A'}</p>
                        <p><strong>Status:</strong> {item.status || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Growers Results */}
                {results.Growers.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', color: '#4CAF50' }}>
                      👨‍🌾 Growers Collection ({results.Growers.length})
                    </h3>
                    {results.Growers.map((item, index) => (
                      <div key={index} style={{
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderLeft: '4px solid #FF9800',
                        borderRadius: '8px',
                        marginBottom: '10px'
                      }}>
                        <p><strong>Grower ID:</strong> {item.growerId || item.id}</p>
                        <p><strong>Plant Name:</strong> {item.name || item.plantName}</p>
                        <p><strong>Plant Type:</strong> {item.type || item.plantType || 'N/A'}</p>
                        <p><strong>Sensor Code:</strong> {item.sensorCode || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Plants Results */}
                {results.Plants.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', color: '#4CAF50' }}>
                      🌱 Plants Collection ({results.Plants.length})
                    </h3>
                    {results.Plants.map((item, index) => (
                      <div key={index} style={{
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderLeft: '4px solid #8BC34A',
                        borderRadius: '8px',
                        marginBottom: '10px'
                      }}>
                        <p><strong>ID:</strong> {item.id}</p>
                        <p><strong>Plant Name:</strong> {item.plantName || item.name}</p>
                        <p><strong>Plant Type:</strong> {item.plantType || 'N/A'}</p>
                        <p><strong>Sensor Code:</strong> {item.sensorCode || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Realtime Database - Plants (MOBILE APP DATA) */}
                {results.RealtimeDB_Plants && results.RealtimeDB_Plants.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', color: '#FF5722' }}>
                      🔥📱 Plants - Realtime Database (Mobile App Data) ({results.RealtimeDB_Plants.length})
                    </h3>
                    <div style={{
                      padding: '10px',
                      backgroundColor: '#fff3e0',
                      borderLeft: '4px solid #FF5722',
                      borderRadius: '8px',
                      marginBottom: '15px'
                    }}>
                      <p style={{ fontSize: '13px', color: '#e64a19', fontWeight: '600', margin: 0 }}>
                        ⚠️ This is where mobile app data is stored! Plants added by users via the Cropify mobile app.
                      </p>
                    </div>
                    {results.RealtimeDB_Plants.map((item, index) => (
                      <div key={index} style={{
                        padding: '15px',
                        backgroundColor: '#fff3e0',
                        borderLeft: '4px solid #FF5722',
                        borderRadius: '8px',
                        marginBottom: '10px'
                      }}>
                        <p><strong>🔥 Database Path:</strong> <code style={{ backgroundColor: '#ffe0b2', padding: '2px 6px', borderRadius: '4px' }}>{item.path}</code></p>
                        <p><strong>Plant ID:</strong> {item.id}</p>
                        <p><strong>Plant Name:</strong> <strong style={{ color: '#FF5722', fontSize: '16px' }}>{item.plantName}</strong></p>
                        <p><strong>Plant Type:</strong> {item.plantType || 'N/A'}</p>
                        <p><strong>Sensor Code:</strong> {item.sensorCode || item.code || 'N/A'}</p>
                        <p><strong>User ID:</strong> {item.userId || 'N/A'}</p>
                        <p><strong>Created At:</strong> {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</p>
                        {item.plantId && <p><strong>Plant ID (Legacy):</strong> {item.plantId}</p>}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Realtime Database - Sensors */}
                {results.RealtimeDB_Sensors && results.RealtimeDB_Sensors.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', color: '#9C27B0' }}>
                      🔥🔧 Sensors - Realtime Database ({results.RealtimeDB_Sensors.length})
                    </h3>
                    {results.RealtimeDB_Sensors.map((item, index) => (
                      <div key={index} style={{
                        padding: '15px',
                        backgroundColor: '#f3e5f5',
                        borderLeft: '4px solid #9C27B0',
                        borderRadius: '8px',
                        marginBottom: '10px'
                      }}>
                        <p><strong>🔥 Database Path:</strong> <code style={{ backgroundColor: '#e1bee7', padding: '2px 6px', borderRadius: '4px' }}>{item.path}</code></p>
                        <p><strong>Sensor ID:</strong> {item.id}</p>
                        <p><strong>Plant Name:</strong> <strong style={{ color: '#9C27B0', fontSize: '16px' }}>{item.plantName}</strong></p>
                        <p><strong>Sensor Code:</strong> {item.code || 'N/A'}</p>
                        <p><strong>Linked:</strong> {item.linked ? '✅ Yes' : '❌ No'}</p>
                        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '6px' }}>
                          <p style={{ fontWeight: '600', marginBottom: '5px' }}>📊 Sensor Readings:</p>
                          <p><strong>Temperature:</strong> {item.temperature ? `${item.temperature}°C` : 'N/A'}</p>
                          <p><strong>Humidity:</strong> {item.humidity ? `${item.humidity}%` : 'N/A'}</p>
                          <p><strong>pH:</strong> {item.ph || 'N/A'}</p>
                          <p><strong>TDS:</strong> {item.tds || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPlant;

