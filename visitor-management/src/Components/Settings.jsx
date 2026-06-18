import React, { useState, useEffect } from 'react';
import { 
  Layout, Typography, Card, Switch, Space, 
  Tag, Divider, message, Spin 
} from 'antd'; 
import { ScanOutlined, IdcardOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Content } = Layout;

export default function Settings() {
  const [isFingerprintRequired, setIsFingerprintRequired] = useState(() => {
  return sessionStorage.getItem('vms_biometric_required') !== 'false';
});
  const [isRfidEnabled, setIsRfidEnabled] = useState(() => {
    return sessionStorage.getItem('vms_rfid_required') === 'true'; 
  });
  const [pageLoading, setPageLoading] = useState(true);

  // 1. FETCH SETTINGS ON LOAD
  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  const fetchCurrentSettings = async () => {
    try {
      const token = sessionStorage.getItem('vms_access_token');
      /* // UNCOMMENT THIS WHEN DJANGO API IS READY
        const response = await axios.get('http://192.168.0.100:8000/api/hardware/settings/', {
          headers: { Authorization: `Token ${token}` }
        });
        setIsFingerprintRequired(response.data.fingerprintRequired); 
      */
      
      // Simulating network delay for smooth UI
      setTimeout(() => setPageLoading(false), 500);
    } catch (error) {
      message.error('Failed to load biometric settings from server.');
      setPageLoading(false);
    }
  };

  // Settings.jsx - handleToggle function-ah update pannunga
  const handleToggle = async (checked) => {
    setIsFingerprintRequired(checked);
    
    // 🆕 ITHA ADD PANNUNGA: Save to local storage so other pages can see it
    sessionStorage.setItem('vms_biometric_required', checked ? 'true' : 'false');

    try {
      const token = sessionStorage.getItem('vms_access_token');
      // ... (API Code same thaan) ...
      message.success(`Fingerprint requirement turned ${checked ? 'ON' : 'OFF'}`);
    } catch (error) {
      message.error('Failed to update setting. Reverting...');
      setIsFingerprintRequired(!checked);
      sessionStorage.setItem('vms_biometric_required', !checked); // Revert storage too
    }
  };

  const handleRfidToggle = (checked) => {
    setIsRfidEnabled(checked);
    sessionStorage.setItem('vms_rfid_required', checked ? 'true' : 'false');
    message.success(`RFID Scanner turned ${checked ? 'ON' : 'OFF'}`);
  };

  if (pageLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Loading Biometric Configurations..." />
      </div>
    );
  }

  return (
    <Layout style={{ padding: '24px', background: '#f0f2f5', minHeight: '100%' }}>
      <Content>
        <div style={{ marginBottom: 24 }}>
          <Title level={2}>Hardware Configuration</Title>
          <Text type="secondary">Manage scanners and hardware settings for visitor entry.</Text>
        </div>

        <Card 
          title={<Space><ScanOutlined style={{ color: '#1890ff' }} /> Fingerprint Scanner</Space>} 
          bordered={false} 
          // ✅ 2. Added marginBottom: 24 to create a gap between the two cards
          style={{ borderRadius: 8, maxWidth: 500, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Require Fingerprint on Entry</Text>
              <Switch 
                checked={isFingerprintRequired} 
                onChange={handleToggle} 
              />
            </div>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">Device Status</Text>
              <Tag color="processing">USB Connection</Tag>
            </div>
          </Space>
        </Card>

        <Card 
          title={<Space><IdcardOutlined style={{ color: '#fa8c16' }} /> RFID Card Scanner</Space>} 
          bordered={false} 
          style={{ borderRadius: 8, maxWidth: 500, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Enable RFID Card Input Form</Text>
              <Switch 
                checked={isRfidEnabled} 
                onChange={handleRfidToggle} 
              />
            </div>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">Integration Status</Text>
              <Tag color="success">Active</Tag>
            </div>
          </Space>
        </Card>

      </Content>
    </Layout>
  );
}