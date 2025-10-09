import React, { useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaMicrochip, FaPlay } from 'react-icons/fa';
import Navbar from '../../components/Navbar';
import { db } from '../../firebase';
import { checkSensorInventory, initializeSensorInventory } from '../../utils/initializeSensorInventory';

const InitializeSensorInventory = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [inventoryStatus, setInventoryStatus] = useState(null);
  const [startNum, setStartNum] = useState(2);
  const [endNum, setEndNum] = useState(1000);

  const handleInitialize = async () => {
    if (!window.confirm(`⚠️ WARNING: This will create ${endNum - startNum + 1} sensor records.\n\nAre you sure you want to continue?`)) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await initializeSensorInventory(startNum, endNum);
      setResult(res);
      
      if (res.success > 0) {
        alert(`✅ Success!\n\nCreated ${res.success} sensors.\nFailed: ${res.failed}`);
      }
    } catch (error) {
      console.error('Initialization error:', error);
      alert('❌ Initialization failed!\n\n' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInventory = async () => {
    setLoading(true);
    try {
      const status = await checkSensorInventory(db);
      setInventoryStatus(status);
    } catch (error) {
      console.error('Error checking inventory:', error);
      alert('Failed to check inventory: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{
        marginTop: '80px',
        padding: '40px 20px',
        maxWidth: '1200px',
        margin: '80px auto 0'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <FaMicrochip size={48} style={{ color: '#4CAF50', marginBottom: '16px' }} />
            <h1 style={{ fontSize: '28px', color: '#333', marginBottom: '8px' }}>
              Sensor Inventory Initialization
            </h1>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Set up and manage your sensor inventory (SensorCollection)
            </p>
          </div>

          {/* Warning */}
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            gap: '12px'
          }}>
            <FaExclamationTriangle style={{ color: '#ff9800', fontSize: '20px', flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#856404' }}>Important:</strong>
              <p style={{ margin: '4px 0 0', color: '#856404', fontSize: '14px' }}>
                This should only be run ONCE during initial setup. Running it multiple times may create duplicate entries.
              </p>
            </div>
          </div>

          {/* Check Inventory Status */}
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>
              Current Inventory Status
            </h3>
            <button
              onClick={handleCheckInventory}
              disabled={loading}
              style={{
                background: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Checking...' : 'Check Inventory'}
            </button>

            {inventoryStatus && (
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Total Sensors</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{inventoryStatus.total}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Available</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>{inventoryStatus.available}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Linked</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>{inventoryStatus.linked}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Deployed</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>{inventoryStatus.deployed}</div>
                </div>
              </div>
            )}
          </div>

          {/* Initialize Inventory */}
          <div style={{
            backgroundColor: '#e8f5e9',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>
              Initialize Sensor Inventory
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  Start Number
                </label>
                <input
                  type="number"
                  value={startNum}
                  onChange={(e) => setStartNum(parseInt(e.target.value) || 2)}
                  min="1"
                  max="9999"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  End Number
                </label>
                <input
                  type="number"
                  value={endNum}
                  onChange={(e) => setEndNum(parseInt(e.target.value) || 1000)}
                  min="2"
                  max="9999"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
              This will create <strong style={{ color: '#4CAF50' }}>{endNum - startNum + 1}</strong> sensor records 
              (from <strong>{String(startNum).padStart(4, '0')}</strong> to <strong>{String(endNum).padStart(4, '0')}</strong>)
            </div>

            <button
              onClick={handleInitialize}
              disabled={loading || startNum >= endNum}
              style={{
                background: (loading || startNum >= endNum) ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: (loading || startNum >= endNum) ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaPlay />
              {loading ? 'Initializing...' : 'Initialize Inventory'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div style={{
              backgroundColor: result.failed === 0 ? '#e8f5e9' : '#fff3e0',
              borderRadius: '8px',
              padding: '20px',
              border: `2px solid ${result.failed === 0 ? '#4CAF50' : '#FF9800'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <FaCheckCircle size={24} style={{ color: result.failed === 0 ? '#4CAF50' : '#FF9800' }} />
                <h3 style={{ margin: 0, color: '#333' }}>Initialization Results</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Success</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>{result.success}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Failed</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f44336' }}>{result.failed}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Total</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>{result.success + result.failed}</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <strong style={{ color: '#d32f2f' }}>Errors:</strong>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '8px' }}>
                    {result.errors.map((err, idx) => (
                      <div key={idx} style={{ fontSize: '12px', color: '#666', padding: '4px 0' }}>
                        Sensor {err.sensorNumber}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div style={{
            marginTop: '32px',
            padding: '20px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#666'
          }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>📖 Instructions</h4>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Click "Check Inventory" to see current status</li>
              <li style={{ marginBottom: '8px' }}>Set the start and end numbers (default: 0002 - 1000)</li>
              <li style={{ marginBottom: '8px' }}>Click "Initialize Inventory" to create sensors</li>
              <li style={{ marginBottom: '8px' }}>Wait for the process to complete (may take a few minutes)</li>
              <li>Verify in Firebase Console: SensorCollection</li>
            </ol>
            <p style={{ marginTop: '16px', marginBottom: 0 }}>
              <strong>Note:</strong> For detailed documentation, see <code>SENSOR_INVENTORY_SETUP.md</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitializeSensorInventory;

