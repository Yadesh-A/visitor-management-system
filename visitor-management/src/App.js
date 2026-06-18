import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Layout, Menu, Button, Avatar, Typography, Space, message, Modal, Input, Form ,Badge
} from 'antd';
import { 
  DashboardOutlined, UserAddOutlined, LogoutOutlined, 
  HistoryOutlined, ExportOutlined, UserOutlined, 
  SafetyCertificateOutlined, SettingOutlined, LockOutlined ,StopOutlined, FileDoneOutlined
} from '@ant-design/icons';
import { AlertOutlined } from '@ant-design/icons';
import dayjs from 'dayjs'; 
import api from './api'; 
import navyLogo from './assets/navylogo.jpg';

// Components
import Login from './Components/Login';
import Dashboard from './Components/Dashboard';
import VisitorRegistration from './Components/VisitorRegistration';
import VisitorExit from './Components/VisitorExit';
import VisitorLog from './Components/VisitorLog';
import Settings from './Components/Settings'; 
import PersonalDetails from './Components/PersonalDetails';
import ExpiredVisitors from './Components/ExpiredVisitors';
import BlacklistedVisitors from './Components/BlacklistedVisitors';
import VisitorInOutReport from './Components/VisitorInOutReport';

// 🛑 FIX 1: stopTokenRefreshTimer-aiyum import panrom
import { startTokenRefreshTimer, stopTokenRefreshTimer } from './tokenManager';

