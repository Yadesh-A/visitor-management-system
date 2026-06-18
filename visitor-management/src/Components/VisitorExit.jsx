import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Input, Button, Typography, Space, Descriptions, 
  Tag, message, Divider, Image, Avatar,List, Badge 
} from 'antd';
import { 
  ScanOutlined, LogoutOutlined, LoginOutlined, UserOutlined,RetweetOutlined ,TeamOutlined,    // 👈 Puthusa sethukkonga
  WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import api from '../api';


const { Title, Text } = Typography;

export default function VisitorExit() {
  
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPassValid, setIsPassValid] = useState(false);

  // 1. 🚀 REF FOR AUTO-FOCUS
  const searchInputRef = useRef(null);
  const scanLockRef = useRef(false);

  // 2. 🛡️ GLOBAL FOCUS LOGIC
 // 🛡️ COMBINED: Focus Logic + Auto-Update Status Logic
  // 🛡️ COMBINED: Focus Logic + Auto-Update Status Logic
  // 🛡️ COMBINED: Focus Logic + Auto-Update Status Logic
  useEffect(() => {
    // 1. Focus Logic
    const focusInput = () => {
      if (searchInputRef.current) searchInputRef.current.focus();
    };
    focusInput();

    const handleGlobalClick = (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        setTimeout(focusInput, 100);
      }
    };
    window.addEventListener('click', handleGlobalClick);

    // 2. 🚀 Fixed Auto-Update Logic (Force Refresh)
    let interval = null;
    
    if (selectedVisitor) {
      interval = setInterval(async () => {
        try {
          // Force fetch with timestamp to avoid browser caching
          const timestamp = new Date().getTime();
          const response = await api.get(`logs/?search=${selectedVisitor.visit_id}&t=${timestamp}`);
          const logsArray = response.data.results || response.data;
          const latest = logsArray.find(item => item.visit_id === selectedVisitor.visit_id);
          
          if (latest && latest.status !== selectedVisitor.status) {
            console.log("Status update detected:", latest.status);
            // 🚀 Force update the state to trigger re-render
            setSelectedVisitor(prev => ({ ...prev, status: latest.status }));
          }
        } catch (err) {
          console.error("Auto-update fetch error");
        }
      }, 2000); // 2 seconds-kku oru thadava check pannum
    }

    return () => {
      window.removeEventListener('click', handleGlobalClick);
      if (interval) clearInterval(interval);
    };
  }, [selectedVisitor?.status, selectedVisitor?.visit_id]);

  // 1. 🔍 REAL-TIME SEARCH FROM BACKEND (Updated with 3-sec Lock)
  // 🚀 PUDHU LOGIC: Scanner Auto-Detect
 // 🚀 STRICTION-BASED AUTO DETECT: Exact Length Validation
  const handleInputChange = (e) => {
    const rawValue = e.target.value;
    const cleanValue = rawValue.trim().toUpperCase();
    
    // Visit ID (12 chars) அல்லது RFID (10 chars) வந்தால் ஆட்டோமேட்டிக்கா Search-க்கு போகும்
    const isVisitId = cleanValue.startsWith('VISIT-') && cleanValue.length === 12;
    const isRfid = !cleanValue.startsWith('VISIT-') && cleanValue.length === 10;

    if (isVisitId || isRfid) {
      handleSearch(cleanValue);
    }
  };


  // 1. 🔍 REAL-TIME SEARCH (WITH AUTO-ACTION & LIVE UPDATE)
  // 1. 🔍 REAL-TIME SEARCH (WITH AUTOMATED DYNAMIC ROUTING & CORRECTIONS)
   const handleSearch = async (value) => {
    const trimmedValue = value?.trim();
    if (!trimmedValue) return;

    // 🚀 Scanner அடுத்த ஸ்கேனுக்கு ரெடியாக Input-ஐ உடனே Clear செய்கிறோம்!
    if (searchInputRef.current && searchInputRef.current.input) {
      searchInputRef.current.input.value = '';
    }

    if (scanLockRef.current) return; // Scanner Lock Check

    scanLockRef.current = true;
    setTimeout(() => { scanLockRef.current = false; }, 2500); // 2.5 seconds lock

    setLoading(true);
    setSelectedVisitor(null);  

    try {
        const response = await api.get(`logs/?search=${trimmedValue}`);
        const logsArray = response.data.results || response.data;

        if (Array.isArray(logsArray) && logsArray.length > 0) {
            const found = logsArray.find(log => {
                const dbVisitId = String(log.visit_id).toLowerCase();
                const dbPhone = String(log.visitor_details?.phone);
                const dbRfid = String(log.rfid_tag || '').toLowerCase();
                const searchVal = trimmedValue.toLowerCase();
                return dbVisitId === searchVal || dbPhone === searchVal || dbRfid === searchVal;
            });

            if (found) {
                if (found.status === 'BLACKLISTED') {
                    message.error('Access Denied: This visitor is in the Blacklist.');
                    setSelectedVisitor(null); 
                    // 🚀 PUTHU FIX: Scanner Clear
                    if (searchInputRef.current && searchInputRef.current.input) {
                        searchInputRef.current.input.value = '';
                    }
                    return;
                }
                
                let valid = false;
                if (found.expected_exit_date && found.expected_exit_time) {
                    const exitDateTimeString = `${found.expected_exit_date}T${found.expected_exit_time}`;
                    const exitDateTime = dayjs(exitDateTimeString);
                    valid = exitDateTime.isAfter(dayjs());
                }
                
                setIsPassValid(valid);
                setSelectedVisitor(found);
                
                // 🚀 PUTHU FIX: Scanner Clear
                if (searchInputRef.current && searchInputRef.current.input) {
                    searchInputRef.current.input.value = '';
                }

                // 🚀 AUTO-PROCESS LOGIC (1.5s Verify Time Gap)
                message.loading({ content: 'Verifying & Processing...', key: 'autoProcess' });
                
                setTimeout(() => {
                    const vId = found.visit_id;
                    const isLongTermContractor = found.visitor_details?.visitor_type === 'LONG_TERM';

                    if (found.status === 'REGISTERED') {
                        handleCheckIn(vId);
                    } 
                    else if (found.status === 'IN') {
                        handleCheckout(vId);
                    } 
                    else if (found.status === 'OUT') {
                        if (isLongTermContractor) {
                            handleReEntry(vId);
                        } else if (!isLongTermContractor && valid) {
                            handleReEntry(vId);
                        } else {
                            message.error({ content: 'Cannot Re-Enter: Normal short-term Pass Expired', key: 'autoProcess', duration: 3 });
                        }
                    }
                }, 1500); 

            } else {
                message.error('Visitor record found but ID/Phone mismatch.');
            }
        } else {
            message.error('No record found in database for this ID/Phone.');
        }

    } catch (err) {
        console.error("Search Error Details:", err);
        message.error('Connection error or Server not responding.');
    } finally {
        setLoading(false);
        setTimeout(() => searchInputRef.current?.focus(), 200);
    }
  };

  // 2. ✅ REAL-TIME CHECK-IN (Auto IN)
  const handleCheckIn = async (autoVId) => {
    const targetId = typeof autoVId === 'string' ? autoVId : selectedVisitor?.visit_id;
    try {
      await api.post('logs/checkin/', { visitId: targetId });
      message.success({ content: 'Marked as IN successfully.', key: 'autoProcess' });
      setSelectedVisitor(prev => prev ? { ...prev, status: 'IN' } : prev);
      
      // 🚀 PUTHU FIX: Scanner Clear
      if (searchInputRef.current && searchInputRef.current.input) {
          searchInputRef.current.input.value = '';
      }
    } catch (err) {
      message.error({ content: 'Check-in failed.', key: 'autoProcess' });
    }
  };

  // 3. 🔴 REAL-TIME CHECK-OUT (Auto OUT)
  const handleCheckout = async (autoVId) => {
    const targetId = typeof autoVId === 'string' ? autoVId : selectedVisitor?.visit_id;
    try {
      await api.post('logs/checkout/', { visitId: targetId });
      message.success({ content: 'Checked out successfully.', key: 'autoProcess' });
      setSelectedVisitor(prev => prev ? { ...prev, status: 'OUT' } : prev);
      
      // 🚀 PUTHU FIX: Scanner Clear
      if (searchInputRef.current && searchInputRef.current.input) {
          searchInputRef.current.input.value = '';
      }
    } catch (err) {
      message.error({ content: 'Checkout failed.', key: 'autoProcess' });
    }
  };

  // 4. 🚀 RE-ENTRY ACTION (Auto Re-Entry)
  const handleReEntry = async (autoVId) => {
    const targetId = typeof autoVId === 'string' ? autoVId : selectedVisitor?.visit_id;
    try {
      await api.post('logs/reentry/', { visitId: targetId });
      message.success({ content: 'RE-ENTERED successfully.', key: 'autoProcess' });
      setSelectedVisitor(prev => prev ? { ...prev, status: 'IN' } : prev);
      
      // 🚀 PUTHU FIX: Scanner Clear
      if (searchInputRef.current && searchInputRef.current.input) {
          searchInputRef.current.input.value = '';
      }
    } catch (err) {
      console.error("Backend Error Details:", err);
      const backendErrorMsg = err.response?.data?.error || 'Re-Entry failed. Check server connection.';
      message.error({ content: backendErrorMsg, key: 'autoProcess', duration: 4 });
    }
  };

  const uniqueGroupMembers = Object.values(
    (selectedVisitor?.group_members || []).reduce((acc, member) => {
      // அந்தப் பெயர் லிஸ்ட்டில் இல்லை என்றால் (அல்லது) ஏற்கனவே உள்ள பெயரில் Photo இல்லை, ஆனால் இப்ப வந்ததில் Photo இருந்தால் அதை எடுத்துக்கொள்
      if (!acc[member.name] || (!acc[member.name].photo && member.photo)) {
        acc[member.name] = member;
      }
      return acc;
    }, {})
  );



  return (
    // 🚀 PUDHU CODE: Main background div
    <div style={{ padding: '32px', background: '#f0f2f5', minHeight: '100%' }}>
      
      {/* 🚀 MAGIC INGA THAAN: maxWidth-ah 1000px la irundhu 1600px kku maathiyachu (Nalla periya screen) */}
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        
       

        {/* 🚀 Search Box Container */}
        <Card 
          variant="borderless" 
          style={{ borderRadius: 12,boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          styles={{ body: { position: 'absolute', left: '-9999px', opacity: 0} }} 
        >
          {/* 🚀 MAGIC INGA THAAN: Screen-ah vittu veliya thalli maraichachu, aana active-ah irukkum! */}
        <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
          <Input.Search
            ref={searchInputRef}
            placeholder="Hidden Scanner Input"
            size="large"
            loading={loading}
            onChange={handleInputChange} 
            onSearch={handleSearch}
          />
        </div>
        </Card>

        {selectedVisitor && (
          <Card 
            variant="borderless" 
            style={{ borderRadius: 12, borderTop: '6px solid #1890ff', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}
          >
            {/* 🚀 PHOTO & DETAILS FLEX CONTAINER */}
            <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}> {/* 👈 Gap-ah innum perusaakkiyachu */}
              
              {/* 📸 LEFT SIDE: VISITOR PHOTO */}
              <div style={{ flexShrink: 0 }}>
                {selectedVisitor.visitor_details?.photo ? (
                  <Image
                    width={350}  /* 👈 Photo size increased */
                    height={650} 
                    src={selectedVisitor.visitor_details.photo} 
                    style={{ borderRadius: '12px', objectFit: 'cover', border: '3px solid #d9d9d9', padding: '4px' }}
                    alt="Visitor Live Pic"
                  />
                ) : (
                  <Avatar shape="square" size={350} icon={<UserOutlined />} style={{ borderRadius: '12px' }} />
                )}
              </div>

              {/* 📝 RIGHT SIDE: VISITOR DETAILS */}
              <div style={{ flex: 1 }}>
                
                {/* Name and Tags Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <Title level={2} style={{ margin: 0, fontSize: '32px' }}>
                      <UserOutlined style={{ color: '#1890ff' }}/> {selectedVisitor.visitor_details?.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: '20px' }}>Visit ID: {selectedVisitor.visit_id}</Text>
                  </div>
                  
                  <Space direction="vertical" align="end" size="small">
                    {selectedVisitor.status === 'OUT' && (
                      <Tag color={isPassValid ? 'green' : 'red'} style={{ fontSize: '18px', padding: '6px 16px', borderRadius: '6px' }}>
                        {isPassValid ? 'Valid Pass' : 'Pass Expired'}
                      </Tag>
                    )}
                    
                    <Tag 
                      color={selectedVisitor.status === 'IN' ? 'green' : selectedVisitor.status === 'REGISTERED' ? 'blue' : 'default'}
                      style={{ marginRight: 0, fontSize: '22px', padding: '8px 24px', fontWeight: 'bold', borderRadius: '8px' }} 
                    >
                      STATUS: {selectedVisitor.status}
                    </Tag>
                  </Space>
                </div>

                {/* Description Table */}
                <Descriptions 
                  bordered 
                  column={1} 
                  size="middle" 
                  labelStyle={{ fontSize: '20px', fontWeight: 'bold', width: '30%', background: '#fafafa' }} 
                  contentStyle={{ fontSize: '20px' }}
                  style={{ marginTop: '20px' }}
                >
                  <Descriptions.Item label="Phone Number">{selectedVisitor.visitor_details?.phone}</Descriptions.Item>
                  <Descriptions.Item label="ID Number">{selectedVisitor.visitor_details?.id_number}</Descriptions.Item>
                  <Descriptions.Item label="Host to Meet">{selectedVisitor.host}</Descriptions.Item>
                  <Descriptions.Item label="Purpose">{selectedVisitor.purpose}</Descriptions.Item>
                  <Descriptions.Item label="Entry Time">{selectedVisitor.entry_time_display || selectedVisitor.entry_time}</Descriptions.Item>
                  <Descriptions.Item label="Valid Until">
                    {selectedVisitor.expected_exit_date 
                    ? <Text type="danger" strong>{selectedVisitor.expected_exit_date} @ {selectedVisitor.expected_exit_time}</Text> 
                    : 'End of Day'}
                  </Descriptions.Item>
                </Descriptions>

                {/* STATUS BIG BOX */}
                <Tag 
                  color={selectedVisitor.status === 'IN' ? 'WHITE' : selectedVisitor.status === 'REGISTERED' ? 'blue' : 'default'}
                  style={{ 
                    marginTop: '40px', 
                    width: '100%',
                    minHeight: '200px', 
                    display: 'flex', 
                    justifyContent: 'center',
                    alignItems: 'center', 
                    fontSize: '80px', 
                    fontWeight: 'bold',
                    letterSpacing: '4px', 
                    borderRadius: '12px',
                    backgroundColor: 
                      selectedVisitor.status === 'IN' ? '#2a8a0c' : 
                      selectedVisitor.status === 'REGISTERED' ? '#00478f' : 
                      selectedVisitor.status === 'BLACKLISTED' ? '#ad1212' : 
                      '#595959',
                    color: '#ffffff', 
                    boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                  }}  
                >
                  {selectedVisitor.status === 'IN' ? 'IN' : selectedVisitor.status}
                </Tag>
                
              </div>
            </div>

            <Divider style={{ margin: '32px 0' }} />
            
            {/* 🚀 PUDHU LOGIC: Group Members List Display */}
          {/* 🚀 PUDHU LOGIC: Group Members List Display */}
         

{uniqueGroupMembers.length > 0 && (
              <>
                <Divider orientation="left">
                  <Space style={{ fontSize: '22px', fontWeight: 'bold' }}>
                    <TeamOutlined style={{ color: '#1890ff' }}/> Accompanying Members ({uniqueGroupMembers.length})
                  </Space>
                </Divider>
                
                <div style={{ background: '#fafafa', padding: '32px', borderRadius: '12px', border: '1px solid #e8e8e8', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                  <List
                    size="large"
                    dataSource={uniqueGroupMembers} /* 👈 🚀 PUTHU FIX: இங்க uniqueGroupMembers னு மாத்தியாச்சு */
                    renderItem={(item) => (
                      <List.Item style={{ padding: '24px', background: '#fff', marginBottom: '12px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          
                          <div style={{ flexShrink: 0 }}>
                            {item.photo ? (
                              <Avatar src={item.photo} size={300} shape="square" style={{ border: '3px solid #52c41a', borderRadius: '12px' }} />
                            ) : (
                              <Avatar icon={<UserOutlined />} size={300} shape="square" style={{ backgroundColor: '#bfbfbf', borderRadius: '12px' }} />
                            )}
                          </div>

                          <div style={{ flex: 1, marginLeft: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ fontSize: '40px' }}>{item.name}</Text>
                            <Space>
                              {item.photo ? (
                                <Badge status="success" text={<Text type="success" style={{ fontSize: '24px', fontWeight: 'bold' }}>Photo Captured</Text>} />
                              ) : (
                                <Badge status="warning" text={<Text style={{ fontSize: '24px', color: '#faad14' }}>No Photo</Text>} />
                              )}
                            </Space>
                          </div>

                        </div>

                      </List.Item>
                    )}
                  />
                  
                  <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <Text type="secondary" italic style={{ fontSize: '18px' }}>
                      <WarningOutlined /> Verify all members visually before allowing entry.
                    </Text>
                  </div>
                </div>
              </>
            )}

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <Button 
                type="primary" 
                danger 
                size="large"
                style={{ height: '50px', fontSize: '18px', padding: '0 40px', borderRadius: '8px' }}
                onClick={() => {
                  setSelectedVisitor(null);
                  // 🚀 UPDATE 3: State-க்கு பதிலாக Ref மூலம் Input-ஐ Clear செய்கிறோம்
                  if (searchInputRef.current && searchInputRef.current.input) {
                    searchInputRef.current.input.value = '';
                  }
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
              >
                Clear Details & Reset
              </Button>
          </div>

          </Card>
        )}
      </div>
    </div>
  );
}