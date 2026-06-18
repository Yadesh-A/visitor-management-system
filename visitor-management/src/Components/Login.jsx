import React, { useEffect } from 'react';
import { Form, Input, Button, Checkbox, Typography, Row, Col, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios'; 
import Logo from '../assets/Veerel Logo-White-with-navy.png';

const { Title, Text, Paragraph } = Typography;

export default function Login({ onLoginSuccess }) {
  const [form] = Form.useForm();

  // 🛡️ EFFECT TO CLEAR LABELS ON LOAD
  useEffect(() => {
    form.resetFields();
    
    // 🆕 UPDATED: Clear both JWT tokens when arriving at login
    sessionStorage.removeItem('vms_access_token');
    sessionStorage.removeItem('vms_refresh_token');
    sessionStorage.setItem('isLoggedIn', 'false'); 
  }, [form]);

  const onFinish = async (values) => {
    try {
      const response = await axios.post('http://192.168.0.100:8000/api/login/', {
        username: values.username, 
        password: values.password
      });

      console.log("Response from server:", response.data);

      // 🛡️ FIX: 'role' field-aiyum response-la irunthu extract panrom
      const { access, refresh, role } = response.data; 

      if (access) {
        // ✨ Intha Tokens & Role-ah save panrom
        sessionStorage.setItem('vms_access_token', access);
        sessionStorage.setItem('vms_refresh_token', refresh);
        sessionStorage.setItem('vms_username', values.username);
        
        // 🆕 PUTHU CODE: Role-ah save panrom. Oru velai role varlana default-ah 'SECURITY' nu vachikurom.
        sessionStorage.setItem('vms_user_role', role || 'SECURITY'); 
        sessionStorage.setItem('isLoggedIn', 'true');

        message.success('Login successful!');
        
        // 🆕 PUTHU CODE: Role-based Redirection
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(); // Unga pazhaiya prop call
          
          // User role 'SECURITY' aa irundhaa Exit page-kku anuppurom
          if (role === 'SECURITY') {
            window.location.href = '/exit'; 
          } else {
            // ADMIN aa irundhaa Dashboard-kku anuppurom
            window.location.href = '/dashboard'; 
          }
        }, 100);
      } else {
        message.error("Auth token not found in response!");
      }

    } catch (error) {
      console.error('Login Error:', error);
      message.error('Invalid username or password.');
      form.resetFields(['password']); 
    }
  };

  return (
    <Row style={{ minHeight: '100vh' }}>
      {/* Left Side - Branding */}
      <Col xs={0} md={12} lg={14} style={{ 
        backgroundColor: '#001529', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: '0 10%' 
      }}>
        <div style={{ textAlign: 'left' }}>
          <img src={Logo} alt="Company Logo" style={{ width: '500px', height: 'auto', marginBottom: '24px' }} />
          <Title style={{ color: '#ffffff', fontSize: '42px', marginBottom: '16px' }}>
            Visitor Management System
          </Title>
          <Paragraph style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '18px', maxWidth: '600px' }}>
            Secure, streamlined visitor management. Monitor facility access, digitize visitor logs, and enhance security protocols with our comprehensive dashboard.
          </Paragraph>
        </div>
      </Col>

      {/* Right Side - Login Form */}
      <Col xs={24} md={12} lg={10} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: '0 8%', 
        backgroundColor: '#ffffff' 
      }}>
        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <Title level={2} style={{ margin: 0 }}>Welcome back</Title>
            <Text type="secondary">Please enter your details to sign in.</Text>
          </div>

          <Form 
            form={form} 
            layout="vertical" 
            onFinish={onFinish} 
            size="large" 
            requiredMark={false}
            autoComplete="off" // 🛡️ Prevents browser from auto-filling saved data
          >
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Please input your Username!' }]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
                placeholder="Enter your username"
                autoComplete="none" // Extra layer of protection for Arch Linux browsers
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please input your Password!' }]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
                placeholder="••••••••" 
                autoComplete="new-password"
              />
            </Form.Item>

            

            <Form.Item>
              <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Col>
    </Row>
  );
}