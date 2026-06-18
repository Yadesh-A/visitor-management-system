import React, { useState, useEffect, use } from 'react';
import { Table, Input, Typography, Space, message, Card, Avatar, Tag, Button,Modal } from 'antd';
import { SearchOutlined, UserOutlined, IdcardOutlined, PhoneOutlined,DownloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

export default function PersonalDetails() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [exporting, setExporting] = useState(false);
  
  // Pagination State
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  // 🚀 ID Proof Modal States
  const [isIdModalVisible, setIsIdModalVisible] = useState(false);
  const [currentIdUrl, setCurrentIdUrl] = useState('');

  const showIdModal = (record) => {
    const API_BASE_URL = 'http://192.168.0.100:8000';
    // record-la id_proof_document field irukkara maari assume panrom
    let docUrl = record.id_proof_document;

    if (docUrl) {
      if (!docUrl.startsWith('http')) {
        docUrl = `${API_BASE_URL}${docUrl}`;
      }
      setCurrentIdUrl(docUrl);
      setIsIdModalVisible(true);
    } else {
      message.warning('No ID document uploaded for this visitor.');
    }
  };

  // 🛡️ API Call: Fetch Visitors with Pagination & Search
  const fetchVisitors = async (page = 1, search = '') => {
    setLoading(true);
    try {
      // 1. Token Security Check
      const token = sessionStorage.getItem('vms_access_token');
      if (!token) {
        window.dispatchEvent(new Event('vms_auth_failed')); // Automatic logout trigger
        return;
      }

      // 2. API Request
      const response = await axios.get('http://192.168.0.100:8000/api/visitors/', {
        params: {
          page: page,
          search: search,
          t:new Date().getTime() // Backend search_fields-la poi thedum
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Django Pagination Support (results, count)
      const results = response.data.results || response.data;
      const totalCount = response.data.count || results.length;
      console.log("Filtered Data:", results);

      setData(results);
      setPagination({
        ...pagination,
        current: page,
        total: totalCount
      });

    } catch (error) {
      if (error.response && error.response.status === 401) {
        window.dispatchEvent(new Event('vms_auth_failed'));
      } else {
        message.error('Failed to load visitor details.');
        const exactError =error.response?.data?.detail || error.response?.data?.error || error.message;
        message.error('Error: ${exactError}', 5);
        console.error("Backend Error Details:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // 🚀 LIVE SEARCH (Debounce Logic)
  // Oru oru letter type pannum pothum work aagum, aana 500ms pause vachu call aagum
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVisitors(1, searchText); // Search maarum pothu page 1 kku poidanum
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  // Handle Page Change (2, 3, 4...)
  const handleTableChange = (newPagination) => {
    fetchVisitors(newPagination.current, searchText);
  };

  // 🚀 FIX 2: WebSocket Auto-Refresh for Personal Details
  useEffect(() => {
    const ws = new WebSocket('ws://192.168.0.100:8000/ws/dashboard/');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.message === 'update_required') {
        console.log("🔄 Background update detected! Refreshing Personal Details...");
        fetchVisitors(pagination.current, searchText); 
      }
    };

    return () => ws.close();
  }, [pagination.current, searchText]);


  // 🚀 PUTHU CODE: Excel Download Function
  

  const handleExportExcel = async () => {
    setExporting(true);
    message.loading({ content: 'Preparing Excel Data...', key: 'export' });
    try {
      const token = sessionStorage.getItem('vms_access_token');
      
      // Export pandrappa motha data-vum venum, so page_size=10000 nu anuppurom
      const response = await axios.get('http://192.168.0.100:8000/api/visitors/', {
        params: {
          search: searchText,
          page_size: 10000 
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      const rawData = response.data.results || response.data;

      if (!rawData || rawData.length === 0) {
        message.warning({ content: 'No data available to export.', key: 'export' });
        return;
      }

      // Excel-kku thevaiyaana format-la data-va ready pandrom
      const excelData = rawData.map((item) => ({
        'Visitor Name': item.name,
        'Phone Number': item.phone,
        'ID Type': item.id_type,
        'ID Number': item.id_number,
        'Registered On': new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      }));

      // Worksheet & Workbook uruvaakkuthal
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Personal Details");

      // Download pandrathu
      XLSX.writeFile(workbook, "Visitor_Personal_Details.xlsx");
      message.success({ content: 'Excel Downloaded Successfully!', key: 'export' });

    } catch (error) {
      console.error("Export Error:", error);
      message.error({ content: 'Failed to export data.', key: 'export' });
    } finally {
      setExporting(false);
    }
  };

  // Table Columns Setup
  const columns = [
    {
      title: 'Visitor Name',
      dataIndex: 'name',
      key: 'name',
      // ... existing code
// Render function inside columns
render: (text, record) => {
  const API_BASE_URL = 'http://192.168.0.100:8000';
  
  // Django sila neram full path kudukum, sila neram path mattum kudukum.
  // Athanaala intha logic safest:
  let photoUrl = record.photo;
  
  if (photoUrl && !photoUrl.startsWith('http')) {
    photoUrl = `${API_BASE_URL}${photoUrl}`;
  }

  return (
    <Space>
      <Avatar 
        src={photoUrl} 
        icon={!photoUrl && <UserOutlined />} 
        style={{ backgroundColor: photoUrl ? 'transparent' : '#87d068' }}
      />
      <Text strong>{text}</Text>
    </Space>
  );
}
    },
    {
      title: 'Phone Number',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => <Space><PhoneOutlined /> {text}</Space>,
    },
    {
      title: 'ID Proof Details',
      key: 'id_details',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {/* Clickable Tag with Link style */}
          <Tag 
            color="blue" 
            onClick={() => showIdModal(record)} 
            style={{ cursor: 'pointer', fontWeight: 'bold' }}
          >
            {record.id_type}
          </Tag>
          <Text type="secondary"><IdcardOutlined /> {record.id_number}</Text>
        </Space>
      ),
    },
    {
      title: 'Registered On',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      }),
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title={<Title level={3} style={{ margin: 0 }}>Personal Details (Database)</Title>} 
        bordered={false} 
        style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <Text type="secondary">View and search through the central visitor database.</Text>
          
          {/* 🔍 LIVE SEARCH BOX & EXPORT BUTTON */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Input.Search
              placeholder="Search by Name, Phone, or ID Number..."
              allowClear
              size="large"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '350px' }}
              prefix={<SearchOutlined style={{ color: '#1890ff' }}/>}
            />
            
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              size="large"
              onClick={handleExportExcel}
              loading={exporting}
              style={{ background: '#107c41', borderColor: '#107c41' }} // Excel Green Color
            >
              Export Excel
            </Button>
          </div>
        </div>

        {/* 📋 PAGINATED TABLE */}
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: false, // Turn off size changer if not needed
            showTotal: (total) => `Total ${total} Visitors`
          }}
          onChange={handleTableChange}
          bordered
        />
      </Card>
      {/* 🆕 ID PROOF MODAL VIEWER */}
        <Modal
          title={`ID Proof Document - ${currentIdUrl.split('/').pop()}`}
          open={isIdModalVisible}
          onCancel={() => setIsIdModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsIdModalVisible(false)}>Close</Button>,
            <Button key="download" type="primary" href={currentIdUrl} target="_blank">Download</Button>
          ]}
          width={800}
          style={{ top: 20 }}
          destroyOnClose
        >
          <div style={{ 
            height: '70vh', 
            width: '100%', 
            overflow: 'auto', 
            display: 'flex', 
            justifyContent: 'center', 
            background: '#f0f2f5',
            borderRadius: '8px',
            padding: '10px'
          }}>
            <img
              src={currentIdUrl} 
              alt="ID Proof"
              style={{ 
                maxHeight: '100%', 
                maxWidth: '100%', 
                objectFit: 'contain',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: '4px'
              }} 
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/400x500?text=Image+Load+Error";
                message.error("Failed to load ID document.");
              }}
            />
          </div>
        </Modal>
    </div>
  );
}