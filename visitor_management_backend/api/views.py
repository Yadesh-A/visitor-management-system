from rest_framework import viewsets, status ,filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import Visitor, VisitorLog
from rest_framework.permissions import IsAuthenticated
from .serializers import VisitorSerializer, VisitorLogSerializer
from rest_framework import serializers
from django.db import models
import requests
import json
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Q


# 🛡️ PUTHU CODE: Login pannumbodhu Token kooda 'role'-ah anuppa
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # User-oda role-ah eduthu JSON response-la add panrom
        try:
            data['role'] = self.user.profile.role
        except Exception:
            data['role'] = 'SECURITY' # Default fallback
            
        data['username'] = self.user.username
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_settings_pwd(request):
    input_password = request.data.get('password')
    MASTER_PASSWORD = "ven-123"  # Inga unga secret password-ah maathikalam

    if input_password == MASTER_PASSWORD:
        return Response({"message": "Access Granted"}, status=status.HTTP_200_OK)
    
    return Response({"error": "Invalid Password"}, status=status.HTTP_401_UNAUTHORIZED)


class VisitorViewSet(viewsets.ModelViewSet):
    queryset = Visitor.objects.all().order_by('-created_at')
    serializer_class = VisitorSerializer
   
    permission_classes = [IsAuthenticated]

    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'phone', 'id_number']
    # Logic for VisitorRegistration.jsx (onSearch function)


    # 🔍 Corrected Views Search Method
    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        query = request.query_params.get('q', None)
        if query:
            # 1. First try to find by RFID Log
            rfid_log = VisitorLog.objects.filter(rfid_tag=query).order_by('-created_at').first()
            
            # 2. Try to find by Visitor attributes
            visitor = Visitor.objects.filter(phone=query).first() or \
                      Visitor.objects.filter(id_number=query).first()
            
            # If RFID log found, use that visitor
            if rfid_log:
                visitor = rfid_log.visitor

            if visitor:
                # 🆕 GET THE LATEST STATUS FROM LOGS
                latest_log = VisitorLog.objects.filter(visitor=visitor).order_by('-created_at').first()
                
                serializer = self.get_serializer(visitor)
                data = serializer.data
                
                # Add status manually
                data['status'] = latest_log.status if latest_log else 'NEW'
                data['blacklist_reason'] = latest_log.blacklist_reason if latest_log else ''
                data['visitor_detils']=serializer.data
                
                if latest_log:
                    data['expected_exit_date'] = latest_log.expected_exit_date
                    data['expected_exit_time'] = latest_log.expected_exit_time
                    data['expected_exit_date'] = None
                    data['expected_exit_time'] = None
                    data['visit_id'] = latest_log.visit_id
                else:
                    data['expected_exit_date']=None
                    data['expected_exit_time']=None
                    data['visit_id']=None


                return Response(data)
        
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='verify-fingerprint')
    def verify_fingerprint(self, request):
        scanned_fingerprint = request.data.get('fingerprint')

        print(f"\n--- 🚀 VERIFY FINGERPRINT CALLED ---")
        print(f"1. Scanned Fingerprint Length: {len(str(scanned_fingerprint))}")

        if not scanned_fingerprint:
            print("❌ ERROR: No scanned fingerprint provided by React")
            return Response({"error": "No fingerprint provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Database-la fingerprint irukkira ellam visitors-aiyum filter panrom
        visitors = Visitor.objects.exclude(
            models.Q(fingerprint_data__isnull=True) | models.Q(fingerprint_data__exact='')
        )
        
        print(f"2. Total Visitors with Fingerprints in DB: {visitors.count()}")

        if visitors.count() == 0:
            print("⚠️ WARNING: No visitors found with fingerprint data in the database!")
            return Response({"message": "Fingerprint not found in database"}, status=status.HTTP_404_NOT_FOUND)

        for visitor in visitors:
            try:
                print(f"3. Sending Match Request for Visitor: {visitor.name} (Phone: {visitor.phone})")
                
                
                exact_payload = json.dumps({
                    "probe": scanned_fingerprint,
                    "gallery": visitor.fingerprint_data
                }, separators=(',', ':'))

                match_response = requests.post(
                    'http://127.0.0.1:11100/match',
                    data=exact_payload,  # json= kku bathila data= use panrom
                    headers={'Content-Type': 'application/json'},
                    timeout=3
                )

                if match_response.status_code == 200:
                    result = match_response.json()
                    
                    # Ippo Bridge enna bathil solluthu nu thelivaa print aagum
                    print(f"4. Match Result for {visitor.name} -> {result}")
                    
                    if result.get('success') and result.get('matched'):
                        print(f"✅ MATCH FOUND! Sending details for {visitor.name}")
                        serializer = self.get_serializer(visitor)
                        
                        # Serializer data-வை dict ஆ மாத்துறோம் (அப்போதான் புது டேட்டா ஆட் பண்ண முடியும்)
                        response_data = dict(serializer.data)

                        # 🚀 PUTHU CODE: குரூப் மெம்பர்களை எடுக்கிறோம்
                        from .models import VisitorLog
                        latest_log = VisitorLog.objects.filter(visitor=visitor).order_by('-id').first()
                        
                        last_group_members = []
                        if latest_log:
                            group_records = latest_log.group_members.all()
                            for member in group_records:
                                last_group_members.append({
                                    'name': member.name,
                                    'photo': request.build_absolute_uri(member.photo.url) if member.photo else None
                                })
                        
                        # ரெஸ்பான்ஸ்ல last_group_members-ஐ சேர்த்து அனுப்புறோம்
                        response_data['last_group_members'] = last_group_members

                        return Response(response_data, status=status.HTTP_200_OK)



            except requests.exceptions.RequestException as e:
                print(f"❌ Bridge Connection Error: {e}")
                return Response({"error": ".NET Bridge is not running for matching."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        print("🛑 Loop finished. No match found.")
        return Response({"message": "Fingerprint not found in database"}, status=status.HTTP_404_NOT_FOUND)

from rest_framework.pagination import PageNumberPagination

# 🚀 PUTHU FIX: ஒரு பேஜுக்கு 10 டேட்டா மட்டுமே அனுப்பும் செட்டிங்
class InOutPagination(PageNumberPagination):
    page_size = 10  # 👈 கட்டாயமாக 10 டேட்டா மட்டுமே வரும்
    page_size_query_param = 'page_size'
    max_page_size = 100


from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

@method_decorator(csrf_exempt, name='dispatch')
class VisitorLogViewSet(viewsets.ModelViewSet):
    queryset = VisitorLog.objects.all().order_by('-created_at')
    serializer_class = VisitorLogSerializer
    pagination_class = InOutPagination
    permission_classes = [IsAuthenticated]
    
    filter_backends = [filters.SearchFilter]
    search_fields = ['visit_id', 'visitor__name', 'visitor__phone','rfid_tag']


    def perform_create(self, serializer):
        from django.db.models import Q
        from .models import VisitorLog 
        import json

        phone = self.request.data.get('phone')
        id_number = self.request.data.get('id_number')

        # Phone illa ID number irundhaal mattum check pannanum (Safety condition)
        if phone or id_number:
            # 1. 🛡️ PERMANENT BLACKLIST CHECK
            is_blacklisted = VisitorLog.objects.filter(
                Q(visitor__phone=phone) | Q(visitor__id_number=id_number), 
                status='BLACKLISTED'
            ).exists()

            if is_blacklisted:
                last_entry = VisitorLog.objects.filter(
                    Q(visitor__phone=phone) | Q(visitor__id_number=id_number), 
                    status='BLACKLISTED'
                ).first()
                
                reason = last_entry.blacklist_reason if last_entry and last_entry.blacklist_reason else "Security risk."
                raise serializers.ValidationError({
                    "error": f"Access Denied: This individual is permanently blacklisted. Reason: {reason}"
                })

            # 2. 🛑 ALREADY INSIDE CHECK
            is_already_in = VisitorLog.objects.filter(
                Q(visitor__phone=phone) | Q(visitor__id_number=id_number), 
                status='IN'
            ).exists()

            if is_already_in:
                raise serializers.ValidationError({
                    "error": "This visitor is already inside. Checkout required before re-entry."
                })
        
        # 3. Save the Main Log
        log_instance = serializer.save()

        # 4. 🚀 PUDHU LOGIC: Group Members
       # 3. Save the Main Log
        log_instance = serializer.save()

        # 4. 🚀 PUDHU LOGIC: Group Members
        group_data_str = self.request.data.get('group_members_data')
        
        if group_data_str:
            try:
                from .models import GroupVisitor
                import base64
                from django.core.files.base import ContentFile
                import json
                
                group_members = json.loads(group_data_str)
                
                for member in group_members:
                    if member.get('name'):
                        # React-la irundhu vara base64 string-ah edukkuroam
                        photo_data = member.get('photo') 
                        photo_file = None
                        
                        # Base64 string irundhaal mattum idhu run aagum
                        if photo_data and ';base64,' in photo_data:
                            format, imgstr = photo_data.split(';base64,') 
                            ext = format.split('/')[-1]  # .jpeg or .png kandupidikka
                            
                            safe_name = member.get('name').replace(' ', '_')
                            file_name = f"{safe_name}_{log_instance.visit_id}.{ext}"
                        
                            photo_file = ContentFile(base64.b64decode(imgstr), name=file_name)

                        # Final-aaga DB-la save pandrom
                        GroupVisitor.objects.create(
                            parent_log=log_instance,
                            name=member.get('name'),
                            photo=photo_file  # 👈 Mela convert panna file inga pass aagum
                        )
                        
            except json.JSONDecodeError:
                raise serializers.ValidationError({"error": "Invalid group members data format."})
            except Exception as e:
                raise serializers.ValidationError({"error": f"Failed to save group members: {str(e)}"})
    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def dashboard_stats(self, request):
        today = timezone.now().date()
        
        # 1. Stats calculation (Optimized)
        total_history = VisitorLog.objects.count()
        today_count = VisitorLog.objects.filter(visit_date=today).count()
        
        active_vehicles = VisitorLog.objects.filter(status='IN').exclude(
            models.Q(vehicle_number__isnull=True) | models.Q(vehicle_number__exact='')
        ).count()
        
        # 2. 🛡️ SELECT_RELATED FIX: Intha 'select_related' thaan 'KeyError: visitor'-ah thadukkum
        # Ithu 'Visitor' details-ah sethu fetch pannum, athanala performance fast-ah irukkum
        recent_logs = VisitorLog.objects.select_related('visitor').all().order_by('-created_at')[:7]
        
        # 3. Serializing with context
        recent_logs_data = self.get_serializer(recent_logs, many=True).data

        # 4. Final Response
        return Response({
            "stats": {
                "today": today_count,
                "month": total_history,
                "activeVehicles": active_vehicles
            },
            "recent_logs": recent_logs_data
        })

    def get_queryset(self):
        queryset = VisitorLog.objects.all().order_by('-visit_date', '-entry_time')
        
        # 1. Search Filter (Already iruntha ithu thevai illai)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(visitor__name__icontains=search) | 
                Q(visitor__phone__icontains=search) |
                Q(visit_id__icontains=search) |
                Q(rfid_tag__icontains=search)
            )

        # 2. 📅 Date Filter Logic (Idhuthaan namakku ippo thevai)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)

        if start_date and end_date:
            queryset = queryset.filter(visit_date__range=[start_date, end_date])
            
        return queryset
    

    # Logic for VisitorExit.jsx & VisitorLog.jsx (onBlacklist function)
    @action(detail=False, methods=['post'])
    def blacklist(self, request):
        visit_id = request.data.get('visitId')
        reason = request.data.get('reason')
        
        log = VisitorLog.objects.filter(visit_id=visit_id).first()
        
        if log:
            dangerous_visitor = log.visitor
            
            # 🛡️ IDENTITY-AH FLAG PANROM:
            # Indha aaloda history-la ulla ellaa logs-aiyum 'BLACKLISTED' nu mathunaal thaan
            # thirumba varum pothu 'perform_create' moolama kandu pidikka mudiyum.
            VisitorLog.objects.filter(visitor=dangerous_visitor).update(
                status='BLACKLISTED',
                blacklist_reason=reason
            )
            
            # (Optional) Visitor table-la status field irundhaadhaiyum update pannalaam
            # dangerous_visitor.status = 'BLACKLISTED'
            # dangerous_visitor.save()
            
            return Response({
                'status': 'Visitor blacklisted', 
                'message': f'Permanent blacklist applied for {dangerous_visitor.name}.'
            })
            
        return Response({'error': 'Log entry not found'}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=False, methods=['post'])
    def checkin(self, request):
        visit_id = request.data.get('visitId') # Matches React frontend key
        # 🚀 FIX 2: .get() kku badhila .first() podrom
        log = VisitorLog.objects.filter(visit_id=visit_id).order_by('-created_at').first()
        
        if log:
            log.status = 'IN'
            log.exit_time = None
            log.save()
            return Response({'status': 'Checked in successfully'}, status=status.HTTP_200_OK)
        
        return Response({'error': 'Invalid Visit ID'}, status=status.HTTP_400_BAD_REQUEST)

    # --- 2. Check-OUT Action (One function only) ---
    @action(detail=False, methods=['post'])
    def checkout(self, request):
        visit_id = request.data.get('visitId')
        # 🚀 FIX 3: .get() kku badhila .first() podrom
        log = VisitorLog.objects.filter(visit_id=visit_id).order_by('-created_at').first()
        
        if log:
            log.status = 'OUT'
            log.exit_time = timezone.localtime(timezone.now()).time()
            log.save()
            return Response({'status': 'Checked out successfully'}, status=status.HTTP_200_OK)
            
        return Response({'error': 'Active visit not found'}, status=status.HTTP_400_BAD_REQUEST)


    # 🚀 PUDHU CODE: Unblacklist API (User role-kku mattum)
    @action(detail=False, methods=['post'])
    def unblacklist(self, request):
        visit_id = request.data.get('visitId')
        input_password = request.data.get('password')
        MASTER_PASSWORD = "admin123" 
        
        if input_password != MASTER_PASSWORD:
            return Response({'error': 'Incorrect Security Password!'}, status=status.HTTP_401_UNAUTHORIZED)
            
        log = VisitorLog.objects.filter(visit_id=visit_id).first()
        
        if log:
            dangerous_visitor = log.visitor
            # Visitor-oda ellaa log-aiyum INSIDE/OUT nu maathi block-ah edukkurom
            VisitorLog.objects.filter(visitor=dangerous_visitor, status='BLACKLISTED').update(
                status='OUT', 
                blacklist_reason=None
            )
            return Response({'message': f'{dangerous_visitor.name} has been successfully UNBLOCKED.'})
            
        return Response({'error': 'Log entry not found'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def reentry(self, request):
        visit_id = request.data.get('visitId')
        
        if not visit_id:
            return Response({'error': 'Visit ID is required. Please scan again.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            old_log = VisitorLog.objects.filter(visit_id=visit_id).order_by('-created_at').first()

            if not old_log:
                return Response({'error': 'Invalid Pass. Record not found in database.'}, status=status.HTTP_404_NOT_FOUND)

            # Prevent Blacklisted visitors from entering
            latest_active_visitor_log = VisitorLog.objects.filter(visitor=old_log.visitor).order_by('-created_at').first()
            if latest_active_visitor_log and latest_active_visitor_log.status == 'BLACKLISTED':
                return Response({'error': 'SECURITY ALERT: Visitor status is blacklisted!'}, status=status.HTTP_403_FORBIDDEN)

            # 🚀 400 ERROR ADIKKIRA ANTHA STRICT CHECK-AH INGA THOOKITOM! 
            # 🚀 STRAIGHT-AAGA ENTRY ALLOW PANDROM

            if old_log.visitor.visitor_type == 'LONG_TERM':
                # Create NEW ROW for Contractor
                new_multi_log_row = VisitorLog.objects.create(
                    visitor=old_log.visitor,
                    user=request.user if request.user.is_authenticated else None,
                    host=old_log.host,
                    purpose=old_log.purpose,
                    status='IN', 
                    entry_time=timezone.localtime(timezone.now()).time(),
                    exit_time=None,
                    expected_exit_date=old_log.expected_exit_date,
                    expected_exit_time=old_log.expected_exit_time,
                    vehicle_type=old_log.vehicle_type,
                    vehicle_number=old_log.vehicle_number,
                    rfid_tag=old_log.rfid_tag,
                    police_verification_document=old_log.police_verification_document
                )
                
                new_multi_log_row.visit_id = old_log.visit_id
                new_multi_log_row.save()
                
                return Response({
                    'message': f'Welcome back contractor: {old_log.visitor.name}',
                    'status': 'IN'
                }, status=status.HTTP_200_OK)
            
            else:
                # Update existing row for Normal Visitor
                old_log.status = "IN"
                old_log.exit_time = None 
                old_log.save()
                return Response({
                    'message': f'Re-Entry successful for short term normal visitor: {old_log.visitor.name}',
                    'status': old_log.status
                }, status=status.HTTP_200_OK)

        except Exception as e:
            # Terminal-la thelivaa error print aaga
            import traceback
            print(f"REENTRY CRASH TRACE: {traceback.format_exc()}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def purposes(self, request):
        query = request.query_params.get('search', '')
        
        # 1. VisitorLog table-la irunthu match aagura purposes-ah edukkum
        # 2. .distinct() use panni duplicate-ah thavir kkum
        # 3. .values('purpose') nu kudutha namma frontend-kku thevaiyana format kidaikkum
        purposes = VisitorLog.objects.filter(
            purpose__icontains=query
        ).values('purpose').distinct()[:10] # Top 10 results mattum
        
        # Intha response React-oda handlePurposeSearch-kku pogoam
        return Response(list(purposes))


# 🆕 NEW: Scanner Trigger Logic
    @action(detail=False, methods=['post'], url_path='trigger-scan')
    def trigger_scan(self, request):
        import uuid
        import base64
        import os
        import tempfile
        import pythoncom

        pythoncom.CoInitialize()

        try:
            import win32com.client
            print("✅ win32com imported OK")
        except ImportError as e:
            print(f"❌ win32com import failed: {e}")
            return Response({
                "success": False,
                "error": "pywin32 is not installed in this environment. Run: pip install pywin32"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            import win32com.client

            # ── 1. Connect to WIA Device Manager ──
            wia = win32com.client.Dispatch("WIA.DeviceManager")
            devices = wia.DeviceInfos

            print(f"🖨️ Total WIA devices found: {devices.Count}")

            if devices.Count == 0:
                return Response({
                    "success": False,
                    "error": "No scanner found. Check USB connection and make sure HP Smart Tank is powered on."
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # ── 2. Connect to the first available scanner ──
            # If you have multiple devices, loop through devices to find HP
            device = None
            for info in devices:
                device_name = ""
                device_type = None
                for prop in info.Properties:
                    if prop.Name == "Name":
                        device_name = prop.Value
                    if prop.Name == "Device Type":
                        device_type = prop.Value
                print(f"  → Device: '{device_name}' | Type: {device_type}")
                if 'USB' in device_name:  # 1 = Scanner
                    device = info.Connect()
                    print(f"  ✅ Selected: {device_name}")
                    break
                if device is None:
                    device = info.Connect()  # fallback to first device

            if device is None:
                return Response({   
                    "success": False,
                    "error": "Could not connect to any scanner."
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # ── 3. Get the scanner item (flatbed) ──
            scanner_item = None
            for item in device.Items:
                scanner_item = item
                break  # Take the first item (flatbed)

            if scanner_item is None:
                return Response({
                    "success": False,
                    "error": "Scanner connected but no scan items found."
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # ── 4. Configure scan settings via WIA property IDs ──
            # Property ID reference:
            #   4103 = Horizontal Resolution (DPI)
            #   4104 = Vertical Resolution (DPI)
            #   4105 = Horizontal Extent (pixels)
            #   4106 = Vertical Extent (pixels)
            #   6146 = Data Type  (1 = Color, 2 = Grayscale, 0 = BW)
            #   6147 = Bits Per Pixel (24 = Color, 8 = Gray)

            def set_wia_property(item, prop_id, value):
                try:
                    for prop in item.Properties:
                        if prop.PropertyID == prop_id:
                            prop.Value = value
                            print(f"  ✅ Property {prop_id} set to {value}")
                            return
                    print(f"  ⚠️ Property {prop_id} not found (skipping)")
                except Exception as e:
                    print(f"  ⚠️ Could not set property {prop_id}: {e}")

            set_wia_property(scanner_item, 4103, 200)   # Horizontal DPI
            set_wia_property(scanner_item, 4104, 200)   # Vertical DPI
            set_wia_property(scanner_item, 6146, 1)     # Color mode (1 = RGB Color)
            set_wia_property(scanner_item, 6147, 24)    # 24-bit color

            # ── 5. Perform the scan ──
            # JPEG Format GUID for WIA transfer
            JPEG_FORMAT_GUID = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"
            print("📄 Starting scan transfer...")

            image = scanner_item.Transfer(JPEG_FORMAT_GUID)

            # ── 6. Save to a temp file, read it back ──
            temp_path = os.path.join(tempfile.gettempdir(), f"scan_{uuid.uuid4().hex[:8]}.jpg")
            image.SaveFile(temp_path)
            print(f"✅ Scan saved to temp: {temp_path}")

            with open(temp_path, "rb") as f:
                encoded_img = base64.b64encode(f.read()).decode('utf-8')

            # Clean up temp file
            os.remove(temp_path)

            return Response({
                "success": True,
                "temp_file_name": f"scanned_id_{uuid.uuid4().hex[:6]}.jpg",
                "file_data": encoded_img
            })

        except ImportError:
            return Response({
                "success": False,
                "error": "pywin32 is not installed. Run: pip install pywin32"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            import traceback
            print(f"FULL ERROR:\n{traceback.format_exc()}")
            return Response({
                "success": False,
                "error": f"Scanner error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        finally:
            pythoncom.CoUninitialize()