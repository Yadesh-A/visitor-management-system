import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Typography, Tag, Card, message, Input, Tooltip, Modal ,Form,Alert
} from 'antd';
import { 
  WarningOutlined, 
  StopOutlined, 
  ClockCircleOutlined, 
  SearchOutlined,
  AlertOutlined,
  LogoutOutlined,DownloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration'; // 🚀 Time difference calculate panna ithu thevai
import api from '../api';
import * as XLSX from 'xlsx';

// Extend dayjs to use duration
dayjs.extend(duration);

const { Title, Text } = Typography;

export default function ExpiredVisitors() {
  const [expiredLogs, setExpiredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  // Blacklist Modal-kku thevayaanavai
  const [form] = Form.useForm();
  const [isBlacklistModalVisible, setIsBlacklistModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [exporting, setExporting] = useState(false);
  // 🛠️ 1. Fetch & Filter Logic
  const fetchExpiredVisitors = async () => {
    setLoading(true);
    try {
      // Fetching all logs (Assuming backend doesn't have an 'expired' filter yet)
      const response = await api.get('logs/?page_size=100'); 
      const allLogs = response.data.results ? response.data.results : response.data;

      const now = dayjs();
      
      // Frontend Filtering Logic: Status 'IN' aagi, time mudinja aatkalai mattum filter pandrom
      const overstayedVisitors = allLogs.filter((log) => {
        if ((log.status !== 'IN' && log.status !== 'REGISTERED') || !log.expected_exit_date || !log.expected_exit_time) {
          return false; 
        }

        // Combine Date and Time from backend
        const exitDateTimeString = `${log.expected_exit_date}T${log.expected_exit_time}`;
        const exitDateTime = dayjs(exitDateTimeString, 'YYYY-MM-DD HH:mm:ss');

        // Check if the exit time is before the current time
        return exitDateTime.isBefore(now);
      });

      // Search text iruntha athayum filter pandrom
      const finalFiltered = searchText 
        ? overstayedVisitors.filter(log => 
            log.visitor_details?.name.toLowerCase().includes(searchText.toLowerCase()) ||
            log.visit_id.toLowerCase().includes(searchText.toLowerCase()) ||
            log.visitor_details?.phone.includes(searchText)
          )
        : overstayedVisitors;

      setExpiredLogs(finalFiltered);
    } catch (err) {
      message.error('Failed to load expired visitors.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiredVisitors();
    
    // Auto-refresh every 1 minute to check for newly expired passes
    const interval = setInterval(() => {
      fetchExpiredVisitors();
    }, 60000); 

    return () => clearInterval(interval);
  }, [searchText]);

  // 🛠️ 2. Force Checkout Logic
  // 🛠️ 2. Blacklist Logic
  const showBlacklistModal = (record) => {
    setSelectedRecord(record);
    setIsBlacklistModalVisible(true);
    
    // Default-aa reason box-la intha text-ah auto-fill pandrom
    form.setFieldsValue({
      reason: `Visitor overstayed their allotted time limit. Expected exit was at ${record.expected_exit_time}.`
    });
  };

  const handleBlacklist = async (values) => {
    try {
      await api.post('logs/blacklist/', {
        visitId: selectedRecord.visit_id,
        reason: values.reason
      });

      message.success(`${selectedRecord.visitor_details?.name} has been BLACKLISTED.`);
      setIsBlacklistModalVisible(false);
      form.resetFields();
      
      // Blacklist aana udane list-la irunthu thookidrom
      setExpiredLogs(prev => prev.filter(log => log.visit_id !== selectedRecord.visit_id));
    } catch (err) {
      message.error('Failed to blacklist visitor. Please try again.');
    }
  };

  // 🛠️ 3. Overdue Time Calculation Logic
  const calculateOverdueTime = (date, time) => {
    const exitDateTime = dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm:ss');
    const now = dayjs();
    const diffMs = now.diff(exitDateTime);
    const diffDuration = dayjs.duration(diffMs);

    const hours = Math.floor(diffDuration.asHours());
    const minutes = diffDuration.minutes();

    if (hours > 0) {
      return `${hours} hr ${minutes} min overdue`;
    }
    return `${minutes} min overdue`;
  };

  // 🚀 PUTHU CODE: Excel Download Function

  const handleExportExcel = () => {
    if (!expiredLogs || expiredLogs.length === 0) {
      message.warning("No data available to export!");
      return;
    }

    setExporting(true);
    try {
      // Excel-kku thevaiyaana format-la data-va map pandrom
      const excelData = expiredLogs.map(log => ({
        'Visit ID': log.visit_id,
        'Visitor Name': log.visitor_details?.name || 'N/A',
        'Phone Number': log.visitor_details?.phone || 'N/A',
        'Host to Notify': log.host,
        'Expired Date': log.expected_exit_date,
        'Expired Time': dayjs(`${log.expected_exit_date} ${log.expected_exit_time}`).format('hh:mm A'),
        'Overdue By': calculateOverdueTime(log.expected_exit_date, log.expected_exit_time)
      }));

      // Worksheet & Workbook uruvaakkuthal
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expired Visitors");

      // Download pandrathu (Inraiya date oda download aagum)
      const fileName = `Expired_Visitors_${dayjs().format('DD-MMM-YYYY')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      message.success("Excel Downloaded Successfully!");
    } catch (err) {
      console.error("Export Error:", err);
      message.error("Failed to export Excel.");
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: 'Visit ID',
      dataIndex: 'visit_id',
      key: 'visit_id',
      render: (text) => <Text strong style={{ color: '#cf1322' }}>{text}</Text>,
    },
    {
      title: 'Visitor Name & Phone',
      key: 'details',
      render: (_, record) => (
        <Space direction="vertical" size="zero">
          <Text strong>{record.visitor_details?.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.visitor_details?.phone}</Text>
        </Space>
      ),
    },
    {
      title: 'Host to Notify',
      dataIndex: 'host',
      key: 'host',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Expired At',
      key: 'expired_at',
      render: (_, record) => (
        <Space direction="vertical" size="zero">
          <Text>{record.expected_exit_date}</Text>
          <Text type="danger">{dayjs(`${record.expected_exit_date} ${record.expected_exit_time}`).format('hh:mm A')}</Text>
        </Space>
      ),
    },
    {
      title: 'Overdue Status',
      key: 'overdue',
      render: (_, record) => (
        <Tooltip title="Time passed since expiry limit">
          <Tag color="error" icon={<AlertOutlined />}>
            {calculateOverdueTime(record.expected_exit_date, record.expected_exit_time)}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="primary" 
          danger 
          icon={<StopOutlined />} 
          size="small" 
          onClick={() => showBlacklistModal(record)}
        >
          Blacklist
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#fff1f0', minHeight: '100%' }}>
      <Card 
        bordered={false} 
        style={{ borderRadius: 8, border: '1px solid #ffa39e', boxShadow: '0 4px 12px rgba(255, 0, 0, 0.05)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#cf1322' }}>
              <WarningOutlined style={{ marginRight: 10 }} />
              Expired Visitor Passes
            </Title>
            <Text type="secondary">Security Alert: Visitors who have exceeded their allotted time limit.</Text>
          </div>
          
          <Space style={{ flexWrap: 'wrap' }}>
            <Input 
              placeholder="Search Expired Visitors..." 
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)} 
              style={{ width: 220 }}
            />
            <Button icon={<ClockCircleOutlined />} onClick={fetchExpiredVisitors} loading={loading}>
              Refresh
            </Button>
            
            {/* 🚀 PUTHU CODE: Export Excel Button */}
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleExportExcel}
              loading={exporting}
              style={{ background: '#107c41', borderColor: '#107c41' }} // Excel Green Color
            >
              Export
            </Button>
          </Space>
        </div>

        <Table 
          columns={columns} 
          dataSource={expiredLogs} 
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No expired visitors currently inside the premises. Good job!' }}
        />
      </Card>
      {/* Blacklist Modal Popup */}
      <Modal
        title={<Space><WarningOutlined style={{ color: '#ff4d4f' }} /><span style={{ color: '#ff4d4f' }}>Blacklist Expired Visitor</span></Space>}
        open={isBlacklistModalVisible}
        onCancel={() => { setIsBlacklistModalVisible(false); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        {selectedRecord && (
          <>
            <Alert 
              message={`You are placing ${selectedRecord.visitor_details?.name} on the security blacklist for overstaying.`} 
              description={`Visit ID: ${selectedRecord.visit_id}`} 
              type="error" 
              showIcon 
              style={{ marginBottom: 24 }} 
            />
            <Form form={form} layout="vertical" onFinish={handleBlacklist}>
              <Form.Item 
                name="reason" 
                label="Detailed Reason for Blacklisting" 
                rules={[{ required: true, message: 'A reason is strictly required.' }, { min: 10, message: 'Min 10 characters.' }]}
              >
                <Input.TextArea rows={4} placeholder="E.g., Visitor failed to checkout on time and was found loitering..." />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setIsBlacklistModalVisible(false)}>Cancel</Button>
                  <Button type="primary" danger htmlType="submit" icon={<StopOutlined />}>Enforce Blacklist</Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}