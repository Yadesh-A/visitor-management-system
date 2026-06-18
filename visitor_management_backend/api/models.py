from django.db import models
from django.contrib.auth.models import User
import random
import string
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync




# 🛡️ PUTHU CODE: Role define pandrathukku
class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('ADMIN', 'Administrator / Front Desk'),
        ('SECURITY', 'Security Guard'),
        ('USER', 'Normal User'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='SECURITY')

    def __str__(self):
        return f"{self.user.username} - {self.role}"

# Signal to auto-create profile when a new User is created in Django Admin
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

# 👤 VISITOR MODEL (PERSONAL DETAILS)
class Visitor(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, unique=True)

    id_type = models.CharField(max_length=50)
    id_number = models.CharField(max_length=50, unique=True)
    visitor_type = models.CharField(max_length=20, default='NORMAL')

    # Saved to: project_folder/media/visitors/photos/
    photo = models.ImageField(upload_to='visitors/photos/', null=True, blank=True)
    
    # Saved to: project_folder/media/visitors/fingerprints/
    # Using FileField automatically handles the "path" storage in the DB
    fingerprint_data = models.TextField(null=True, blank=True) 
    id_proof_document = models.FileField(upload_to='id_proofs/', null=True, blank=True)
    status = models.CharField(max_length=20, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    

    def __str__(self):
        return self.name


# 📜 VISITOR LOG MODEL (VISIT HISTORY)
def get_current_time():
    return timezone.localtime(timezone.now()).time()

class VisitorLog(models.Model):
    visit_id = models.CharField(max_length=20,editable=False)

    visitor = models.ForeignKey(
        Visitor,
        on_delete=models.CASCADE,
        related_name="logs"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="handled_logs"
    )

    host = models.CharField(max_length=100)
    purpose = models.TextField()
    status = models.CharField(max_length=20, default="REGISTERED")
    escort = models.CharField(max_length=100, null=True, blank=True)
    escort_rank = models.CharField(max_length=50, blank=True, null=True)
    escort_number = models.CharField(max_length=50, blank=True, null=True)

    visit_date = models.DateField(auto_now_add=True)
    entry_time = models.TimeField(default=get_current_time) 
    exit_time = models.TimeField(null=True, blank=True)
    expected_exit_date = models.DateField(null=True, blank=True)
    expected_exit_time = models.TimeField(null=True, blank=True)
    mobile_locker = models.CharField(max_length=50, blank=True, null=True)
    vehicle_type = models.CharField(max_length=50, null=True, blank=True)
    vehicle_number = models.CharField(max_length=20, null=True, blank=True)
    rfid_tag = models.CharField(max_length=50, null=True, blank=True)
    police_verification_document = models.FileField(upload_to='police_certs/', null=True, blank=True)
    blacklist_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class meta:
        ordering=['-id']
        
    def save(self, *args, **kwargs):
        if not self.visit_id:
            # Generate a unique ID (Example: VISIT-A1B2C3)
            self.visit_id = self.generate_unique_visit_id()
        super(VisitorLog, self).save(*args, **kwargs)

    def generate_unique_visit_id(self):
        # Create a random 6-character alphanumeric string
        length = 6
        while True:
            random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
            new_id = f"VISIT-{random_str}"
            # Check if this ID already exists in the database
            if not VisitorLog.objects.filter(visit_id=new_id).exists():
                return new_id

    def __str__(self):
        return self.visit_id
    
# ... unga existing code ...

@receiver(post_save, sender=VisitorLog)
def notify_dashboard(sender, instance, created, **kwargs):
    # Send only if it's a NEW entry (created=True) 
    # Or if you want update, you can keep it as is.
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'dashboard_updates',
            {
                'type': 'send_dashboard_update',
                'message': 'update_required'
            }
        )
    except Exception as e:
        print(f"Signal Error: {e}")


class GroupVisitor(models.Model):
    parent_log = models.ForeignKey(VisitorLog, on_delete=models.CASCADE, related_name="group_members")
    
    name = models.CharField(max_length=100)
    # 🚀 PUDHU CODE: Fingerprint-ah thookkitu Photo add panniyachu
    photo = models.ImageField(upload_to='group_visitors/photos/', null=True, blank=True) 
    
    # Future use-kaga (Ippo empty-ah irukkum)
    id_type = models.CharField(max_length=50, null=True, blank=True)
    id_proof_document = models.FileField(upload_to='group_id_proofs/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Group of {self.parent_log.visit_id})"