import React, { useState, useEffect } from 'react';
import { 
  Table, Input, Button, Tag, Space, Typography, Card, DatePicker, message, 
  Row, Col, Statistic 
} from 'antd';
import { 
  SearchOutlined, DownloadOutlined, ClockCircleOutlined, LogoutOutlined,
  TeamOutlined, LoginOutlined 
} from '@ant-design/icons';
import api from '../api'; // உங்க API Path சரியா இருக்கானு பாத்துக்கோங்க
import * as XLSX from 'xlsx-js-style';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function VisitorInOutReport() {
  const [searchText, setSearchText] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [exporting, setExporting] = useState(false);
  
  // 🚀 Stats State
  const [stats, setStats] = useState({ total: 0, inCount: 0, outCount: 0 });

  // 🚀 Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0); 

 // 🚀 Fetch Data & Calculate Stats (Backend-ஐ மாத்தாம React-லயே Loop பண்றோம்)
  const fetchLogs = async (search = '', page = 1, dates = dateRange) => {
    setLoading(true);
    try {
      const todayStr = dayjs().format('YYYY-MM-DD');
      
      // --- 1. Table-க்கான URL (முதல் 8 டேட்டா மட்டும் காட்டும்) ---
      let url = `logs/?search=${search}&page=${page}`;
      if (dates && dates[0] && dates[1]) {
        url += `&start_date=${dates[0].format('YYYY-MM-DD')}&end_date=${dates[1].format('YYYY-MM-DD')}`;
      } else {
        url += `&start_date=${todayStr}&end_date=${todayStr}`;
      }
      
      const response = await api.get(url);
      
      if (response.data && response.data.results) {
        setLogs(response.data.results); 
        setTotalRecords(response.data.count);
      } else {
        setLogs(response.data); 
        setTotalRecords(response.data.length);
      }

      // --- 2. Stats Card-க்கான Loop Logic (எல்லா டேட்டாவையும் எடுக்க) ---
      const buildUrl = (pageNum) => {
        let u = `logs/?search=${search}&page=${pageNum}`;
        if (dates && dates[0] && dates[1]) {
          u += `&start_date=${dates[0].format('YYYY-MM-DD')}&end_date=${dates[1].format('YYYY-MM-DD')}`;
        } else {
          u += `&start_date=${todayStr}&end_date=${todayStr}`;
        }
        return u;
      };

      const firstRes = await api.get(buildUrl(1));
      let allData = firstRes.data.results || firstRes.data;
      const totalAvailable = firstRes.data.count;

      // ஒருவேளை 8-க்கு மேல டேட்டா இருந்தா, மீதி பேஜையும் லூப் பண்ணி எடுக்குறோம்
      if (totalAvailable > allData.length) {
        const totalPages = Math.ceil(totalAvailable / allData.length);
        const promises = [];
        for (let i = 2; i <= totalPages; i++) {
          promises.push(api.get(buildUrl(i)));
        }
        const otherPages = await Promise.all(promises);
        otherPages.forEach(res => {
          allData = [...allData, ...(res.data.results || [])];
        });
      }

      // இப்போ allData-க்குள்ள 16 பேரோட லிஸ்ட்டும் இருக்கும். அதை வெச்சு கவுண்ட் பண்றோம்!
      if (allData) {
        const inC = allData.filter(log => log.status === 'IN').length;
        const outC = allData.filter(log => log.status === 'OUT').length;
        setStats({ total: totalAvailable || allData.length, inCount: inC, outCount: outC });
      }

    } catch (err) {
      message.error('Failed to load logs from server.');
      console.error(err); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(searchText, currentPage, dateRange);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText, currentPage, dateRange]);

  // 🚀 EXCEL டவுன்லோடு லாஜிக் (With Center Alignment)
  


// 🚀 EXCEL டவுன்லோடு லாஜிக் (Loop பண்ணி ஃபுல் டேட்டாவும் எடுக்குறோம்)
  const handleExportExcel = async () => {
    setExporting(true);
    message.loading({ content: 'Preparing Full Excel Data...', key: 'export' });
    try {
      const todayStr = dayjs().format('YYYY-MM-DD');
      
      const buildUrl = (pageNum) => {
        let u = `logs/?search=${searchText}&page=${pageNum}`;
        if (dateRange && dateRange[0] && dateRange[1]) {
          u += `&start_date=${dateRange[0].format('YYYY-MM-DD')}&end_date=${dateRange[1].format('YYYY-MM-DD')}`;
        } else {
          u += `&start_date=${todayStr}&end_date=${todayStr}`;
        }
        return u;
      };

      // முதல் பேஜ் டேட்டாவை எடுக்குறோம்
      const firstRes = await api.get(buildUrl(1));
      let rawData = firstRes.data.results || firstRes.data;
      const totalAvailable = firstRes.data.count;

      if (!rawData || rawData.length === 0) {
        message.warning({ content: 'No data available to export.', key: 'export' });
        return;
      }

      // 8-க்கு மேல டேட்டா இருந்தா எல்லாத்தையும் லூப் பண்ணி ஒண்ணா சேர்க்கிறோம்
      if (totalAvailable > rawData.length) {
        const totalPages = Math.ceil(totalAvailable / rawData.length);
        const promises = [];
        for (let i = 2; i <= totalPages; i++) {
          promises.push(api.get(buildUrl(i)));
        }
        const otherPages = await Promise.all(promises);
        otherPages.forEach(res => {
          rawData = [...rawData, ...(res.data.results || [])];
        });
      }

      const excelData = rawData.map((log, index) => ({
        'S.No': index + 1, // 👈 எக்ஸெல்-லயும் 1,2,3 னு பெர்ஃபெக்ட்டா வரும்
        'Visit ID': log.visit_id,
        'Visitor Name': log.visitor_details?.name,
        'Mobile No': log.visitor_details?.phone,
        'Host': log.host,
        'Purpose': log.purpose,
        'Status': log.status,
        'In Time': log.entry_time_display ? `${log.visit_date} ${log.entry_time_display}` : `${log.visit_date} ${log.entry_time}`,
        'Out Time': log.exit_time_display ? `${log.visit_date} ${log.exit_time_display}` : 'Not Checked Out'
      }));

      const worksheet = XLSX.utils.json_to_sheet([]);

      const reportDate = new Date().toLocaleDateString('en-GB'); 
      const titleRow = [
        ["VEERAL ENTERPRISES - VISITOR IN/OUT REPORT"], 
        [`Report Generated On: ${reportDate}`],         
        []                                              
      ];
      XLSX.utils.sheet_add_aoa(worksheet, titleRow, { origin: "A1" });
      XLSX.utils.sheet_add_json(worksheet, excelData, { origin: "A4", skipHeader: false });

      for (let cell in worksheet) {
        if (cell[0] === '!') continue; 
        worksheet[cell].s = {
          alignment: { horizontal: "center", vertical: "center" },
          font: { name: "Calibri", sz: 11 }
        };
      }

      if (worksheet['A1']) worksheet['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "0A1930" } }, alignment: { horizontal: "center" } };
      if (worksheet['A2']) worksheet['A2'].s = { font: { italic: true, sz: 10 }, alignment: { horizontal: "center" } };

      const wscols = [
        { wch: 8 },  { wch: 15 }, { wch: 25 }, { wch: 15 }, 
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 22 }, { wch: 22 } 
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "In_Out_Report");

      const fileName = dateRange 
        ? `Visitor_Report_${dateRange[0].format('DD-MMM-YYYY')}_to_${dateRange[1].format('DD-MMM-YYYY')}.xlsx`
        : `Visitor_Report_${todayStr}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      message.success({ content: 'Full Excel Downloaded Successfully!', key: 'export' });

    } catch (err) {
      console.error(err);
      message.error({ content: 'Failed to export data.', key: 'export' });
    } finally {
      setExporting(false);
    }
  };


  const columns = [
    {
      title: 'S.No',
      key: 'sno',
      width: 70,
    
      render: (text, record, index) => (
        <Text strong>{totalRecords-((currentPage - 1) * 10 + index )}</Text>
      ),
    },
    {
      title: 'Visitor ID',
      dataIndex: 'visit_id', 
      key: 'visit_id',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Visitor Name & Mobile',
      key: 'visitor',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size="zero">
          <Text strong>{record.visitor_details?.name}</Text>
          <Text type="secondary">{record.visitor_details?.phone}</Text>
        </Space>
      ),
    },
    {
      title: 'Host / Purpose',
      key: 'host',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size="zero">
          <Text strong>{record.host}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.purpose}</Text>
        </Space>
      ),
    },
    {
      title: 'In / Out Time',
      key: 'timing',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size="small" style={{ background: '#fafafa', padding: '8px', borderRadius: '6px', width: '100%' }}>
          <div>
            <ClockCircleOutlined style={{ color: '#52c41a', marginRight: '6px' }} />
            <Text type="secondary">IN: </Text> 
            <Text strong>{record.visit_date} {record.entry_time_display}</Text>
          </div>
          {record.exit_time_display && (
            <div>
              <LogoutOutlined style={{ color: '#ff4d4f', marginRight: '6px' }} />
              <Text type="secondary">OUT: </Text> 
              <Text strong>{record.visit_date} {record.exit_time_display}</Text>
            </div>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        if (record.status === 'IN') return <Tag color="success">INSIDE</Tag>;
        if (record.status === 'OUT') return <Tag color="default">CHECKED OUT</Tag>;
        if (record.status === 'BLACKLISTED') return <Tag color="error">BLACKLISTED</Tag>;
        return <Tag color="processing">{record.status}</Tag>;
      },
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      
      {/* 🚀 Stats Cards Section */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic 
              title={<Text strong type="secondary">{dateRange ? "Selected Total" : "Today's Total Visitors"}</Text>} 
              value={stats.total} 
              prefix={<TeamOutlined style={{ color: '#1890ff', marginRight: '8px' }} />} 
              valueStyle={{ color: '#0a1930', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic 
              title={<Text strong type="secondary">{dateRange ? "Selected Currently IN" : "Today Currently IN"}</Text>} 
              value={stats.inCount} 
              prefix={<LoginOutlined style={{ color: '#52c41a', marginRight: '8px' }} />} 
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic 
              title={<Text strong type="secondary">{dateRange ? "Selected Checked OUT" : "Today Checked OUT"}</Text>} 
              value={stats.outCount} 
              prefix={<LogoutOutlined style={{ color: '#faad14', marginRight: '8px' }} />} 
              valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Visitor In/Out Report</Title>
            <Text type="secondary">Track real-time entry and exit timings.</Text>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Input 
              placeholder="Search Name, Phone, ID..." 
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1); 
              }} 
              style={{ width: 250 }}
              size="large"
              allowClear
            />
            <RangePicker 
              size="large"
              onChange={(dates) => {
                setDateRange(dates);
                setCurrentPage(1);
              }}
              style={{ width: 280 }}
            />
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              size="large"
              onClick={handleExportExcel}
              loading={exporting}
              style={{ background: '#107c41', borderColor: '#107c41' }} 
            >
              Export Excel
            </Button>
          </div>
        </div>

        {/* DATA TABLE */}
       <Table 
            columns={columns} 
            dataSource={logs} 
            loading={loading}
            rowKey="id"
            // 👇 🚀 PUTHU FIX: 10 Data & Unlimited Pages Logic 👇
            pagination={{ 
              current: currentPage,
              pageSize: 10, // 👈 ஒரு பேஜுக்கு 10 பேர் மட்டுமே
              total: totalRecords, // 👈 பேக்கெண்டில் உள்ள மொத்த ஆட்களை வைத்து பேஜ் நம்பர் தானாக உருவாகும்
              showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} visitors`,
              onChange: (page) => {
                setCurrentPage(page);
                fetchLogs(searchText, page, dateRange); // 👈 2, 3 என பேஜ் மாறும்போது, அந்த குறிப்பிட்ட பேஜ்ஜின் டேட்டா வரும்
              } 
            }}
            scroll={{ x: 800 }} 
          />
      </Card>
    </div>
  );
}