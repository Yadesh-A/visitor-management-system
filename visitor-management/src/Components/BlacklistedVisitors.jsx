import React, { useState, useEffect } from 'react';
import { Table, Space, Button, Typography, Tag, Tooltip, Input, Modal, Form, message } from 'antd';
import { StopOutlined, PhoneOutlined, WarningOutlined, UnlockOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import api from '../api'; // Namma custom axios interceptor-ah use panrom
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

export default function BlacklistedVisitors() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [unblockForm] = Form.useForm();

  // 🚀 User Role-ah edukkurom
  const userRole = sessionStorage.getItem('vms_user_role') || 'SECURITY';

  const fetchBlacklisted = async () => {
    setLoading(true);
    try {
      // 🚀 Step 1: முதல் பேஜ் டேட்டாவை எடுக்குறோம் (முதல் 8 பேர்)
      const firstRes = await api.get('logs/'); 
      let allLogs = firstRes.data.results || firstRes.data;
      const totalAvailable = firstRes.data.count;

      // 🚀 Step 2: 8 பேருக்கு மேல இருந்தா, லூப் பண்ணி எல்லா டேட்டாவையும் எடுக்குறோம்
      if (totalAvailable > allLogs.length) {
        const totalPages = Math.ceil(totalAvailable / allLogs.length);
        const promises = [];
        for (let i = 2; i <= totalPages; i++) {
          promises.push(api.get(`logs/?page=${i}`));
        }
        const otherPages = await Promise.all(promises);
        otherPages.forEach(res => {
          allLogs = [...allLogs, ...(res.data.results || [])];
        });
      }

      // 🚀 Step 3: இப்போ மொத்த லிஸ்ட்டும் வந்துடுச்சு! இதுல BLACKLISTED மட்டும் ஃபில்டர் பண்றோம்
      const filtered = allLogs.filter(log => log.status === 'BLACKLISTED');
      
      setData(filtered);
    } catch (error) {
      console.error("Fetch Error:", error);
      message.error("Failed to fetch blacklisted visitors");
    } finally {
      setLoading(false);
    }
  };








  useEffect(() => {
    fetchBlacklisted();
  }, []);

  const showUnblockModal = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleUnblock = async (values) => {
    try {
      const res = await api.post('logs/unblacklist/', {
        visitId: selectedRecord.visit_id,
        password: values.password
      });

      message.success(res.data.message || "Visitor unblocked successfully!");
      setIsModalOpen(false);
      unblockForm.resetFields();
      fetchBlacklisted(); // Refresh
    } catch (error) {
      message.error(error.response?.data?.error || "Incorrect Password!");
    }
  };
  // 🚀 PUTHU CODE: Excel Download Function
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      message.warning("No data available to export!");
      return;
    }

    // Excel-kku thevaiyaana format-la data-va ready pandrom
    const excelData = filteredData.map(item => ({
      'Visit ID': item.visit_id,
      'Visitor Name': item.visitor_details?.name || 'N/A',
      'Phone Number': item.visitor?.phone || 'N/A',
      'Status': item.status,
      'Blacklist Reason': item.blacklist_reason || 'Security Violation'
    }));

    // Worksheet & Workbook uruvaakkuthal
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Blacklisted");

    // Download pandrathu
    XLSX.writeFile(workbook, "Blacklisted_Visitors.xlsx");
    message.success("Excel Downloaded Successfully!");
  };

  // Base Columns
  const baseColumns = [
    { title: 'Visit ID', dataIndex: 'visit_id', key: 'visit_id', render: (text) => <Text strong>{text}</Text> },
    {
      title: 'Visitor Name',
      key: 'name',
      render: (_, record) => (
        <Space>
          <StopOutlined style={{ color: '#cf1322' }} />
          <Text strong>{record.visitor_details?.name || 'N/A'}</Text>
        </Space>
      ),
    },
    {
      title: 'Phone Number',
      key: 'phone',
      render: (_, record) => <Space><PhoneOutlined /> {record.visitor_details?.phone || 'N/A'}</Space>,
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="error" icon={<WarningOutlined />}>BLACKLISTED</Tag>,
    },
    {
      title: 'Reason',
      key: 'reason',
      render: (_, record) => (
        <Tooltip title={record.blacklist_reason}>
          <Text type="danger" style={{ maxWidth: '250px' }} ellipsis>{record.blacklist_reason || "Security Violation"}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" icon={<UnlockOutlined />} style={{ backgroundColor: '#52c41a' }} onClick={() => showUnblockModal(record)}>
          Unblock
        </Button>
      )
    }
  ];

  // 🚀 LOGIC: Verum 'USER' kku mattum thaan Unblock action varum! 'ADMIN' kku Action column theriyathu.
  const columns = userRole === 'USER' ? baseColumns : baseColumns.filter(col => col.key !== 'action');

  const filteredData = data.filter(item => {
    const searchLower = searchText.toLowerCase();
    const name = item.visitor_details?.name || "";
    const phone = item.visitor_details?.phone || "";
    return name.toLowerCase().includes(searchLower) || phone.includes(searchLower);
  });



  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <Title level={3} style={{ margin: 0 }}><StopOutlined style={{ color: '#cf1322' }}/> Blacklisted Visitors</Title>
        
        {/* 🚀 Search matrum Export Button orey line-la */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Input 
            placeholder="Search Name or Phone..." 
            prefix={<SearchOutlined />} 
            style={{ width: 250 }} 
            onChange={e => setSearchText(e.target.value)} 
          />
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExportExcel}
            style={{ background: '#107c41', borderColor: '#107c41' }} // Excel Green Color
          >
            Export Excel
          </Button>
        </div>
      </div>
      <Table columns={columns} dataSource={filteredData} rowKey="visit_id" loading={loading} bordered />

      <Modal
        title={<Space><UnlockOutlined style={{ color: '#52c41a' }} /> <Text strong>Unblock Visitor</Text></Space>}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); unblockForm.resetFields(); }}
        onOk={() => unblockForm.submit()}
        okText="Verify & Unblock"
        okButtonProps={{ danger: true }}
      >
        <div style={{ padding: '10px 0', textAlign: 'center' }}>
          <Text>Please enter password to unblock <Text strong style={{ color: '#cf1322' }}>{selectedRecord?.visitor?.name}</Text>.</Text>
          <Form form={unblockForm} onFinish={handleUnblock} style={{ marginTop: 20 }}>
            <Form.Item name="password" rules={[{ required: true }]}><Input.Password placeholder="Password" /></Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
}