# loja/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FornecedorViewSet, GrupoPecaViewSet, PecaViewSet, ClienteViewSet, MotoViewSet,
    ItemServicoPecaViewSet, ServicoViewSet, MovimentacaoEstoqueViewSet,
    CustomTokenObtainPairView, RegisterView
, FotoServicoViewSet, get_sessao, financial_report, services_in_progress_count, low_stock_parts_count, client_history

)

# Crie um roteador e registre suas ViewSets com ele.
router = DefaultRouter()
router.register(r'fornecedores', FornecedorViewSet)
router.register(r'grupos', GrupoPecaViewSet)
router.register(r'pecas', PecaViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'motos', MotoViewSet)
router.register(r'servicos', ServicoViewSet)
router.register(r'itens-servico', ItemServicoPecaViewSet)
router.register(r'movimentacoes', MovimentacaoEstoqueViewSet)
router.register(r'fotos', FotoServicoViewSet)

# O URLconf da sua app agora é determinado automaticamente pelo roteador.
urlpatterns = [
    # Rotas de Autenticação e Registro
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('register/', RegisterView.as_view({'post': 'create'}), name='auth_register'),
    path('sessao/', get_sessao, name='sessao'),
    path('relatorio-financeiro/', financial_report , name= 'financial_report'),
    path('dashboard/services-in-progress/', services_in_progress_count, name='services_in_progress_count'),
    path('dashboard/low-stock-parts/', low_stock_parts_count, name='low_stock_parts_count'),
    path('clientes/<int:pk>/historico/', client_history, name='client_history'),
    
    # Adicione as URLs do roteador
    path('', include(router.urls)),
]
urlpatterns += router.urls