import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Form, Input, Select, Button, Row, Col, Card, Typography, 
  message, Space, Divider, Switch, Result, Modal, Progress, Upload, Tag // 🆕 Upload imported
} from 'antd';

import { StarOutlined} from '@ant-design/icons';
import { LockOutlined} from '@ant-design/icons';
import { 
  CameraOutlined, 
  SearchOutlined, 
  PrinterOutlined, 
  ReloadOutlined,
  CarOutlined,
  ScanOutlined, 
  CheckCircleOutlined,
  WarningOutlined,
  UploadOutlined,
  UserOutlined, 
  IdcardOutlined, 
  PhoneOutlined, 
  ProfileOutlined, 
  TeamOutlined, 
  UserAddOutlined,
  CalendarOutlined, 
  SafetyCertificateOutlined,DownloadOutlined // 🆕 UploadOutlined imported
} from '@ant-design/icons';
import Webcam from 'react-webcam';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';
import axios from 'axios';
import { 
  DatePicker, TimePicker 
} from 'antd';
import dayjs from 'dayjs';

// 🚀 INTHA 3 LINES KANDIPPA MELA IRUKKANUM
import passLogo from '../assets/passlogo.jpg';
import navyLogo from '../assets/navylogo.jpg';
import stampLogo from '../assets/stamp.jpg'; // Oruvelai unga file .png aa iruntha maathikkonga

const { Title, Text } = Typography;
const { Option } = Select;

export default function VisitorRegistration() {
  const [form] = Form.useForm();
  const webcamRef = useRef(null);
  
  // App State
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [fingerprintFile, setFingerprintFile] = useState(null); 
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const [isDocScanning, setIsDocScanning] = useState(false);
  const [generatedPass, setGeneratedPass] = useState(null);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [idProofFile, setIdProofFile] = useState(null); // Already here, perfect!
  const [hasPoliceCert, setHasPoliceCert] = useState(false);
  const [policeCertFile, setPoliceCertFile] = useState(null);
  const [isPoliceCertScanning, setIsPoliceCertScanning] = useState(false);
 
  // Camera State
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [purposeOptions, setPurposeOptions] = useState([
    { value: 'Official Meeting' },
    { value: 'Delivery / Courier' },
    { value: 'Maintenance / Repair' },
    { value: 'Personal Visit' },
    { value: 'Interview' }
  ]); 

  
  // 🚀 PUDHU LOGIC: Group Members States
  const [groupMembers, setGroupMembers] = useState([]);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [tempMemberName, setTempMemberName] = useState('');
  const [tempMemberPhoto, setTempMemberPhoto] = useState(null);
  const groupWebcamRef = useRef(null);



  // 👇 🚀 3-Month Contractor handling-kkaana puthu states
  const [isLongTerm, setIsLongTerm] = useState(false);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [qrDownloadData, setQrDownloadData] = useState(null);

  // 🚀 DOWNLOAD QR FUNCTION (PNG format-ah download panna help pannum)
  const downloadQrCode = () => {
    const svgElement = document.getElementById("pvc-downloadable-qr");
    if (!svgElement) return;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, 300, 300);
      
      const pngURL = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngURL;
      downloadLink.download = `QR_${qrDownloadData?.visitId || 'Pass'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    image.src = blobURL;
  };


  // Group Member-kku Fingerprint Scan Pandra Function
  // 📸 Group Member Photo Capture Pandra Function
  const captureGroupMemberPhoto = useCallback(() => {
    if (groupWebcamRef.current) {
      const imageSrc = groupWebcamRef.current.getScreenshot();
      if (imageSrc) {
        setTempMemberPhoto(imageSrc); // Base64 image-ah save pandrom
        message.success(`${tempMemberName || 'Member'}'s photo captured!`);
      } else {
        message.error('Failed to capture frame. Check camera.');
      }
    }
  }, [groupWebcamRef, tempMemberName]);

  // 📝 List-la Group Member-ah Add Pandra Function
  


