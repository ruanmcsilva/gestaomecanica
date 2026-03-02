from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions

# Configuração da documentação Swagger/OpenAPI
schema_view = get_schema_view(
    openapi.Info(
        title="API Mecânica de Motos",
        default_version='v1',
        description="Documentação da API RESTful para gestão de mecânica de motos.",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="seu-email@dominio.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # URL da sua app 'loja'
    path('api/v1/', include('loja.urls')),
    
    # URLs de Token Refresh (para renovar o token JWT)
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # URLs da documentação
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

# NOVO: Serve arquivos de mídia durante o desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)