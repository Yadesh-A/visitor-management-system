from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Visitor, VisitorLog, GroupVisitor

# Translator for User (to show who handled the visitor)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

# Translator for the Visitor's Personal Details
class VisitorSerializer(serializers.ModelSerializer):
    

    class Meta:
        model = Visitor
        fields = ['id', 'name', 'phone', 'id_type', 'id_number', 'photo', 'id_proof_document', 'status', 'created_at','visitor_type']
# Translator for the Visit Record (The Log)

class GroupVisitorSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupVisitor
        fields = ['name', 'photo']

        
class VisitorLogSerializer(serializers.ModelSerializer):
    # 🆕 Add these custom fields for the formatted display
    entry_time_display = serializers.SerializerMethodField()
    exit_time_display = serializers.SerializerMethodField()
    
    visitor_details = VisitorSerializer(source='visitor', read_only=True)
    user_details = UserSerializer(source='user', read_only=True)
    group_members = GroupVisitorSerializer(many=True, read_only=True)

    class Meta:
        model = VisitorLog
        # 🆕 Make sure to include the new display fields in the list
        fields = [
            'id', 'visit_id', 'visitor', 'visitor_details', 'user', 'user_details',
            'host', 'purpose', 'status', 'visit_date', 
            'entry_time', 'entry_time_display', # Both raw and formatted
            'exit_time', 'exit_time_display',
            'escort','mobile_locker','escort_rank','escort_number',
            'police_verification_document',
            'group_members',
            'expected_exit_date', 'expected_exit_time', 
            'vehicle_type', 'vehicle_number', 'rfid_tag', 'blacklist_reason', 'created_at'
        ]
        extra_kwargs = {
            'visitor': {'required': False},
            'user': {'required': False} # 🛡️ Stop it from crashing if user is missing
        }

    # 🕒 Convert 13:45:00 -> 01:45 PM
    def get_entry_time_display(self, obj):
        if obj.entry_time:
            return obj.entry_time.strftime("%I:%M %p")
        return None

    # 🕒 Convert 13:45:00 -> 01:45 PM
    def get_exit_time_display(self, obj):
        if obj.exit_time:
            return obj.exit_time.strftime("%I:%M %p")
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        data = request.data
        
        # 1. Get the identifying details from React
        phone = data.get('phone')
        id_number = data.get('id_number') or data.get('idNumber')
        fingerprint_data = self.initial_data.get('fingerprint')
        
        # 🆕 PUTHU CODE: Extract the ID Proof PDF/Image from the request
        id_proof_file = request.FILES.get('id_proof_document')
        v_type = data.get('visitor_type', 'NORMAL')

        # 2. Look for an existing visitor using Phone OR ID Number
        visitor = Visitor.objects.filter(phone=phone).first() or \
                  Visitor.objects.filter(id_number=id_number).first()

        # 3. Update their details if found, or create new if not
        if visitor:
            visitor.name = data.get('name', visitor.name)
            visitor.id_type = data.get('id_type') or data.get('idType') or visitor.id_type
            visitor.visitor_type = v_type

            # Only update photo if a new one was actually uploaded
            if request.FILES.get('photo'):
                visitor.photo = request.FILES.get('photo')
            
            if fingerprint_data:
                visitor.fingerprint_data = fingerprint_data
                
            # 🆕 PUTHU CODE: Update the ID proof document if a new one is uploaded
            if id_proof_file:
                visitor.id_proof_document = id_proof_file
                
            visitor.save()
        else:
            visitor = Visitor.objects.create(
                name=data.get('name'),
                phone=phone,
                id_type=data.get('id_type') or data.get('idType'),
                id_number=id_number,
                photo=request.FILES.get('photo'),
                fingerprint_data=fingerprint_data,
                # 🆕 PUTHU CODE: Save the ID proof document for a new visitor
                id_proof_document=id_proof_file,
                visitor_type=v_type
            )

        # 4. Attach the Admin User safely
        admin_user = request.user if request.user.is_authenticated else None

        
        # 5. Create the Log entry
       # 5. Create the Log entry (return-க்கு பதிலா 'log =' என்று மாத்தியாச்சு)
        log = VisitorLog.objects.create(
            visitor=visitor,
            user=admin_user, 
            status="REGISTERED",
            exit_time=None,
            **validated_data
        )
        import json
        import base64
        from django.core.files.base import ContentFile
        from .models import GroupVisitor

        group_data = request.data.get('group_members_data')
        if group_data:
            try:
                members = json.loads(group_data)
                for member in members:
                    name = member.get('name')
                    photo_data = member.get('photo')

                    group_visitor = GroupVisitor(parent_log=log, name=name)

                    if photo_data:
                        # Case 1: Pudhu aatkal (Webcam Base64)
                        if photo_data.startswith('data:image'):
                            format, imgstr = photo_data.split(';base64,')
                            ext = format.split('/')[-1]
                            group_visitor.photo.save(f"{name}_group.{ext}", ContentFile(base64.b64decode(imgstr)), save=False)
                        
                        # Case 2: Pazhaya aatkal (Auto-loaded URL)
                        elif photo_data.startswith('http') or photo_data.startswith('/media'):
                            try:
                                file_path = photo_data.split('/media/')[-1]
                                group_visitor.photo.name = file_path 
                            except Exception as e:
                                print(f"Error extracting path from URL: {e}")

                    group_visitor.save()
            except Exception as e:
                print(f"Group members save error: {e}")

        return log 