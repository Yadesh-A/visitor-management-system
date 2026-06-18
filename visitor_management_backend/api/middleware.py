from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

class DjangoVMSAuthorizer:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 🛡️ API paths-ah mattum Authorizer check pannanum (Login thavira)
        if request.path.startswith('/api/') and not request.path.startswith('/api/login/') and not request.path.startswith('/api/token/refresh/'):
            try:
                # JWT Authentication trigger panrom
                authenticator = JWTAuthentication()
                auth_result = authenticator.authenticate(request)

                if auth_result is not None:
                    user, token = auth_result
                    request.user = user  # Valid user-ah request-la set panrom
                else:
                    return JsonResponse({'error': 'Authorizer: Missing Bearer Token'}, status=401)
            
            except (AuthenticationFailed, Exception) as e:
                return JsonResponse({'error': f'Authorizer: Access Denied ({str(e)})'}, status=401)

        # Token ok na, response-ah adutha logic-kku anuppum
        response = self.get_response(request)
        return response