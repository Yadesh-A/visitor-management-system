import React, { useState, useEffect } from 'react';
import { Layout, Card, Row, Col, Statistic, Table, Tag, Typography, Spin, message } from 'antd';
import { UserOutlined, TeamOutlined, CarOutlined, ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import api from '../api';

const { Title, Text } = Typography;
const { Content } = Layout;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, month: 0, activeVehicles: 0 });
  const [recentLogs, setRecentLogs] = useState([]);

const fetchDashboardData = async () => {
    try {
      // ✅ Ippo manual-ah token eduthu Header-la podanumna thevai illai. 
      // Namma interceptor athai automatic-ah paathukkum.
      const response = await api.get('logs/dashboard-stats/'); 
      
      setStats({
        today: response.data.stats.today,
        month: response.data.stats.month,
        activeVehicles: response.data.stats.activeVehicles
      });
      
      setRecentLogs(response.data.recent_logs);
      setLoading(false);
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
      // Oru vela refresh token-um fail aanaal mattum thaan intha error varum
      message.error("Session expired or Server error.");
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (isMounted) {
      fetchDashboardData();
    }

    const socket = new WebSocket('ws://192.168.0.100:8000/ws/dashboard/');

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.message === 'update_required' && isMounted) {
        fetchDashboardData();
      }
    };

    return () => {
      isMounted = false;
      socket.close();
    };
  }, []);

  // Helper to format 24h string to 10:45 AM format
  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    // Logic to handle "HH:MM:SS" or ISO strings
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const columns = [
    {
      title: 'Visitor Name',
      dataIndex: ['visitor_details', 'name'],
      key: 'name',
      render: (text) => <Text strong>{text || 'Unknown'}</Text>,
    },
    {
      title: 'Action',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = status === 'IN' ? 'green' : (status === 'BLACKLISTED' ? 'darkred' : 'volcano');
        return (
          <Tag color={color} icon={status === 'IN' ? <ArrowRightOutlined /> : <ArrowLeftOutlined />}>
            {status}
          </Tag>
        );
      },
    },
    { 
      title: 'Time', 
      dataIndex: 'entry_time', 
      key: 'time',
      render: (time) => formatTime(time) // Formats to 10:45 AM
    },
    { 
      title: 'Purpose', 
      dataIndex: 'purpose', 
      key: 'purpose',
      render: (text) => <Text>{text || 'General'}</Text> // Plain text, no tag color
    },
    { 
      title: 'Host', 
      dataIndex: 'host', 
      key: 'host' 
    },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" tip="Loading Metrics..." /></div>;

  return (
    <Layout style={{ minHeight: '80vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px 48px' }}>
        
        {/* HEADING SECTION */}
        <div style={{ marginBottom: 20 }}>
          <Title level={2}>Overview <Tag color="blue">LIVE</Tag></Title>
          <Text type="secondary">Automatic real-time updates enabled via WebSockets.</Text>
        </div>

        {/* STATISTICS CARDS (Today, Total, Vehicles) */}
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card bordered={false}>
              <Statistic title="Visitors Today" value={stats.today} prefix={<UserOutlined />} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card bordered={false}>
              <Statistic title="Total History" value={stats.month} prefix={<TeamOutlined />} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card bordered={false}>
              <Statistic title="Active Vehicles" value={stats.activeVehicles} prefix={<CarOutlined />} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
        </Row>

        {/* RECENT ACTIVITY TABLE */}
        <Card title="Recent Live Activity" bordered={false}>
          <Table 
            columns={columns} 
            dataSource={recentLogs} 
            pagination={false} 
            rowKey="id" 
          />
        </Card>

      </Content>
    </Layout>
  );
}