// 📝 List-la Group Member-ah Add Pandra Function
  const handleAddMember = () => {
    const newMember = { 
      id: `manual_${Date.now()}_${Math.random()}`, // 👈 தெளிவான Unique ID
      name: tempMemberName, 
      photo: tempMemberPhoto 
    };

    setGroupMembers([...groupMembers, newMember]);
    setTempMemberName('');
    setTempMemberPhoto(null);
    setIsGroupModalVisible(false);
    message.success(`${tempMemberName} added to the group!`);
  };


  // Group-la irundhu aalai remove panna
  const removeMember = (idToRemove) => {
    // 🚀 PUTHU FIX: id-ஐ வைத்து துல்லியமாக நீக்குகிறோம்
    const updatedMembers = groupMembers.filter((member) => member.id !== idToRemove);
    setGroupMembers(updatedMembers);
  };
  const [searchLoading, setSearchLoading] = useState(false);
  const [isBiometricRequired, setIsBiometricRequired] = useState(() => {
    return sessionStorage.getItem('vms_biometric_required') !== 'false';
  });
  const [isRfidEnabled, setIsRfidEnabled] = useState(() => {
    return sessionStorage.getItem('vms_rfid_required') === 'true'; 
  });

  useEffect(() => {
    const biometricSetting = sessionStorage.getItem('vms_biometric_required');
    if (biometricSetting === 'false') {
      setIsBiometricRequired(false);
    } else {
      setIsBiometricRequired(true);
    }
    const rfidSetting = sessionStorage.getItem('vms_rfid_required');
    setIsRfidEnabled(rfidSetting === 'true');

    const fetchPurposes = async () => {
      try {
        const response = await api.get('logs/purposes/');
        const backendData = response.data.map(item => ({ value: item.purpose }));
        setPurposeOptions(prev => {
          const combined = [...prev, ...backendData];
          return Array.from(new Set(combined.map(a => a.value)))
                      .map(value => ({ value }));
        });
      } catch (err) {
        console.error("Failed to fetch purposes from server", err);
      }
    };

    fetchPurposes();
  }, []);


  // 🚀 PUDHU FUNCTION: Backend-kku Re-Entry Request anuppa
  const handleReEntrySubmit = async (visitId, visitorName) => {
    try {
      message.loading({ content: 'Processing Re-Entry...', key: 'reentry' });
      
      await api.post('logs/reentry/', { visitId: visitId });
      
      message.success({ 
        content: `${visitorName} RE-ENTERED successfully! Pass is active again.`, 
        key: 'reentry', 
        duration: 4 
      });
      
      form.resetFields();
      setPhotoPreview(null);
    } catch (err) {
      message.error({ content: 'Re-Entry failed. Check server connection.', key: 'reentry' });
    }
  };

  const onSearch = async (value) => {
    if (!value) {
      message.warning('Please enter a Phone or ID Number to search.');
      return;
    }

    try {
      const response = await api.get(`visitors/search/?q=${value}`);

      if (response.data) {
        const found = response.data;
        
        // 1. Blacklist Check
        if (found.status === 'BLACKLISTED') {
          Modal.error({
            title: 'SECURITY ALERT: Access Denied',
            content: `This individual (${found.name}) is on the security blacklist.`,
            okText: 'Acknowledge',
            okButtonProps: { danger: true },
          });
          return;
        }

        // 2. Already Inside Check
        if (found.status === 'IN' || found.status === 'REGISTERED') {
          Modal.warning({
            title: 'Active Pass Exists',
            content: `${found.name} is currently marked as '${found.status}'. They must checkout (OUT) before a new pass can be generated.`,
          });
          form.resetFields(); 
          setPhotoPreview(null);
          return;
        }

        // 🚀 3. PUDHU LOGIC: Re-Entry Check (OUT aagittanga, aana time irukku)
        // 🚀 3. PUDHU LOGIC: Re-Entry Check (OUT aagittanga, aana time irukku)
        // onSearch kulla irukkira logic 3-ah ippadi maathunga:
        if (found.status === 'OUT' && found.expected_exit_date && found.expected_exit_time) {
          const exitDateTimeString = `${found.expected_exit_date}T${found.expected_exit_time}`;
          const exitDateTime = dayjs(exitDateTimeString);
          const now = dayjs();

          if (exitDateTime.isAfter(now)) {
            Modal.info({
              title: 'Valid Pass Found for Re-Entry',
              icon: <SafetyCertificateOutlined style={{ color: '#52c41a' }} />,
              content: (
                <div>
                  <p><b>{found.name}</b> has a valid pass until <b>{exitDateTime.format('hh:mm A')}</b>.</p>
                  <p style={{ color: '#faad14', fontWeight: 'bold' }}>
                  Action Required:
                  </p>
          <p>Instruct the visitor to go directly to the Security Gate for Re-Entry check-in. No new registration is needed.</p>
        </div>
      ),
            okText: 'Understood', // Unga original logic
            onOk: () => {
              form.resetFields(); 
              setPhotoPreview(null);
      }
    });
    return; // Form open panna vidathu
  }
}

        // 4. Time mudinjiduchu illa puthu visitor na, form-ah auto-fill pandrom
        form.setFieldsValue({
          name: found.name,
          phone: found.phone,
          idType: found.id_type,
          idNumber: found.id_number,
        });
        message.success(`Visitor found: ${found.name}. Please capture a new photo for the new pass.`);
      }
    } catch (err) {
      message.info('No previous active records found. Proceed as new visitor.');
    }
  };

  const handlePurposeSearch = async (value) => {
    if (value) {
      setSearchLoading(true);
      try {
        const token = sessionStorage.getItem('vms_access_token');
        const response = await axios.get(`http://192.168.0.100:8000/api/logs/purposes/?search=${value}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const fetchedOptions = response.data.map(item => ({
          label: item.purpose, 
          value: item.purpose
        }));
        
        const exists = fetchedOptions.some(opt => opt.value.toLowerCase() === value.toLowerCase());
        if (!exists) {
          fetchedOptions.push({ label: `Add "${value}" as new purpose`, value: value });
        }
        
        setPurposeOptions(fetchedOptions);
      } catch (err) {
        console.error("Purpose search failed", err);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setPurposeOptions([]);
    }
  };

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setPhotoPreview(imageSrc);
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            setPhotoFile(new File([blob], "visitor_photo.jpg", { type: "image/jpeg" }));
          });
        message.success('Photo captured successfully.');
      } else {
        message.error('Failed to capture frame.');
      }
    }
  }, [webcamRef]);

 const searchByFingerprint = async () => {
    setIsBiometricScanning(true);
    try {
      const scanRes = await axios.post(`http://127.0.0.1:11100/capture`, {}, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (scanRes.data.success) {
        const scannedTemplate = scanRes.data.template;
        message.loading({ content: 'Fingerprint scanned! Searching database...', key: 'fp-search' });

        const token = sessionStorage.getItem('vms_access_token');
        try {
          const verifyRes = await axios.post(`http://192.168.0.100:8000/api/visitors/verify-fingerprint/`,
            { fingerprint: scannedTemplate },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (verifyRes.data) {
            const found = verifyRes.data;
            message.success({ content: `Welcome back, ${found.name}!`, key: 'fp-search', duration: 3 });
            
            // 1. மெயின் விசிட்டர் டீடைல்ஸ் ஆட்டோ-ஃபில் ஆகுது
            form.setFieldsValue({
              name: found.name,
              phone: found.phone,
              idType: found.id_type,
              idNumber: found.id_number,
            });
            
            setFingerprintFile(scannedTemplate);

            // 🚀 2. PUTHU CODE: Visitor-ன் முகப் புகைப்படத்தை (Face Photo) Auto-fill செய்ய
            if (found.photo) {
              const photoUrl = found.photo.startsWith('http') ? found.photo : `http://192.168.0.100:8000${found.photo.startsWith('/') ? '' : '/'}${found.photo}`;
              setPhotoPreview(photoUrl); // UI-ல் படத்தை காட்ட
              
              fetch(photoUrl)
                .then(res => res.blob())
                .then(blob => {
                  setPhotoFile(new File([blob], "existing_visitor_photo.jpg", { type: blob.type || "image/jpeg" }));
                }).catch(err => console.error("Photo fetch error:", err));
            }

            // 🚀 3. PUTHU CODE: ID Document (ID Proof Pic) Auto-fill செய்ய
            if (found.id_proof_document) {
              const idUrl = found.id_proof_document.startsWith('http') ? found.id_proof_document : `http://192.168.0.100:8000${found.id_proof_document.startsWith('/') ? '' : '/'}${found.id_proof_document}`;
              
              fetch(idUrl)
                .then(res => res.blob())
                .then(blob => {
                  // File name-ஐ வைத்து புது File உருவாக்குறோம்
                  const file = new File([blob], "Existing_ID_Proof.jpg", { type: blob.type || "image/jpeg" });
                  setIdProofFile(file); // 👈 இது UI-ல் 'Scanned: Existing_ID_Proof.jpg' என பச்சைக் கலரில் காட்டும்
                }).catch(err => console.error("ID Proof fetch error:", err));
            }
            if (found.last_group_members && found.last_group_members.length > 0) {
              // 🚀 PUTHU FIX: Duplicate தடுப்பது மட்டுமில்லாமல், எல்லாருக்கும் ஒரு ID கொடுக்கிறோம்
              const uniqueMembers = found.last_group_members
                .filter((member, index, self) =>
                  index === self.findIndex((t) => t.name === member.name)
                )
                .map((member, index) => ({
                  ...member,
                  id: `auto_${Date.now()}_${index}` // 👈 Backend-ல இருந்து வர்றவங்களுக்கும் ID செட் பண்றோம்
                }));

              setGroupMembers(uniqueMembers);
              message.info(`Loaded ${uniqueMembers.length} accompanying members from previous visit.`);
            } else {
              setGroupMembers([]); 
            }
          }
        } catch (verifyErr) {
          if (verifyErr.response?.status === 404) {
            message.info({
              content: "New Fingerprint detected. Please fill the form.",
              key: 'fp-search',
              duration: 3
            });
            setFingerprintFile(scannedTemplate);
          } else {
            console.error("Actual error:", verifyErr);
            message.error({
              content: "Verification failed. Check backend.",
              key: 'fp-search'
            });
          }
        }
      } else {
        message.error(`Scan Failed: ${scanRes.data.message}`);
      }
    } catch (err) {
      message.error('Bridge Connection Failed! Is the .NET console open?');
    } finally {
      setIsBiometricScanning(false);
    }
  };

  const handleFingerprintScan = async () => {
    setIsBiometricScanning(true);
    try {
      const response = await axios.post(`http://127.0.0.1:11100/capture`, {}, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.success) {
        setFingerprintFile(response.data.template); 
        message.success('Fingerprint captured successfully!');
      } else {
        message.error(`Scan Failed: ${response.data.message}`);
      }
    } catch (err) {
      message.error('Bridge Connection Failed! Is the .NET console open?');
    } finally {
      setIsBiometricScanning(false)
    }
  };

  const handleAutoScan = async () => {
    setIsDocScanning(true);
    message.loading({ content: 'Scanning in progress... Please wait.', key: 'scanning' });

    try {
        const response = await api.post('logs/trigger-scan/');

        if (response.data.success) {
            // Base64 string-ah thirumba File object-ah mathuroam
            const byteCharacters = atob(response.data.file_data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            
            const file = new File([blob], response.data.temp_file_name, { type: 'image/jpeg' });
            
            setIdProofFile(file); // ✅ Automatic-ah file state-la set aagidum
            message.success({ content: 'Document Scanned Successfully!', key: 'scanning' });
        }
    } catch (err) {
        message.error({ content: 'Scanner Error. Check Printer LAN & IP.', key: 'scanning' });
    } finally {
        setIsDocScanning(false);
    }
};

// 🚀 PUDHU FUNCTION: Police Certificate Scanner
  const handlePoliceCertScan = async () => {
    setIsPoliceCertScanning(true);
    message.loading({ content: 'Scanning Police Certificate... Please wait.', key: 'scanning_police' });

    try {
        const response = await api.post('logs/trigger-scan/');

        if (response.data.success) {
            const byteCharacters = atob(response.data.file_data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            
            // File perai thelivaa puriyura maari vachikkuvom
            const file = new File([blob], `police_cert_${response.data.temp_file_name}`, { type: 'image/jpeg' });
            
            setPoliceCertFile(file);
            message.success({ content: 'Police Certificate Scanned Successfully!', key: 'scanning_police' });
        }
    } catch (err) {
        message.error({ content: 'Scanner Error. Check Printer LAN & IP.', key: 'scanning_police' });
    } finally {
        setIsPoliceCertScanning(false);
    }
  };

  const onFinish = async (values) => {
    if (!photoFile) {
      message.error('A live photo capture is required to generate a pass.');
      return;
    }

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('vms_access_token');

      try {
        const checkRes = await axios.get(`http://192.168.0.100:8000/api/visitors/search/?q=${values.phone}`, {
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        });

        if (checkRes.data) {
          const foundStatus = checkRes.data.status;
          
          // 1. Final Blacklist check before submitting
          if (foundStatus === 'BLACKLISTED') {
            Modal.error({
              title: 'SECURITY ALERT: Access Denied',
              content: 'This individual is on the security blacklist. Access denied.',
              okButtonProps: { danger: true },
            });
            setSubmitting(false);
            return; 
          }
          
          // 2. Final Inside/Registered check before submitting
          if (foundStatus === 'IN' || foundStatus === 'REGISTERED') {
            Modal.warning({
              title: 'Active Pass Exists',
              content: 'This visitor is currently inside the premises. Please check them OUT before creating a new pass.',
            });
            setSubmitting(false);
            return;
          }
        }
      } catch (searchErr) {
        console.log("New visitor detected or search failed, proceeding...");
      }

      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('phone', values.phone);
      formData.append('id_type', values.idType);
      formData.append('id_number', values.idNumber);
      formData.append('photo', photoFile);
      formData.append('visitor_type', isLongTerm ? 'LONG_TERM' : 'NORMAL');
      formData.append('mobile_locker', values.mobile_locker || ''); 
      
      formData.append('escort_rank', values.escort_rank || '');
      formData.append('escort_number', values.escort_number || '');  
      if (fingerprintFile) formData.append('fingerprint', fingerprintFile);
      
      // 🆕 PUTHU CODE: Append the selected ID Proof PDF/Image to backend
      if (idProofFile) {
        formData.append('id_proof_document', idProofFile);
      }
      if (hasPoliceCert && policeCertFile) {
        formData.append('police_verification_document', policeCertFile);
      }
      formData.append('host', values.host);
      formData.append('purpose', values.purpose);
      if (isRfidEnabled && values.rfidTag) {
        formData.append('rfid_tag', values.rfidTag);
      }
      if (values.escort) {
        formData.append('escort', values.escort);
      }
     


      if (hasVehicle) {
        formData.append('vehicle_type', values.vehicleType);
        formData.append('vehicle_number', values.vehicleNumber);
      }
      if (values.expectedExitDate) {
        formData.append('expected_exit_date', values.expectedExitDate.format('YYYY-MM-DD'));
      }
      if (values.expectedExitTime) {
        formData.append('expected_exit_time', values.expectedExitTime.format('HH:mm:ss'));
      }
      if (groupMembers.length > 0) {
      formData.append('group_members_data', JSON.stringify(groupMembers));
    }
      const response = await api.post('logs/', formData);

      // 👇 🚀 Exist aagura 'setGeneratedPass(...)' code-ah thookitu indha condition block-ah podunga
      if (isLongTerm) {
        // Toggle Active-ah irundha paper pass-ah skip panni QR popup Modal-ah open pannum
        setQrDownloadData({
          visitId: response.data.visit_id,
          name: values.name
        });
        setIsQrModalVisible(true);
        message.success('3-Month Contractor Registered! QR Code ready for download.');
      } else {
        // Toggle Off-la irundha eppavum pola unga normal paper pass generate aagum
        setGeneratedPass({
          ...values,
          rfidTag: values.rfidTag,
          photo: photoPreview,
          visitId: response.data.visit_id,
          id: response.data.id,
          escort: values.escort || 'N/A',
          escort_rank: values.escort_rank,
          escort_number: values.escort_number,
          mobile_locker: values.mobile_locker,
          date: response.data.visit_date,
          entryTime: response.data.entry_time_display,
          expDateDisplay: values.expectedExitDate ? values.expectedExitDate.format('DD-MM-YYYY') : response.data.visit_date,
          expTimeDisplay: values.expectedExitTime ? values.expectedExitTime.format('hh:mm A') : 'End of Day',

        });
        message.success('Visitor Pass generated successfully!');
      }



      
      message.success('Visitor Pass generated successfully!');
      
    } catch (err) {
      console.error("Submission Error:", err);
      const backendError = err.response?.data?.error;
      
      if (backendError) {
        const errorMessage = Array.isArray(backendError) ? backendError[0] : backendError;
        message.error(errorMessage); 
      } else {
        message.error(err.response?.data?.detail || "Registration failed. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => { window.print(); };

  const resetFlow = () => {
    form.resetFields();
    setPhotoPreview(null);
    setPhotoFile(null);
    setFingerprintFile(null);
    setIdProofFile(null);
    setHasPoliceCert(false);
    setPoliceCertFile(null); // 🆕 PUTHU CODE: Reset uploaded PDF
    setGeneratedPass(null);
    setHasVehicle(false);
    setGroupMembers([]);
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100%' }}>
      
      <div className="print-hidden">
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Visitor Registration</Title>
            <Text type="secondary">Process new entries and generate thermal gate passes.</Text>
          </div>
          <Space>
            <Input.Search 
              placeholder="Search Phone or ID No." 
              allowClear 
              enterButton={<><SearchOutlined /> Lookup Visitor</>}
              size="large"
              onSearch={onSearch}
              style={{ width: 350 }}
            />
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          {/* Left Column: Data Entry Form */}
          <Col xs={24} lg={14}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ idType: 'Aadhar' }}>
                
                {/* 👇 🚀 THE MASTER SWITCH TOGGLE BUTTON BUTTON */}
                <Divider orientation="left" style={{ marginTop: 0 }}>Registration Type</Divider>
                <Form.Item style={{ marginBottom: '24px' }}>
                  <Space size="middle">
                    <Switch 
                      checked={isLongTerm} 
                      onChange={setIsLongTerm} 
                      checkedChildren="3-Month Contractor" 
                      unCheckedChildren="Daily Normal Visitor"
                      style={{ background: isLongTerm ? '#52c41a' : '' }}
                    />
                    <Text strong style={{ fontSize: '15px' }}>
                      {isLongTerm ? "⚠️ Long-Term mode active: Generates unique downloadable QR pass only." : "Normal short visit processing pass setup."}
                    </Text>
                  </Space>
                </Form.Item>

                <Divider orientation="left" style={{ marginTop: 0 }}>Personal Details</Divider>
                <Row gutter={16}>
                  <Col span={12}><Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input placeholder="Visitor Name" size="large" /></Form.Item></Col>
                  <Col span={12}><Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}><Input placeholder="10-digit mobile" size="large" maxLength={10} /></Form.Item></Col>
                </Row>


                <Row gutter={16}>
  <Col span={8}>
    <Form.Item name="idType" label="ID Proof Type" rules={[{ required: true }]}>
      <Select size="large">
        <Option value="Aadhar">Aadhar</Option>
        <Option value="PAN">PAN</Option>
        <Option value="DL">Driver License</Option>
        {/* 🆕 PUTHU OPTIONS */}
        <Option value="VoterID">Voter ID</Option>
        <Option value="Passport">Passport</Option>
        <Option value="Others">Others</Option>
      </Select>
    </Form.Item>
  </Col>
  <Col span={16}>
    <Form.Item 
      name="idNumber" 
      label="ID Number" 
      dependencies={['idType']}
      rules={[
        { required: true, message: 'ID Number is required' },
        ({ getFieldValue }) => ({
          validator(_, value) {
            if (!value) return Promise.resolve();

            const type = getFieldValue('idType');
            
            // 1. Aadhar Validation
            if (type === 'Aadhar') {
              const aadharRegex = /^\d{12}$/;
              if (aadharRegex.test(value)) return Promise.resolve();
              return Promise.reject(new Error('Aadhar must be exactly 12 digits (Numbers only)'));
            }
            
            // 2. PAN Validation
            if (type === 'PAN') {
              const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
              if (panRegex.test(value)) return Promise.resolve();
              return Promise.reject(new Error('Invalid PAN format (e.g., ABCDE1234F)'));
            }
            
            // 3. DL Validation
            if (type === 'DL') {
              const dlRegex = /^[a-zA-Z0-9\s-]{10,20}$/; 
              if (dlRegex.test(value)) return Promise.resolve();
              return Promise.reject(new Error('Invalid DL number (Minimum 10 characters)'));
            }

            // 🆕 4. Voter ID Validation (Standard Format)
            if (type === 'VoterID') {
              const voterRegex = /^[A-Z]{3}[0-9]{7}$/i;
              if (voterRegex.test(value)) return Promise.resolve();
              return Promise.reject(new Error('Invalid Voter ID (e.g., ABC1234567)'));
            }

            // 🆕 5. Passport Validation (Standard Indian Format)
            if (type === 'Passport') {
              const passportRegex = /^[A-Z]{1}[0-9]{7}$/i;
              if (passportRegex.test(value)) return Promise.resolve();
              return Promise.reject(new Error('Invalid Passport number (e.g., A1234567)'));
            }

            // 🆕 6. Others (No specific format check)
            if (type === 'Others') {
              if (value.length >= 3) return Promise.resolve();
              return Promise.reject(new Error('Please enter a valid ID (Min 3 characters)'));
            }
            
            return Promise.resolve();
          },
        }),
      ]}
    >
      <Input placeholder="Enter ID number" size="large" />
    </Form.Item>
  </Col>
</Row>

{/* 🚀 PUDHU UI: Group Visitors Section */}
        <Divider orientation="left"><Space><TeamOutlined /> Accompanying Visitors </Space></Divider>
        <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px dashed #d9d9d9' }}>
          <Button 
            type="dashed" 
            icon={<UserAddOutlined />} 
            onClick={() => setIsGroupModalVisible(true)}
            block
          >
            Add Accompanying Person
          </Button>

          {/* Add aana aatkaloada list kaatta */}
           {groupMembers.map((member) => (
            <Tag 
              key={member.id} 
              closable 
              onClose={(e) => {
                e.preventDefault(); // 👈 🚀 PUTHU FIX: இதுதான் Tag தானாக மறைவதைத் தடுக்கும்
                removeMember(member.id); // 👈 சரியான நபரை மட்டும் State-ல் இருந்து நீக்கும்
              }} 
              color={member.photo ? "blue" : "default"}
              style={{ padding: '4px 10px', fontSize: '14px', marginBottom: '8px' }}
            >
              <UserOutlined /> {member.name} 
              {member.photo ? (
                <span style={{ marginLeft: '8px' }}>(Photo Added <CheckCircleOutlined style={{ color: '#52c41a'}} />)</span>
              ) : (
                <span style={{ marginLeft: '8px', color: '#faad14' }}>(No Photo)</span>
              )}
            </Tag>
          ))}

                </div>
                {/* 🆕 PUTHU CODE: Document Upload Field */}
                {/* 🆕 Single Button for Auto-Scan */}
<Row gutter={16}>
  <Col span={24}>
    <Form.Item label="ID Proof Document ">
      <Space direction="vertical" style={{ width: '100%' }}>
        
        {/* Only One Unified Button */}
        <Button 
          type="primary" 
          icon={<ScanOutlined />} 
          onClick={handleAutoScan} 
          loading={isDocScanning}
          style={{ 
            width: '100%', 
            background: idProofFile ? '#52c41a' : '#1890ff', // Ready aana color maarum
            height: '35px',
            fontSize: '16px'
          }}
        >
          {isDocScanning ? 'Scanner Processing...' : idProofFile ? 'ID Scanned Successfully' : 'Scan ID Document from Printer'}
        </Button>

        {/* Scan aanathum file name kaatta intha text mattum pothum */}
        {idProofFile && (
          <div style={{ textAlign: 'center', background: '#f6ffed', padding: '5px', borderRadius: '4px' }}>
            <Text type="success">
              <CheckCircleOutlined /> Scanned: <b>{idProofFile.name}</b>
            </Text>
            <Button type="link" danger size="small" onClick={() => setIdProofFile(null)}>
              Clear & Rescan
            </Button>
          </div>
        )}

      </Space>
    </Form.Item>
  </Col>
</Row>
              {/* 🚀 PUDHU UI: Police Verification Certificate */}
                <Divider orientation="left"><Space><SafetyCertificateOutlined /> Police Verification</Space></Divider>
                <Form.Item style={{ marginBottom: hasPoliceCert ? '8px' : '24px' }}>
                  <Space>
                    <Switch checked={hasPoliceCert} onChange={setHasPoliceCert} />
                    <Text>Has Police Verification Certificate?</Text>
                  </Space>
                </Form.Item>

                {hasPoliceCert && (
                  <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item label="Scan Police Verification Document" style={{ marginBottom: 0 }}>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            
                            <Button 
                              type="primary" 
                              icon={<ScanOutlined />} 
                              onClick={handlePoliceCertScan} 
                              loading={isPoliceCertScanning}
                              style={{ 
                                width: '100%', 
                                background: policeCertFile ? '#52c41a' : '#faad14', // Yellow color default, green on success
                                height: '35px',
                                fontSize: '16px',
                                borderColor: policeCertFile ? '#52c41a' : '#faad14'
                              }}
                            >
                              {isPoliceCertScanning ? 'Scanning Certificate...' : policeCertFile ? 'Certificate Scanned Successfully' : 'Scan Police Certificate from Printer'}
                            </Button>

                            {policeCertFile && (
                              <div style={{ textAlign: 'center', background: '#f6ffed', padding: '5px', borderRadius: '4px', marginTop: '8px' }}>
                                <Text type="success">
                                  <CheckCircleOutlined /> Scanned: <b>{policeCertFile.name}</b>
                                </Text>
                                <Button type="link" danger size="small" onClick={() => setPoliceCertFile(null)}>
                                  Clear & Rescan
                                </Button>
                              </div>
                            )}

                          </Space>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                )}

              <Divider orientation="left">Pass Validity limit</Divider>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="expectedExitDate" label="Valid Until Date">
                      <DatePicker 
                        size="large" 
                        style={{ width: '100%' }} 
                        format="YYYY-MM-DD"
                        disabledDate={(current) => current && current < dayjs().startOf('day')} // Pazhaiya date-ah select panna mudiyathu
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="expectedExitTime" label="Valid Until Time">
                      <TimePicker 
                        format="HH:mm" 
                        size="large" 
                        style={{ width: '100%' }} 
                        use12Hours 
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left">Visit Information</Divider>
                <Row gutter={16}>
                  <Col span={12}><Form.Item name="host" label="Host / Department" rules={[{ required: true }]}><Input placeholder="Who are they visiting?" size="large" /></Form.Item></Col>
                  <Col span={12}>
                    <Form.Item 
                      name="purpose" 
                      label="Purpose of Visit" 
                      rules={[{ required: true, message: 'Please select or type the purpose' }]}
                    >
                      <Select 
                        mode="tags" 
                        placeholder="Select or type purpose" 
                        size="large"
                        showSearch
                        style={{ width: '100%' }}
                      >
                        {purposeOptions.map(opt => (
                          <Option key={opt.value} value={opt.value}>
                            {opt.value}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Row gutter={16}>
                  {/* 1. ESCORT NAME FIELD */}
          <Col xs={24} sm={12} md={12}> {/* 👈 இங்க md={12} னு மாத்துங்க */}
            <Form.Item name="escort" label="Escort Name">
              <Input 
                prefix={<UserAddOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="Enter Escort Name" 
              />
            </Form.Item>
          </Col>

          {/* 2. MOBILE LOCKER FIELD */}
          <Col xs={24} sm={12} md={12}> {/* 👈 இங்கயும் md={12} னு மாத்துங்க */}
            <Form.Item name="mobile_locker" label="Mobile Locker No">
              <Input 
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="Enter Locker Number (e.g., L-15)" 
                maxLength={20}
              />
            </Form.Item>
          </Col>
                  
                </Row>
                 <Col xs={24} sm={12} md={12}>
            <Form.Item name="escort_rank" label="Escort Rank">
              <Input 
                prefix={<StarOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="Enter Escort Rank (e.g., Commander, Petty Officer)" 
              />
            </Form.Item>
          </Col>

          {/* 🚀 PUTHU CODE: ESCORT NUMBER */}
          <Col xs={24} sm={12} md={12}>
            <Form.Item name="escort_number" label="Escort ID / Number">
              <Input 
                prefix={<IdcardOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="Enter Escort Number" 
              />
            </Form.Item>
          </Col>



                </Row>
                
                {isRfidEnabled && (
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item name="rfidTag" label="RFID Card Number">
                        <Input placeholder="Scan or type RFID Tag ID" size="large" prefix={<ScanOutlined />} />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                <Divider orientation="left"><Space><CarOutlined /> Vehicle Information</Space></Divider>
                <Form.Item><Space><Switch checked={hasVehicle} onChange={setHasVehicle} /><Text>Entering with Vehicle?</Text></Space></Form.Item>

                {hasVehicle && (
                  <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    <Row gutter={16}>
                      <Col span={8}><Form.Item name="vehicleType" label="Type"><Select><Option value="2-Wheeler">2-Wheeler</Option><Option value="4-Wheeler">4-Wheeler</Option><Option value="8-Wheeler">8-Wheeler</Option></Select></Form.Item></Col>
                      <Col span={8}><Form.Item name="vehicleNumber" label="Number"><Input style={{ textTransform: 'uppercase' }} /></Form.Item></Col>
                    </Row>
                  </div>
                )}

                <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" size="large" block loading={submitting} style={{ height: 50, fontSize: '16px' }}>
                    Generate Gate Pass
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Right Column: Photo & Biometric */}
          <Col xs={24} lg={10}>
            <Card title="Identity Verification" bordered={false} style={{ borderRadius: 8, marginBottom: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {cameraError ? (
                  <Result status="warning" title="Camera Access Denied" icon={<WarningOutlined />} />
                ) : !photoPreview ? (
                  <>
                    <div style={{ width: '100%', maxWidth: 320, borderRadius: 8, overflow: 'hidden', border: '2px solid #d9d9d9', background: '#000' }}>
                      <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" onUserMedia={() => setIsCameraReady(true)} onUserMediaError={() => setCameraError(true)} style={{ width: '100%', display: 'block' }} />
                    </div>
                    <Button type="primary" icon={<CameraOutlined />} onClick={capturePhoto} size="large" disabled={!isCameraReady} style={{ marginTop: 16, width: '100%' }}>Capture Photo</Button>
                  </>
                ) : (
                  <>
                    <img src={photoPreview} alt="Visitor" style={{ width: '100%', maxWidth: 320, borderRadius: 8, border: '2px solid #52c41a' }} />
                    <Button icon={<ReloadOutlined />} onClick={() => setPhotoPreview(null)} style={{ marginTop: 16, width: '100%' }}>Retake Photo</Button>
                  </>
                )}
              </div>
            </Card>

            {isBiometricRequired && (
              <Card 
                title={<Space><ScanOutlined style={{ color: '#1890ff' }} /> Biometric Enrollment</Space>} 
                bordered={false} 
                style={{ borderRadius: 8, marginTop: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              >
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  {fingerprintFile ? (
                    <Result 
                      status="success" 
                      title="Fingerprint Captured Successfully" 
                      subTitle="Biometric data is encrypted and ready for visitor entry."
                      style={{ padding: '0' }}
                    />
                  ) : (
                    <>
                      <ScanOutlined 
                        style={{ 
                          fontSize: 72, 
                          color: isBiometricScanning ? '#1890ff' : '#d9d9d9',
                          transition: 'color 0.3s'
                        }} 
                      />
                      
                      <Title level={5} style={{ marginTop: 16, color: isBiometricScanning ? '#1890ff' : '#595959' }}>
                        {isBiometricScanning ? "Scanning in progress..." : "Place finger firmly on scanner"}
                      </Title>
                      
                      {isBiometricScanning && (
                        <Progress 
                          percent={100} 
                          status="active" 
                          showInfo={false} 
                          strokeColor="#1890ff"
                          style={{ padding: '0 20px', marginBottom: 16 }} 
                        />
                      )}
                      
                      <Button 
                        type={isBiometricScanning ? "default" : "primary"} 
                        onClick={searchByFingerprint} 
                        block 
                        disabled={isBiometricScanning} 
                        icon={<ScanOutlined />}
                        style={{ marginTop: 10, maxWidth: 300 }}
                      >
                        {isBiometricScanning ? "Calibrating & Scanning..." : "Start Biometric Scan"}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
              
            )}

            {generatedPass && (
              <Card style={{ marginTop: 24, background: '#e6f7ff', textAlign: 'center', borderColor: '#91d5ff' }}>
                <Title level={4} style={{ color: '#0050b3' }}>Pass Ready: {generatedPass.visitId}</Title>
                <Space>
                  <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint} size="large">Print Pass</Button>
                  <Button onClick={resetFlow} size="large">New Entry</Button>
                </Space>
              </Card>
            )}
          </Col>
        </Row>
      </div>

      {/* 🚀 NEW THERMAL PRINTER LAYOUT (INS ASVINI STYLE) */}
      {generatedPass && (
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
                {generatedPass.photo ? (
                  <img src={generatedPass.photo} alt="Visitor" className="pass-photo-img" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                    <UserOutlined style={{ fontSize: '40px', color: '#ccc' }} />
                  </div>
                )}
              </div>
              <div className="pass-qr-wrapper">
                <QRCodeSVG value={generatedPass.visitId} size={90} level="M" includeMargin={false} />
               
              </div>
               <div style={{ marginTop: '5px', fontSize: '11px', fontWeight: 'bold', color: '#0a1930' }}>
                    S.No: {generatedPass.id}
                  </div>
            </div>

            {/* Details Table Section */}
            <div className="pass-details-box">
              <div className="pass-detail-row">
                <div className="pass-icon"><UserOutlined /></div>
                <div className="pass-label">VISITOR NAME</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{generatedPass.name}</div>
              </div>
              <div className="pass-detail-row">
                <div className="pass-icon"><IdcardOutlined /></div>
                <div className="pass-label">ID PROOF NO.</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{generatedPass.idNumber}</div>
              </div>
              <div className="pass-detail-row">
                <div className="pass-icon"><PhoneOutlined /></div>
                <div className="pass-label">CONTACT NO.</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{generatedPass.phone}</div>
              </div>
              <div className="pass-detail-row">
                <div className="pass-icon"><ProfileOutlined /></div>
                <div className="pass-label">PURPOSE OF VISIT</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{generatedPass.purpose}</div>
              </div>
              <div className="pass-detail-row">
                <div className="pass-icon"><TeamOutlined /></div>
                <div className="pass-label">PERSON TO MEET</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{generatedPass.host}</div>
              </div>
              
             
              {generatedPass.mobile_locker && generatedPass.mobile_locker.trim() !== '' && (
                      <div className="pass-detail-row">
                        <div className="pass-icon"><LockOutlined /></div>
                        <div className="pass-label">MOBILE LOCKER</div>
                        <div className="pass-colon">:</div>
                        <div className="pass-value dotted-underline" style={{ fontWeight: 'bold' }}>
                          {generatedPass.mobile_locker}
                        </div>
                      </div>
                    )}

              


              {generatedPass.escort && generatedPass.escort !== 'N/A' && generatedPass.escort.trim() !== '' && (
                <div className="pass-detail-row">
                  <div className="pass-icon"><UserAddOutlined /></div>
                  <div className="pass-label">ESCORT DETAILS</div>
                  <div className="pass-colon">:</div>
                  <div className="pass-value dotted-underline" style={{ textTransform: 'capitalize' }}>
                    {generatedPass.escort_rank ? <span style={{ fontWeight: 'bold', marginRight: '4px' }}>{generatedPass.escort_rank}</span> : null}
                    {generatedPass.escort}
                    {generatedPass.escort_number ? <span style={{ textTransform: 'uppercase', marginLeft: '4px' }}>(ID: {generatedPass.escort_number})</span> : null}
                  </div>
                </div>
              )}
                    
              
              {generatedPass.vehicleNumber && (
                <div className="pass-detail-row">
                  <div className="pass-icon"><CarOutlined /></div>
                  <div className="pass-label">VEHICLE NO.</div>
                  <div className="pass-colon">:</div>
                  <div className="pass-value dotted-underline" style={{ textTransform: 'uppercase' }}>
                    {generatedPass.vehicleNumber}
                  </div>
                </div>
              )}
              <div className="pass-detail-row">
                <div className="pass-icon"><CalendarOutlined /></div>
                <div className="pass-label">ISSUED ON</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{generatedPass.date} {generatedPass.entryTime}</div>
              </div>
              <div className="pass-detail-row">
                <div className="pass-icon"><CalendarOutlined /></div>
                <div className="pass-label">EXPIRES ON</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline">{generatedPass.expDateDisplay} {generatedPass.expTimeDisplay}</div>
              </div>
              <div className="pass-detail-row" style={{ borderBottom: 'none' }}>
                <div className="pass-icon"><SafetyCertificateOutlined /></div>
                <div className="pass-label">PASS NO.</div>
                <div className="pass-colon">:</div>
                <div className="pass-value dotted-underline"><strong>{generatedPass.visitId}</strong></div>
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
      {/* 🚀 PUDHU UI: Group Member Add Modal (With Camera) */}
      <Modal
        title={<Space><UserAddOutlined /> Add Accompanying Person</Space>}
        open={isGroupModalVisible}
        onCancel={() => {
          setIsGroupModalVisible(false);
          setTempMemberName('');
          setTempMemberPhoto(null); // Close pannum pothu photo clear aaganum
        }}
        onOk={handleAddMember}
        okText="Add to Group"
        okButtonProps={{ 
          disabled: !tempMemberName || !tempMemberPhoto, // Rendum irundha thaan Add button on aagum
          style: { background: tempMemberName && tempMemberPhoto ? '#52c41a' : '', borderColor: tempMemberName && tempMemberPhoto ? '#52c41a' : '' }
        }}
        destroyOnClose
      >
        <div style={{ marginBottom: 16, marginTop: 10 }}>
          <Text strong>Full Name <span style={{color: 'red'}}>*</span></Text>
          <Input 
            size="large"
            value={tempMemberName} 
            onChange={(e) => setTempMemberName(e.target.value)} 
            placeholder="Enter member's full name" 
            style={{ marginTop: 8 }}
          />
        </div>

        {/* 📸 CAMERA SECTION */}
        <div>
          <Text strong>Capture Photo <span style={{color: 'red'}}>*</span></Text>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f5f5f5', padding: '10px', borderRadius: '8px' }}>
            
            {!tempMemberPhoto ? (
              <>
                <Webcam 
                  audio={false} 
                  ref={groupWebcamRef} 
                  screenshotFormat="image/jpeg" 
                  style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', border: '1px solid #d9d9d9' }} 
                />
                <Button type="primary" icon={<CameraOutlined />} onClick={captureGroupMemberPhoto} style={{ marginTop: 16 }}>
                  Capture Member Photo
                </Button>
              </>
            ) : (
              <>
                <img src={tempMemberPhoto} alt="Captured" style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', border: '2px solid #52c41a' }} />
                <Button icon={<ReloadOutlined />} onClick={() => setTempMemberPhoto(null)} style={{ marginTop: 16 }}>
                  Retake Photo
                </Button>
              </>
            )}

          </div>
        </div>
      </Modal>
      {/* 👇 🚀 THE DYNAMIC STANDALONE QR DOWNLOAD POPUP MODAL */}
      <Modal
        title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} /> Contractor Registration Success</Space>}
        open={isQrModalVisible}
        onCancel={() => { setIsQrModalVisible(false); resetFlow(); }}
        footer={[
          <Button key="close" onClick={() => { setIsQrModalVisible(false); resetFlow(); }}>Close & Reset</Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={downloadQrCode} style={{ background: '#52c41a', borderColor: '#52c41a' }}>Download QR Code</Button>
        ]}
        destroyOnClose
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Text strong style={{ fontSize: '18px', display: 'block', marginBottom: '8px' }}>
            {qrDownloadData?.name.toUpperCase()}
          </Text>
          <Text type="secondary" style={{ fontSize: '15px', display: 'block', marginBottom: '24px' }}>
            Pass ID: <b>{qrDownloadData?.visitId}</b>
          </Text>

          {/* Standalone SVG QR box container matrix mapping layout */}
          <div style={{ background: '#fff', padding: '16px', display: 'inline-block', borderRadius: '12px', border: '1px solid #e8e8e8', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <QRCodeSVG 
              id="pvc-downloadable-qr"
              value={qrDownloadData?.visitId || ''} 
              size={200} 
              level="H" 
              includeMargin={true} 
            />
          </div>
          <p style={{ marginTop: '16px', color: '#8c8c8c', fontStyle: 'italic' }}>
            Click download to save the QR pass as PNG onto your local system stack.
          </p>
        </div>
      </Modal>
    </div>
  );
}




