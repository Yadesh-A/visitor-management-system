import React, { useState, useEffect } from 'react';
import { 
  Table, Input, Button, Tag, Space, Typography, 
  Modal, Form, message, Alert, Card, Tooltip, Descriptions, Avatar, Divider,DatePicker, List
} from 'antd';

import { StarOutlined } from '@ant-design/icons';
import { LockOutlined} from '@ant-design/icons';
import { 
  SearchOutlined, 
  StopOutlined, 
  WarningOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  ClockCircleOutlined,
  UserOutlined,
  IdcardOutlined,
  LogoutOutlined,
  PhoneOutlined,
  ProfileOutlined,
  TeamOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  DownloadOutlined ,
  UserAddOutlined,
  CarOutlined,
  SyncOutlined// 🆕 PUTHU CODE: Icon for Checkout button
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';
import passLogo from '../assets/passlogo.jpg';
import navyLogo from '../assets/navylogo.jpg';
import stampLogo from '../assets/stamp.jpg';
import dayjs from 'dayjs'; // 🚀 PUTHU CODE: Date format panna thevai
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function VisitorLog() {
  const [searchText, setSearchText] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination Tracking
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0); 

  // 🚀 PUTHU CODE: Date Range State
  const { RangePicker } = DatePicker;
  const [dateRange, setDateRange] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [form] = Form.useForm();
  const [isBlacklistModalVisible, setIsBlacklistModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isPassModalVisible, setIsPassModalVisible] = useState(false);
  const [passRecord, setPassRecord] = useState(null);


  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  const [isCertModalVisible, setIsCertModalVisible] = useState(false);
  const [certUrl, setCertUrl] = useState('');

  // 🚀 PUDHU LOGIC: View Group Modal States
  const [isViewGroupModalVisible, setIsViewGroupModalVisible] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [selectedMainVisitor, setSelectedMainVisitor] = useState('');

  // Button click pannum pothu modal-ah open panna
  const showGroupMembers = (record) => {
    setSelectedGroupMembers(record.group_members || []);
    // Visitor name edukkurom (record.visitor__name nu unga JSON eppadi varudho appadi pottukonga)
    setSelectedMainVisitor(record.visitor_name || record.name || 'Main Visitor'); 
    setIsViewGroupModalVisible(true);
  };

  const showCertModal = (record) => {
    let path = record.police_verification_document;

    // Database-la field empty-ah irundha function-ah niruthidrom (Safety check)
    if (!path) {
        return; 
    }

    // Path 'http' nu start aagalana, namma backend IP-ah munnadi add pandrom
    const fileUrl = path.startsWith('http') 
      ? path 
      : `http://192.168.0.100:8000${path.startsWith('/') ? '' : '/'}${path}`;
    
    setCertUrl(fileUrl);
    setIsCertModalVisible(true);
  };

  const showPdfModal = (record) => {
    console.log(record);
    let path = record.visitor_details?.id_proof_document;

    if (!path) {
        return; 
    }

    const fileUrl = path?.startsWith('http') 
      ? path 
      : `http://192.168.0.100:8000${path.startsWith('/') ? '' : '/'}${path}`;
    
    setPdfUrl(fileUrl);
    setIsPdfModalVisible(true);
  };

// 🚀 PUTHU CODE: தேதி செலக்ட் பண்ணலனா All Time டேட்டாவை இழுத்துட்டு வரும்
  const fetchLogs = async (search = '', page = 1, dates = dateRange) => {
    setLoading(true);
    try {
      let url = `logs/?search=${search}&page=${page}`;
      
      // Date filter select ஆகி இருந்தா அந்த தேதிக்கு ஃபில்டர் ஆகும்
      if (dates && dates[0] && dates[1]) {
        url += `&start_date=${dates[0].format('YYYY-MM-DD')}&end_date=${dates[1].format('YYYY-MM-DD')}`;
      } else {
        // 🚀 PUTHU LOGIC: தேதி எதுவும் செலக்ட் பண்ணலனா, All Time டேட்டாவும் வர்றதுக்காக
        // நாமளே ஒரு பழைய தேதியையும் இன்னைக்கு தேதியையும் Default-ஆ பேக்கெண்டுக்கு அனுப்புறோம்.
        const pastDate = '2000-01-01'; 
        const todayStr = dayjs().format('YYYY-MM-DD');
        url += `&start_date=${pastDate}&end_date=${todayStr}`;
      }

      const response = await api.get(url);
      
      if (response.data && response.data.results) {
        setLogs(response.data.results); 
        setTotalRecords(response.data.count);
      } else {
        setLogs(response.data); 
        setTotalRecords(response.data.length);
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
  }, [searchText, currentPage, dateRange]); // dateRange maaarunthalum trigger aagum
  const showBlacklistModal = (record) => {
    setSelectedRecord(record);
    setIsBlacklistModalVisible(true);
  };

  const showPassModal = (record) => {
    setPassRecord(record);
    setIsPassModalVisible(true);
  };

  const handleBlacklist = async (values) => {
    try {
      await api.post('logs/blacklist/', {
        visitId: selectedRecord.visit_id,
        reason: values.reason
      });

      message.error(`${selectedRecord.visitor_details.name} has been BLACKLISTED.`);
      setIsBlacklistModalVisible(false);
      form.resetFields();
      fetchLogs(searchText, currentPage); 
    } catch (err) {
      message.error('Blacklist update failed.');
    }
  };

  // 🆕 PUTHU CODE: Local State Checkout Logic (No Refresh needed)
  const handleCheckout = async (record) => {
    try {
      // 1. Backend-kku update anuppurom
      await api.post('logs/checkout/', {
        visitId: record.visit_id 
      });

      message.success(`${record.visitor_details.name} checked out successfully.`);

      // 2. Magic step: Page-ah refresh pannama, frontend state-ah mattum instant aaga update panrom!
      setLogs((prevLogs) => 
        prevLogs.map((log) => 
          log.visit_id === record.visit_id 
            ? { ...log, status: 'OUT' } // Intha specific aalai mattum 'OUT' nu maathidrom
            : log
        )
      );

    } catch (err) {
      message.error('Checkout failed. Please try again.');
    }
  };

  // 🚀 PUTHU CODE: Excel Export Function
  



// 🚀 PUTHU CODE: Excel Export-க்கும் All Time லாஜிக் செட் பண்ணியாச்சு
  // 🚀 PUTHU CODE: எல்லா பேஜ்ஜையும் Loop பண்ணி Excel-ல டவுன்லோட் பண்ண போறோம்!
  const handleExportExcel = async () => {
    setExporting(true);
    message.loading({ content: 'Preparing Full Excel Data...', key: 'export' });
    try {
      // URL-ஐ உருவாக்குறதுக்கான குட்டி ஃபங்ஷன்
      const buildUrl = (pageNum) => {
        let u = `logs/?search=${searchText}&page=${pageNum}`;
        if (dateRange && dateRange[0] && dateRange[1]) {
          u += `&start_date=${dateRange[0].format('YYYY-MM-DD')}&end_date=${dateRange[1].format('YYYY-MM-DD')}`;
        }
        return u;
      };

      // 1. முதல் பேஜ் டேட்டாவை எடுக்குறோம்
      const firstRes = await api.get(buildUrl(1));
      let rawData = firstRes.data.results || firstRes.data;
      const totalAvailable = firstRes.data.count; // மொத்த டேட்டா கவுண்ட்

      if (!rawData || rawData.length === 0) {
        message.warning({ content: 'No data available to export for this date range.', key: 'export' });
        return;
      }

      // 2. 🚀 MAGIC: முதல் பேஜுக்கு மேல டேட்டா இருந்தா, எல்லாத்தையும் லூப் பண்ணி எடுக்குறோம்!
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

      // 3. இப்போ rawData-ல எல்லா பேஜ் டேட்டாவும் இருக்கும். அதை Excel-க்கு மாத்துறோம்!
      const excelData = rawData.map((log, index) => ({
        'S.No': index + 1, // 👈 S.No 1-ல இருந்து வரிசையா வரும்
        'Date': log.visit_date,
        'Visitor Name': log.visitor_details?.name,
        'Visit ID': log.visit_id,
        'Phone Number': log.visitor_details?.phone,
        'ID Type': log.visitor_details?.id_type,
        'ID Number': log.visitor_details?.id_number,
        'Person to Meet': log.host,
        'Purpose': log.purpose,
        'Current Status': log.status,
        'IN Time': log.entry_time_display || log.entry_time,
        'OUT Time': log.exit_time_display || log.exit_time || 'Not Checked Out',
      }));

      const worksheet = XLSX.utils.json_to_sheet([]);

      const reportDate = new Date().toLocaleDateString('en-GB'); 
      const titleRow = [
        ["MATERIAL ORGANISATION (SECURITY OFFICE) - VISITOR LOG REPORT"], 
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

      if (worksheet['A1']) {
        worksheet['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "0A1930" } }, alignment: { horizontal: "center" } };
      }
      if (worksheet['A2']) {
        worksheet['A2'].s = { font: { italic: true, sz: 10 }, alignment: { horizontal: "center" } };
      }

      const wscols = [
        { wch: 8 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Visitor Logs");

      const fileName = dateRange 
        ? `Visitor_Logs_${dateRange[0].format('DD-MMM-YYYY')}_to_${dateRange[1].format('DD-MMM-YYYY')}.xlsx`
        : `Visitor_Logs_All.xlsx`;

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
    title: 'Visit Timeline',
    key: 'timing',
    width: 220,
    render: (_, record) => {

      return (
      <Card 
        size="small" 
        variant="borderless" 
        style={{ background: '#f9f9f9', borderRadius: '4px', padding: '4px' }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          
          {/* 👇 🚀 PUTHU CODE: S.No Badge */}
          <div style={{ display: 'inline-block', background: '#e6f7ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #91d5ff', marginBottom: '2px' }}>
            <Text strong style={{ fontSize: '11px', color: '#0050b3' }}>
              S.No: {record.id}
            </Text>
          </div>

          {/* 📅 Date Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarOutlined style={{ color: '#1890ff' }} />
            <Text strong style={{ fontSize: '13px' }}>
              {record.visit_date}
            </Text>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {/* 🕒 Time Section */}
          <div style={{ paddingLeft: '4px' }}>
            {/* 🟢 Entry Time */}
            <div>
              <Text style={{ fontSize: '12px' }}>
                <ClockCircleOutlined style={{ color: '#52c41a', marginRight: '6px' }} />
                <Text type="secondary">IN:</Text> <b>{record.entry_time_display}</b>
              </Text>
            </div>

            {/* 🔴 Exit Time Condition */}
            {record.status === 'OUT' && record.exit_time_display ? (
              <div style={{ marginTop: '4px' }}>
                <Text style={{ fontSize: '12px' }}>
                  <LogoutOutlined style={{ color: '#ff4d4f', marginRight: '6px' }} />
                  <Text type="secondary">OUT:</Text> <b>{record.exit_time_display}</b>
                </Text>
              </div>
            ) : record.status === 'IN' ? (
              <Tag color="processing" icon={<SyncOutlined spin />} style={{ marginTop: '6px', fontSize: '10px' }}>
                STILL INSIDE
              </Tag>
            ) : null}
          </div>

        </Space>
      </Card>
    )},
  },
    {
      title: 'Visit ID',
      dataIndex: 'visit_id', 
      key: 'visit_id',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Visitor Details',
      key: 'details',
      render: (_, record) => (
        <Space direction="vertical" size="zero">
          <Text strong>{record.visitor_details?.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.visitor_details?.phone}</Text>
        </Space>
      ),
    },
    {
      title: 'Host & Purpose',
      key: 'hostInfo',
      render: (_, record) => (
        <Space direction="vertical" size="zero">
          <Text>{record.host}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.purpose}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.status === 'BLACKLISTED') {
          return (
            <Tooltip title={record.blacklist_reason}>
              <Tag color="error" icon={<WarningOutlined />}>BLACKLISTED</Tag>
            </Tooltip>
          );
        }
        if (record.status === 'IN') {
          return <Tag color="success" icon={<ClockCircleOutlined />}>INSIDE</Tag>;
        }
        // 🛡️ PUTHU CODE: 'REGISTERED' status-ah handle panrom
        if (record.status === 'REGISTERED') {
          return <Tag color="processing" icon={<UserOutlined />}>REGISTERED</Tag>;
        }
        // Ippo 'OUT' ku mattum thaan CHECKED OUT kaattum
        return <Tag color="default" icon={<CheckCircleOutlined />}>CHECKED OUT</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<FilePdfOutlined />} size="small" onClick={() => showPassModal(record)}>
            View Pass
          </Button>

          {record.visitor_details?.id_proof_document && (
            <Button 
          type="link" 
          icon={<IdcardOutlined />} 
          size="small" 
          onClick={() => showPdfModal(record)} // ✅ New Tab-kku badhila Modal function
        >
          View ID
        </Button>
          )}

          {/* 👇 PUTHU CODE: Police Cert Button ADD PANNUNGA 👇 */}
          {record.police_verification_document && (
            <Button 
              type="link" 
              icon={<SafetyCertificateOutlined />} 
              size="small" 
              onClick={() => showCertModal(record)} 
            >
              View Cert
            </Button>
          )}

          {/* 🆕 PUTHU CODE: Confirm Exit Button */}
          <Button 
            type="primary" 
            icon={<LogoutOutlined />} 
            size="small" 
            onClick={() => handleCheckout(record)} 
            disabled={record.status !== 'IN'}
            style={{ 
              background: record.status !== 'IN' ? '#f5f5f5' : '#52c41a', 
              borderColor: record.status !== 'IN' ? '#d9d9d9' : '#52c41a',
              color: record.status !== 'IN' ? '#00000040' : '#fff'
            }}
          >
            Confirm Exit
          </Button>

          <Button 
            type="text" 
            danger 
            icon={<StopOutlined />} 
            size="small"
            onClick={() => showBlacklistModal(record)}
            disabled={record.status === 'BLACKLISTED'}
          >
            Blacklist
          </Button>
          {record.group_members && record.group_members.length > 0 && (
            <Button 
              type="dashed" 
              icon={<TeamOutlined />} 
              onClick={() => showGroupMembers(record)}
              style={{ borderColor: '#1890ff', color: '#1890ff' }}
            >
              View Group ({record.group_members.length})
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100%' }}>
      
      <div className="print-hidden">
        <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>Visitor Log</Title>
              <Text type="secondary">Complete history of facility access and security flags.</Text>
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
                style={{ background: '#107c41', borderColor: '#107c41' }} // Excel Green Color
              >
                Export Excel
              </Button>
            </div>
          </div>

          <Table 
            columns={columns} 
            dataSource={logs} 
            loading={loading}
            rowKey="id"
            pagination={{ 
              current: currentPage,
              pageSize: 10,
              total: totalRecords,
              onChange: (page) => setCurrentPage(page) 
            }}
            scroll={{ x: 800 }} 
          />
        </Card>

        {/* MODAL 1: VIEW DIGITAL PASS */}
        <Modal
          title="Digital Visitor Pass"
          open={isPassModalVisible}
          onCancel={() => setIsPassModalVisible(false)}
          width={500} 
          /* 🚀 NOTE: Step 2 la footer dynamic-aa maathuvom, ippo modalla ulla content-ah ippadi maathunga */
          footer={[
            <Button key="close" onClick={() => setIsPassModalVisible(false)}>Close</Button>,
            passRecord?.visitor_details?.visitor_type === 'LONG_TERM' ? (
              <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={() => {
                const svgElement = document.getElementById("log-downloadable-qr");
                if (!svgElement) return;
                const svgString = new XMLSerializer().serializeToString(svgElement);
                const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
                const blobURL = URL.createObjectURL(svgBlob);
                const image = new Image();
                image.onload = () => {
                  const canvas = document.createElement("canvas");
                  canvas.width = 300; canvas.height = 300;
                  canvas.getContext("2d").drawImage(image, 0, 0, 300, 300);
                  const downloadLink = document.createElement("a");
                  downloadLink.href = canvas.toDataURL("image/png");
                  downloadLink.download = `QR_${passRecord?.visit_id}.png`;
                  downloadLink.click();
                };
                image.src = blobURL;
              }} style={{ background: '#52c41a', borderColor: '#52c41a' }}>Download QR Code</Button>
            ) : (
              <Button key="print" type="primary" icon={<FilePdfOutlined />} onClick={() => window.print()}>Reprint Gate Pass</Button>
            )
          ]}
        >
          {passRecord && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px', background: '#f0f2f5' }}>
              
              {/* 🚀 LOG PAGE VIEW PASS DECISION ENGINE */}
              {passRecord?.visitor_details?.visitor_type === 'LONG_TERM' ? (
                
                /* ========================================================= */
                /* CASE 1: 3-MONTH CONTRACTOR -> SHOW STANDALONE QR PASS ONLY */
                /* ========================================================= */
                <div style={{ textAlign: 'center', padding: '24px 16px', background: '#fff', borderRadius: '12px', width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <Typography.Title level={4} style={{ color: '#0a1930', marginBottom: '4px', textTransform: 'uppercase' }}>
                    {passRecord?.visitor_details?.name}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: '14px', display: 'block', marginBottom: '20px' }}>
                    Contractor Pass ID: <b>{passRecord?.visit_id}</b>
                  </Typography.Text>

                  {/* Standalone Display QR code with unique identifier */}
                  <div style={{ background: '#fff', padding: '16px', display: 'inline-block', borderRadius: '12px', border: '1px solid #e8e8e8' }}>
                    <QRCodeSVG 
                      id="log-downloadable-qr"
                      value={passRecord?.visit_id || ''} 
                      size={200} 
                      level="H" 
                      includeMargin={true} 
                    />
                  </div>

                  <p style={{ marginTop: '20px', color: '#8c8c8c', fontStyle: 'italic', fontSize: '12px', margin: '16px 0 0 0' }}>
                    Verified Long-Term Contractor active credentials badge loop setup matrix.
                  </p>
                </div>

              ) : (

                /* ========================================================= */
                /* CASE 2: NORMAL VISITOR -> SHOW YOUR EXISTING THERMAL PASS */
                /* ========================================================= */
                <div className="new-pass-container">
                  {/* Header Section */}
                  <div className="pass-header-top">
                    <img src={passLogo} alt="Left Logo" className="pass-logo-left" />
                    <div className="pass-header-text">MATERIAL ORGANISATION</div>
                    <img src={navyLogo} alt="Right Logo" className="pass-logo-right" />
                  </div>
                  
                  <div className="pass-divider">
                     <span className="pass-line"></span>
                     <span className="pass-anchor">{'⚓\uFE0E'}</span>
                     <span className="pass-line"></span>
                  </div>

                  {/* Title Section */}
                  <div className="pass-title-container">
                     <span className="title-star">★</span>
                     <span className="title-gold-line"></span>
                     <div className="pass-title">VISITOR PASS</div>
                     <span className="title-gold-line"></span>
                     <span className="title-star">★</span>
                  </div>

                  {/* Photo & QR Section */}
                  <div className="pass-media-row">
                    <div className="pass-photo-wrapper">
                      {passRecord.visitor_details?.photo ? (
                        <img 
                          src={passRecord.visitor_details.photo.startsWith('http') ? passRecord.visitor_details.photo : `http://192.168.0.100:8000${passRecord.visitor_details.photo}`} 
                          alt="Visitor" className="pass-photo-img" 
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justify: 'center', background: '#f0f0f0' }}><UserOutlined style={{ fontSize: '40px', color: '#ccc' }} /></div>
                      )}
                    </div>
                    <div className="pass-qr-wrapper">
                      <QRCodeSVG value={passRecord.visit_id} size={90} level="M" includeMargin={false} />
                    </div>
                        <div style={{ marginTop: '5px', fontSize: '11px', fontWeight: 'bold', color: '#0a1930' }}>
                    S.No: {passRecord.id}
                  </div>
                  </div>

                  {/* Details Table Section */}
                  <div className="pass-details-box">
                    <div className="pass-detail-row"><div className="pass-icon"><UserOutlined /></div><div className="pass-label">VISITOR NAME</div><div className="pass-colon">:</div><div className="pass-value dotted-underline">{passRecord.visitor_details?.name}</div></div>
                    <div className="pass-detail-row"><div className="pass-icon"><IdcardOutlined /></div><div className="pass-label">ID PROOF NO.</div><div className="pass-colon">:</div><div className="pass-value dotted-underline">{passRecord.visitor_details?.id_number}</div></div>
                    <div className="pass-detail-row"><div className="pass-icon"><PhoneOutlined /></div><div className="pass-label">CONTACT NO.</div><div className="pass-colon">:</div><div className="pass-value dotted-underline">{passRecord.visitor_details?.phone}</div></div>
                    <div className="pass-detail-row"><div className="pass-icon"><ProfileOutlined /></div><div className="pass-label">PURPOSE OF VISIT</div><div className="pass-colon">:</div><div className="pass-value dotted-underline">{passRecord.purpose}</div></div>
                    <div className="pass-detail-row"><div className="pass-icon"><TeamOutlined /></div><div className="pass-label">PERSON TO MEET</div><div className="pass-colon">:</div><div className="pass-value dotted-underline">{passRecord.host}</div></div>
                    {passRecord.vehicle_number && (
                      <div className="pass-detail-row"><div className="pass-icon"><CarOutlined /></div><div className="pass-label">VEHICLE NO.</div><div className="pass-colon">:</div><div className="pass-value dotted-underline" style={{ textTransform: 'uppercase' }}>{passRecord.vehicle_number}</div></div>
                    )}
                   
                    
                    


                    {passRecord.escort && passRecord.escort !== 'N/A' && passRecord.escort.trim() !== '' && (
                <div className="pass-detail-row">
                  <div className="pass-icon"><UserAddOutlined /></div>
                  <div className="pass-label">ESCORT DETAILS</div>
                  <div className="pass-colon">:</div>
                  <div className="pass-value dotted-underline" style={{ textTransform: 'capitalize' }}>
                    {passRecord.escort_rank ? <span style={{ fontWeight: 'bold', marginRight: '4px' }}>{passRecord.escort_rank}</span> : null}
                    {passRecord.escort}
                    {passRecord.escort_number ? <span style={{ textTransform: 'uppercase', marginLeft: '4px' }}>(ID: {passRecord.escort_number})</span> : null}
                  </div>
                </div>
                      )}
                    
                    
                     {passRecord.mobile_locker && passRecord.mobile_locker.trim() !== '' && (
                      <div className="pass-detail-row">
                        <div className="pass-icon"><LockOutlined /></div>
                        <div className="pass-label">MOBILE LOCKER</div>
                        <div className="pass-colon">:</div>
                        <div className="pass-value dotted-underline" style={{ fontWeight: 'bold' }}>
                          {passRecord.mobile_locker}
                        </div>
                      </div>
                    )}
                    <div className="pass-detail-row"><div className="pass-icon"><CalendarOutlined /></div><div className="pass-label">ISSUED ON</div><div className="pass-colon">:</div><div className="pass-value dotted-underline">{passRecord.visit_date} {passRecord.entry_time_display || passRecord.entry_time}</div></div>
                    <div className="pass-detail-row"><div className="pass-icon"><CalendarOutlined /></div><div className="pass-label">EXPIRES ON</div><div className="pass-colon">:</div><div className="pass-value dotted-underline">{passRecord.expected_exit_date || "N/A"} {passRecord.expected_exit_time || ""}</div></div>
                    <div className="pass-detail-row" style={{ borderBottom: 'none' }}><div className="pass-icon"><SafetyCertificateOutlined /></div><div className="pass-label">PASS NO.</div><div className="pass-colon">:</div><div className="pass-value dotted-underline"><strong>{passRecord.visit_id}</strong></div></div>
                  </div>

                  {/* Signature Section */}
                  <div className="pass-signatures-section">
                    <div className="pass-stamp-box"><img src={stampLogo} alt="Official Stamp" className="pass-stamp-img" /></div>
                    <div className="pass-sign-lines">
                      <div className="pass-sign-block"><div className="pass-sign-line"></div><div className="pass-sign-text">Signature of Issuing Authority</div></div>
                      <div className="pass-sign-block"><div className="pass-sign-line"></div><div className="pass-sign-text">Signature of Host</div></div>
                    </div>
                  </div>
                  
                  <div className="pass-instructions">
                    <div className="instruction-item">1. This Pass is Non-Transferable and to be returned, after completion of Visit purpose.</div>
                    <div className="instruction-item">2. The host is responsible for the Visitor's Conduct and Security.</div>
                    <div className="instruction-item">3. Fine of Rs. 100/- will be levied for non-deposition of the Visitor's Pass and the visitor will be Blacklisted for entry into the unit.</div>
                  </div>

                  <div className="pass-footer">★ GENERATED BY VEN VMS ★</div>
                </div>

              )}

            </div>
          )}
        </Modal>

        {/* MODAL 2: RETROACTIVE BLACKLIST */}
        <Modal
          title={<Space><WarningOutlined style={{ color: '#ff4d4f' }} /><span style={{ color: '#ff4d4f' }}>Retroactive Blacklist Request</span></Space>}
          open={isBlacklistModalVisible}
          onCancel={() => { setIsBlacklistModalVisible(false); form.resetFields(); }}
          footer={null}
          destroyOnClose
        >
          {selectedRecord && (
            <>
              <Alert message={`You are placing ${selectedRecord.visitor_details?.name} on the security blacklist.`} description={`Visit ID: ${selectedRecord.visit_id} | Date: ${selectedRecord.visit_date}`} type="error" showIcon style={{ marginBottom: 24 }} />
              <Form form={form} layout="vertical" onFinish={handleBlacklist}>
                <Form.Item name="reason" label="Detailed Reason for Blacklisting" rules={[{ required: true, message: 'A reason is strictly required.' }, { min: 10, message: 'Min 10 characters.' }]}>
                  <TextArea rows={4} placeholder="E.g., Discovered damage to property..." />
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

        {/* MODAL 3: ID Proof Document Viewer (Updated Fix) */}
        <Modal
  title="ID Proof Document Viewer"
  open={isPdfModalVisible}
  onCancel={() => setIsPdfModalVisible(false)}
  width={800}
  footer={[
    <Button key="close" onClick={() => setIsPdfModalVisible(false)}>Close</Button>,
    <Button key="download" type="primary" href={pdfUrl} target="_blank">Download</Button>
  ]}
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
    {/* Scanned JPEG theriyanum na <img> tag dhaan correct */}
    <img
      src={pdfUrl} 
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
        message.error("Failed to load scanned image.");
      }}
    />
  </div>
      </Modal>

      {/* 👇 PUTHU CODE: MODAL 4 - Police Verification Certificate 👇 */}
        <Modal
          title="Police Verification Certificate Viewer"
          open={isCertModalVisible}
          onCancel={() => setIsCertModalVisible(false)}
          width={800}
          footer={[
            <Button key="close" onClick={() => setIsCertModalVisible(false)}>Close</Button>,
            <Button key="download" type="primary" href={certUrl} target="_blank">Download</Button>
          ]}
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
              src={certUrl} 
              alt="Police Certificate"
              style={{ 
                maxHeight: '100%', 
                maxWidth: '100%', 
                objectFit: 'contain',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: '4px'
              }} 
              onError={(e) => {
                e.target.onerror = null; 
                // Image fail aana, Placeholder thedaama appadiye antha img tag-ah hide pannidrom
                e.target.style.display = 'none'; 
                message.error("Image path exists in DB, but the actual file is missing in the backend 'media' folder.");
              }}
            />
          </div>
        </Modal>
        {/* 🚀 PUDHU UI: View Group Members Modal */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: '#1890ff' }} /> 
            Accompanying Visitors for {selectedMainVisitor}
          </Space>
        }
        open={isViewGroupModalVisible}
        onCancel={() => setIsViewGroupModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewGroupModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px' }}>
          {selectedGroupMembers.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={selectedGroupMembers}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
                    }
                    title={<Text strong>{item.name}</Text>}
                    description={
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} /> 
                        Live Photo Verified
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary">No group members found.</Text>
          )}
        </div>
      </Modal>
      </div>

      {/* 🚀 NEW THERMAL PRINTER LAYOUT (INS ASVINI STYLE) */}
      {passRecord && passRecord?.visitor_details?.visitor_type !=='LONG_TERM'&& (
        <div className="print-only">
          <div className="new-pass-container">
            
            {/* Header Section */}
            <div className="pass-header-top">
              <img src={passLogo} alt="Left Logo" className="pass-logo-left" />
              <div className="pass-header-text">MATERIAL ORGANISATION</div>
              <img src={navyLogo} alt="Right Logo" className="pass-logo-right" />
            </div>
            
            <div className="pass-divider">
               <span className="pass-line"></span>
               <span className="pass-anchor">{'⚓\uFE0E'}</span>
               <span className="pass-line"></span>
            </div>

            {/* Title Section */}
            <div className="pass-title-container">
               <span className="title-star">★</span>
               <span className="title-gold-line"></span>
               <div className="pass-title">VISITOR PASS</div>
               <span className="title-gold-line"></span>
               <span className="title-star">★</span>
            </div>

            {/* Photo & QR Section */}
            <div className="pass-media-row">
              <div className="pass-photo-wrapper">
                {passRecord.visitor_details?.photo ? (
                  <img 
                    src={
                      passRecord.visitor_details.photo.startsWith('http') 
                        ? passRecord.visitor_details.photo 
                        : `http://192.168.0.100:8000${passRecord.visitor_details.photo.startsWith('/') ? '' : '/'}${passRecord.visitor_details.photo}`
                    } 
                    alt="Visitor" 
                    className="pass-photo-img" 
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = "https://via.placeholder.com/150?text=No+Photo";
                    }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                    <UserOutlined style={{ fontSize: '40px', color: '#ccc' }} />
                  </div>
                )}
              </div>
              <div className="pass-qr-wrapper">
                <QRCodeSVG value={passRecord.visit_id} size={90} level="M" includeMargin={false} />
              </div>
               <div style={{ marginTop: '5px', fontSize: '11px', fontWeight: 'bold', color: '#0a1930' }}>
                    S.No: {passRecord.id}
                  </div>
            </div>

            {/* Details Table Section */}
            <div className="pass-details-box">
              <div className="pass-detail-row">
                <div className="pass-icon"><UserOutlined /></div>
                <div className="pass-label">VISITOR NAME</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{passRecord.visitor_details?.name}</div>
              </div>
              <div className="pass-detail-row">
                <div className="pass-icon"><IdcardOutlined /></div>
                <div className="pass-label">ID PROOF NO.</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{passRecord.visitor_details?.id_number}</div>
              </div>
              <div className="pass-detail-row">
                <div className="pass-icon"><PhoneOutlined /></div>
                <div className="pass-label">CONTACT NO.</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{passRecord.visitor_details?.phone}</div>
              </div>
              <div className="pass-detail-row">
                <div className="pass-icon"><ProfileOutlined /></div>
                <div className="pass-label">PURPOSE OF VISIT</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{passRecord.purpose}</div>
              </div>
              <div className="pass-detail-row">
                <div className="pass-icon"><TeamOutlined /></div>
                <div className="pass-label">PERSON TO MEET</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{passRecord.host}</div>
              </div>
              {passRecord.vehicle_number && (
                <div className="pass-detail-row">
                  <div className="pass-icon"><CarOutlined /></div>
                  <div className="pass-label">VEHICLE NO.</div>
                  <div className="pass-colon">:</div>
                  <div className="pass-value dotted-underline" style={{ textTransform: 'uppercase' }}>
                    {passRecord.vehicle_number}
                  </div>
                </div>
              )}
              
              {passRecord.escort && passRecord.escort !== 'N/A' && passRecord.escort.trim() !== '' && (
                  <div className="pass-detail-row">
                    <div className="pass-icon"><UserAddOutlined /></div>
                    <div className="pass-label">ESCORT NAME</div>
                    <div className="pass-colon">:</div>
                    <div className="pass-value dotted-underline">{passRecord.escort}</div>
                    </div>
                )}
              {passRecord.mobile_locker && passRecord.mobile_locker.trim() !== '' && (
                      <div className="pass-detail-row">
                        <div className="pass-icon"><LockOutlined /></div>
                        <div className="pass-label">MOBILE LOCKER</div>
                        <div className="pass-colon">:</div>
                        <div className="pass-value dotted-underline" style={{ fontWeight: 'bold' }}>
                          {passRecord.mobile_locker}
                        </div>
                      </div>
                    )}
                {passRecord.escort_rank && passRecord.escort_rank.trim() !== '' && (
                      <div className="pass-detail-row">
                        <div className="pass-icon"><StarOutlined /></div>
                        <div className="pass-label">ESCORT RANK</div>
                        <div className="pass-colon">:</div>
                        <div className="pass-value dotted-underline">
                          {passRecord.escort_rank}
                        </div>
                      </div>
                    )}

                    {/* 🚀 PUTHU CODE: ESCORT NUMBER in Pass */}
                    {passRecord.escort_number && passRecord.escort_number.trim() !== '' && (
                      <div className="pass-detail-row">
                        <div className="pass-icon"><IdcardOutlined /></div>
                        <div className="pass-label">ESCORT ID</div>
                        <div className="pass-colon">:</div>
                        <div className="pass-value dotted-underline" style={{ textTransform: 'uppercase' }}>
                          {passRecord.escort_number}
                        </div>
                      </div>
                    )}

              
              <div className="pass-detail-row">
                <div className="pass-icon"><CalendarOutlined /></div>
                <div className="pass-label">ISSUED ON</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{passRecord.visit_date} {passRecord.entry_time_display || passRecord.entry_time}</div>
              </div>
              <div className="pass-detail-row">
                <div className="pass-icon"><CalendarOutlined /></div>
                <div className="pass-label">EXPIRES ON</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{passRecord.expected_exit_date || "N/A"} {passRecord.expected_exit_time || ""}</div>
              </div>
              <div className="pass-detail-row" style={{ borderBottom: 'none' }}>
                <div className="pass-icon"><SafetyCertificateOutlined /></div>
                <div className="pass-label">PASS NO.</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline"><strong>{passRecord.visit_id}</strong></div>
              </div>
            </div>

            {/* Signature & Stamp Section */}
            <div className="pass-signatures-section">
              <div className="pass-stamp-box">
                <img src={stampLogo} alt="Official Stamp" className="pass-stamp-img" />
              </div>
              <div className="pass-sign-lines">
                <div className="pass-sign-block">
                  <div className="pass-sign-line"></div>
                  <div className="pass-sign-text">Signature of Issuing Authority</div>
                </div>
                <div className="pass-sign-block">
                  <div className="pass-sign-line"></div>
                  <div className="pass-sign-text">Signature of Host</div>
                </div>
              </div>
            </div>
             <div className="pass-instructions">
                          <div className="instruction-item">1. This Pass is Non-Transferable and to be returned, after completion of Visit purpose.</div>
                          <div className="instruction-item">2. The host is responsible for the Visitor's Conduct and Security.</div>
                          <div className="instruction-item">3. Fine of Rs. 100/- will be levied for non-deposition of the Visitor's Pass and the visitor will be Blacklisted for entry into the unit.</div>
                        </div>

            {/* Footer Section */}
            <div className="pass-footer">
              ★ GENERATED BY VEN VMS ★
            </div>

          </div>
        </div>
      )}

      {/* 🚀 FULL CSS FOR SCREEN & PRINTER (WITH STRICT IMAGE SIZES) */}
      {/* 🚀 FULL CSS FOR SCREEN & PRINTER (WIDTH ONLY INCREASED) */}
      <style dangerouslySetInnerHTML={{__html: `
        /* GLOBAL PASS DESIGN */
        .print-only { width: 110mm; } 
        .new-pass-container { 
            width: 110mm; /* 👈 அகலம் மட்டும் 110mm ஆக அதிகரிக்கப்பட்டுள்ளது */
            padding: 5mm; /* 👈 உயரம் கூடாது என்பதற்காக பழைய அளவே உள்ளது */
            font-family: 'Arial', sans-serif; 
            color: #0a1930; 
            background: #fff; 
            border: 2px solid #0a1930; 
            box-sizing: border-box; 
            margin: 0 auto; 
        }
        
        .pass-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; padding: 0 5px; }
        
        /* 🛑 STRICT LOGO SIZE FIX - பழைய அளவுகள் 🛑 */
        .pass-logo, .pass-logo-left, .pass-logo-right { 
          width: 95px !important; 
          height: 45px !important; 
          max-width: 55px !important;
          object-fit: contain; 
        }
        
        .pass-header-text { font-size: 20px; font-weight: bold; letter-spacing: 1.5px; color: #0a1930; text-align: center; flex: 1; margin: 0 5px; } 
        
        /* 2. Anchor Divider */
        .pass-divider { display: flex; align-items: center; justify-content: center; margin: 3px 0; padding:0; }
        .pass-line { flex: 1; height: 1.5px; background-color: #0a1930; }
        .pass-anchor { color: #d4af37; font-size: 20px; margin: 0 5px; } 
        
        /* 3. Title with Star & Gold Line */
        .pass-title-container { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 5px; }
        .title-star { color: #d4af37; font-size: 10px; } 
        .title-gold-line { width: 35px; height: 1.5px; background-color: #d4af37; } 
        .pass-title { font-size: 16px; font-weight: 900; letter-spacing: 1.5px; color: #0a1930; margin: 0; white-space: nowrap; } 
        
        /* Media, Table & Details */
        .pass-media-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 5px; }
        .pass-photo-wrapper { width: 120px; height: 95px; border: 2px solid #0a1930; border-radius: 8px; overflow: hidden; padding: 2px; } /* 👈 உயரம் 95px பழைய அளவே உள்ளது */
        .pass-photo-img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
        .pass-qr-wrapper { width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; } 
        
        .pass-details-box { border: 1.5px solid #0a1930; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; margin-bottom: 10px; }
        .pass-detail-row { display: flex; border-bottom: 1px solid #0a1930; align-items: stretch; min-height: 22px; } /* 👈 Row உயரம் 22px பழைய அளவே உள்ளது */
        .pass-icon { background: #0a1930; color: #fff; width: 30px; display: flex; align-items: center; justify-content: center; font-size: 12px; border-right: 1.5px solid #0a1930; } 
        .pass-label { font-size: 9px; font-weight: bold; width: 100px; padding: 0 6px; display: flex; align-items: center; color: #0a1930; } 
        .pass-colon { font-size: 10px; font-weight: bold; display: flex; align-items: center; }
        .pass-value { font-size: 10px; padding: 0 8px; flex: 1; display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } 
        .dotted-underline { border-bottom: 1px dotted #ccc; margin-bottom: 2px; }
        .pass-footer { background: #0a1930; color: #fff; text-align: center; padding: 4px; font-size: 9px; font-weight: bold; letter-spacing: 1px; margin-top: auto; } 
        .pass-footer span { color: #d4af37; }
        
        /* 4. Signature & Stamp Section */
        .pass-signatures-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; margin-bottom: 10px; padding: 0 5px; }
        .pass-stamp-box { width: 60px; height: 60px; } 
        
        /* 🛑 STRICT STAMP SIZE FIX 🛑 */
        .pass-stamp-img { 
          width: 50px !important; 
          height: 50px !important; 
          max-width: 50px !important;
          object-fit: contain; 
        }
        
        .pass-sign-lines { flex: 1; display: flex; justify-content: flex-end; gap: 30px; padding-bottom: 5px; } 
        .pass-sign-block { display: flex; flex-direction: column; align-items: center; width: 100px; } 
        .pass-sign-line { width: 100%; height: 1px; background-color: #0a1930; margin-bottom: 4px; }
        .pass-sign-text { font-size: 7.5px; font-weight: bold; color: #0a1930; text-align: center; } 

         /* 8. Instructions Section */
            .pass-instructions {
              margin-top: 8px;
              padding-top: 5px;
              border-top: 1px dashed #0a1930;
              margin-bottom: 5px;
            }

          .instruction-item {
              font-size: 8px; 
              font-weight: bold;
              color: #0a1930; 
              line-height: 1.4;
              text-align: left;
            }
              
        .print-only { display: none; }
        
        /* PRINTER SPECIFIC RULES */
        @media print {
          body * { visibility: hidden; }
          .print-hidden { display: none !important; }
          .ant-modal-root, .ant-modal-wrap, .ant-modal-mask { display: none !important; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { display: flex; justify-content: center; position: absolute; left: 0; top: 0; width: 100%; margin: 0; z-index: 9999; background: white; }
          @page { size: portrait; margin: 0; }
        }
      `}} />
    </div>
  );
}