// Assets
import Logo from './assets/Veerel Logo.png';
import logoExpanded from './assets/Veerel Logo-White-with-navy.png';   
import logoMinimized from './assets/Veerel Logo New Transparent-White.png';

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function App() {
  // 🛑 FIX 2: localStorage-ah sessionStorage-kku maathiyachu
  const [isAuthenticated, setIsAuthenticated] = useState(!!sessionStorage.getItem('vms_access_token'));
  
  const idleTimeoutRef = useRef(null);
  const IDLE_TIME = 24 * 60 * 60 * 1000; // 15 nimidam (milliseconds-la)

  useEffect(() => {
    startTokenRefreshTimer();
  }, []);

  // 🚀 FIX 3: IDLE TIMEOUT LOGIC (15 mins inactivity logout)
  useEffect(() => {
    // 🚀 PUTHU CODE: டைரக்ட்டா Storage-ல இருந்து Role எடுக்குறோம் (Error வராது)
    const currentRole = sessionStorage.getItem('vms_user_role');

    // அட்மின் லாகின் பண்ணிருந்தா (SECURITY இல்லனா) மட்டும்தான் டைமர் ஓடும்
    if (isAuthenticated && currentRole !== 'SECURITY') {
      const resetIdleTimer = () => {
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        
        idleTimeoutRef.current = setTimeout(() => {
          message.warning('Session expired due to inactivity. Please login again.');
          handleLogout(); // 15 mins aagiduchu na automatic-aaga veliya anuppidum
        }, IDLE_TIME);
      };

      const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      events.forEach(event => window.addEventListener(event, resetIdleTimer));
      resetIdleTimer();

      return () => {
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        events.forEach(event => window.removeEventListener(event, resetIdleTimer));
      };
    }
  }, [isAuthenticated]); // 👈 இங்க வேற எதையும் ஆட் பண்ண வேண்டாம்

  const [collapsed, setCollapsed] = useState(false);

 const userRole = sessionStorage.getItem('vms_user_role') || 'SECURITY';
  
  // 🚀 PUTHU CODE: Role-kku yetha muthal page-ah thelivaa set panrom
  const getDefaultView = (role) => {
    if (role === 'USER') return 'blacklist';
    if (role === 'ADMIN') return 'dashboard';
    return 'exit'; // SECURITY
  };
  
  const [activeView, setActiveView] = useState(getDefaultView(userRole));
  const [username, setUsername] = useState(sessionStorage.getItem('vms_username') || 'Admin');
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); 
  const [authForm] = Form.useForm();
  const [expiredCount, setExpiredCount] = useState(0);

  // 🚀 PUDHU CODE: Expired count-ah auto-va update pandrathukku
  useEffect(() => {
    if (isAuthenticated) {
      const fetchExpiredCount = async () => {
        try {
          const response = await api.get('logs/?page_size=100');
          const allLogs = response.data.results ? response.data.results : response.data;
          const now = dayjs();
          
          const overstayed = allLogs.filter((log) => {
            if ((log.status !== 'IN' && log.status !== 'REGISTERED') || !log.expected_exit_date || !log.expected_exit_time) {
              return false;
            }
            
            // Format: "YYYY-MM-DDTHH:mm:ss"
            const exitDateTime = new Date(`${log.expected_exit_date}T${log.expected_exit_time}`);
            return exitDateTime < now;
          });
          
          setExpiredCount(overstayed.length);
        } catch (err) {
          console.error("Failed to fetch expired count", err);
        }
      };

      fetchExpiredCount(); // Mudhalla oru thadava call pannum
      const interval = setInterval(fetchExpiredCount, 60000); // Athukku apram every 1 min update aagum
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);


  // App.js-kulla intha useEffect-ah add pannunga
useEffect(() => {
  const handleStorageChange = (event) => {
    // Check if the event is specifically our logout event
    if (event.key === 'vms_logout_event') {
      console.log('Logout signal received from another tab.');
      
      // 1. Storage-ah clear panrom
      sessionStorage.clear();
      stopTokenRefreshTimer();
      
      // 2. UI state-ah update panrom
      setIsAuthenticated(false);
      
      // 3. Login page-ku redirect panrom
      message.warning('Logged out due to activity in another tab.');
      window.location.href = '/login';
    }
  };

  // Browser-oda storage event-ah listen panrom
  window.addEventListener('storage', handleStorageChange);

  // Cleanup: Component unmount aagum pothu listener-ah remove panrom
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}, []);


  // 🛑 FIX 4: Perfect Logout implementation
const handleLogout = () => {
  // 1. Current tab-la irukkira details-ah clear panrom
  sessionStorage.clear();
  stopTokenRefreshTimer();
  setIsAuthenticated(false);

  // 2. MATHA TABS-KU SIGNAL ANUPPUROM (New Code)
  // localStorage-la value maaruna thaan 'storage' event trigger aagum
  localStorage.setItem('vms_logout_event', Date.now());

  message.info('Logged out successfully');
  window.location.href = '/login';
};

// App.js kulla intha useEffect-ah add pannunga
useEffect(() => {
  const handleAuthFailure = () => {
    console.log('401 Unauthorized detected via Event. Syncing state...');
    
    // 1. Storage matrum timer-ah stop panrom
    sessionStorage.clear();
    stopTokenRefreshTimer();
    
    // 🚀 2. React state-ah update panrom (Clean Logout)
    setIsAuthenticated(false);
    
    // 3. User-ku feedback kudukkurom
    message.error('Your session has expired. Please login again.');
  };

  // api.js anuppura custom signal-ah listen panrom
  window.addEventListener('vms_auth_failed', handleAuthFailure);

  // Cleanup
  return () => {
    window.removeEventListener('vms_auth_failed', handleAuthFailure);
  };
}, []);


  const handleVerifyPassword = async (values) => {
    try {
      // 🛑 FIX 5: localStorage -> sessionStorage
      const token = sessionStorage.getItem('vms_access_token');
      
      const response = await axios.post('http://192.168.0.100:8000/api/verify-settings-pwd/', 
        { password: values.password },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        setIsAuthModalOpen(false);
        authForm.resetFields();
        setActiveView('settings');
        message.success('Security Access Granted');
      }
    } catch (err) {
      message.error('Invalid security password!');
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'registration': return <VisitorRegistration />;
      case 'exit': return <VisitorExit />;
      case 'personaldetails': return <PersonalDetails />;
      case 'expired': return <ExpiredVisitors />;
      case 'log': return <VisitorLog />;
      case 'inoutreport': return <VisitorInOutReport />;
      case 'blacklist': return <BlacklistedVisitors />;
      case 'settings': return <Settings />; 
      default: return <Dashboard />;
    }
  };

  // 🛡️ PUTHU CODE: Role-based Menu Items
  const menuItems = [];

  // ADMIN kku thevayaana pages mattum
  if (userRole === 'ADMIN') {
    menuItems.push({ key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' });
    menuItems.push({ key: 'registration', icon: <UserAddOutlined />, label: 'Visitor Registration' });
    menuItems.push({ key: 'personaldetails', icon: <UserOutlined/>, label: 'Personal Details' });
    menuItems.push({ key: 'blacklist', icon: <StopOutlined />, label: 'Blacklist Person' }); 
    menuItems.push({ key: 'inoutreport', icon: <FileDoneOutlined />, label: 'Visitor In/Out Report' });
    menuItems.push({ key: 'log', icon: <HistoryOutlined />, label: 'Visitor Logs' });
    menuItems.push({ type: 'divider', style: { margin: '16px 0' } }); 
    menuItems.push({ key: 'settings', icon: <SettingOutlined />, label: 'Settings' });
  }

  if (userRole === 'USER') {
    
    menuItems.push({ key: 'blacklist', icon: <StopOutlined />, label: 'Blacklist Person' }); // 🚀 User paakkalam + action
    
    menuItems.push({ key: 'settings', icon: <SettingOutlined />, label: 'Settings' });
  }

  // SECURITY kku thevayaana pages mattum
  if (userRole === 'SECURITY') {
    
    // 1st Menu
    menuItems.push({ 
      key: 'exit', 
      icon: <ExportOutlined style={{ fontSize: '24px', marginRight: '20px' }} />, 
      label: <span style={{ fontSize: '22px', fontWeight: 'bold' }}>Security check</span>,
      style: { 
        marginTop: '40px', 
        height: '90px',       // 👈 🚀 PUDHU CODE: Blue Box-oda uyaram
        lineHeight: '90px'    // 👈 🚀 PUDHU CODE: Text-ah exact-aaga center-la ukkara vaikka
      } 
    });
   
    // 2nd Menu (Gap added here)
    menuItems.push({ 
      key: 'expired', 
      icon: <AlertOutlined style={{ color: '#ff4d4f', fontSize: '24px', marginRight: '20px' }} />, 
      label: (
        <Space style={{ fontSize: '22px', fontWeight: 'bold' }}>
          Expired Passes
          {expiredCount > 0 && <Badge count={expiredCount} color="#ff4d4f" offset={[10, 0]} />}
        </Space>
      ),
      style: { 
        marginTop: '25px', 
        height: '90px',       // 👈 🚀 PUDHU CODE: Blue Box-oda uyaram
        lineHeight: '90px'    // 👈 🚀 PUDHU CODE: Text-ah exact-aaga center-la ukkara vaikka
      } 
    });  
  }

  const onMenuClick = (e) => {
    if (e.key === 'settings') {
      setIsAuthModalOpen(true); 
    } else {
      setActiveView(e.key);
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {
      setIsAuthenticated(true);
      setUsername(sessionStorage.getItem('vms_username'));
      
      // 🛡️ PUTHU CODE: Login aana udanae avanga role-kku yetra page-ah load panrom
      // 🛡️ PUTHU CODE: Login aana udanae avanga role-kku yetra page-ah load panrom
      const newRole = sessionStorage.getItem('vms_user_role') || 'SECURITY';
      
      if (newRole === 'USER') {
        setActiveView('blacklist');
      } else if (newRole === 'ADMIN') {
        setActiveView('dashboard');
      } else {
        setActiveView('exit'); // SECURITY
      }
      
      startTokenRefreshTimer();
    }} />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }} hasSider>
      
      {/* 🚀 PUDHU CODE: Sider-ah fixed aakkiyachu */}
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed} 
        theme="dark" 
        width={350}
        style={{
          height: '100vh',
          position: 'fixed', // Sidebar static-aaga nikkum
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        {/* 🚀 Flex Container: Menu-va melayum, Logo-va keezhayum thalla */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          {/* Top Company Logo */}
          {/* 🚀 PUDHU CODE: Height-ah 80px la irundhu 120px kku maathiyachu */}
          <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: collapsed ? '8px' : '10px' }}>
            <img 
              src={collapsed ? logoMinimized : logoExpanded} 
              alt="VMS Logo" 
              style={{ 
                maxHeight: '100%', 
                width: collapsed ? '50px' : '280px', // 👈 🚀 MAGIC INGA THAAN: Sidebar open-la irukkum pothu width 280px (perusa) theriyum
                objectFit: 'contain',
                transition: 'width 0.2s' // Smooth-aaga perusaaga/chinna aaga
              }} 
            />
          </div>
          
          {/* Menu Items (flex: 1 kuduthathala idhu remaining space-ah eduthukkum) */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Menu theme="dark" selectedKeys={[activeView]} mode="inline" items={menuItems} onClick={onMenuClick} />
          </div>

          {/* 🚀 PUDHU CODE: Bottom Navy Logo */}
          <div style={{ 
            padding: '20px 10px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            marginBottom: '48px' // 👈 Collapse amukkura button-kku space vidrom
          }}>
            <img 
              src={navyLogo} 
              alt="Navy Logo" 
              style={{ 
                width: collapsed ? '30px' : '100px', // 👈 Open-la 200px (Perusa), Collapse-la 50px (Chinnatha)
                height: 'auto',
                objectFit: 'contain',
                transition: 'width 0.2s', // Smooth-aaga perusaagi chinna aaga
              }} 
            />
          </div>

        </div>
      </Sider>
      
      {/* 🚀 PUDHU CODE: Sidebar fixed aagittadhala, Right side content-ah konjam thalli vaikkurom */}
      <Layout style={{ marginLeft: collapsed ? 80 : 350, transition: 'all 0.2s' }}>
        
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,.08)', zIndex: 1 }}>
          <Title level={4} style={{ margin: 0 }}><SafetyCertificateOutlined style={{ color: '#1890ff' }} /> Visitor Management System</Title>
          <Space size="large">
            <Space><Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} /><Text strong>{username}</Text></Space>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} danger>Logout</Button>
          </Space>
        </Header>

        <Content style={{ margin: '0', background: '#f0f2f5' }}>
          {renderContent()}
        </Content>

        <Modal
          title={<Space><LockOutlined /> Administrator Access</Space>}
          open={isAuthModalOpen}
          onCancel={() => { setIsAuthModalOpen(false); authForm.resetFields(); }}
          onOk={() => authForm.submit()}
          okText="Verify Password"
          centered
          width={400}
        >
          <div style={{ padding: '10px 0', textAlign: 'center' }}>
            <Text type="secondary">Security check: Please enter your admin password to proceed to settings.</Text>
            <Form form={authForm} onFinish={handleVerifyPassword} layout="vertical" style={{ marginTop: 20 }}>
              <Form.Item name="password" rules={[{ required: true, message: 'Password is required' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="Admin Password" size="large" autoFocus />
              </Form.Item>
            </Form>
          </div>
        </Modal>

        <Footer style={{ textAlign: 'center', background: '#f0f2f5', padding: '20px 24px' }}>
          <Space direction="vertical" size="small">
            <img src={Logo} alt="Company Logo" style={{ width: '150px', height: 'auto' }} />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              © {new Date().getFullYear()} <a href="https://www.veerelenterprises.com" target="_blank" rel="noopener noreferrer">Veerel Enterprises</a>. All rights reserved. | VMS Developed by Veerel Enterprises.
            </Text>
          </Space>
        </Footer>
      </Layout>
    </Layout>
  );
}