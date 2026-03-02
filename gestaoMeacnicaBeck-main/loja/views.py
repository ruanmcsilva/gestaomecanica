# loja/views.py
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination

from django_filters.rest_framework import DjangoFilterBackend

from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML, CSS
from django.db.models import Sum
from datetime import datetime
from decimal import Decimal

from .models import (
    Fornecedor, GrupoPeca, Peca, Cliente, Moto, Servico, ItemServicoPeca, MovimentacaoEstoque, FotoServico
)
from .serializers import (
    FornecedorSerializer, GrupoPecaSerializer, PecaSerializer, ClienteSerializer, MotoSerializer,
    ServicoSerializer, ItemServicoPecaSerializer, MovimentacaoEstoqueSerializer, UserSerializer, FotoServicoSerializer
)

# --- Autenticação e Registro ---

class CustomTokenObtainPairView(TokenObtainPairView):
    pass

class RegisterView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    serializer_class = UserSerializer

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        token_serializer = TokenObtainPairSerializer(data={'username': user.username, 'password': request.data['password']})
        token_serializer.is_valid(raise_exception=True)
        
        return Response({
            "user": UserSerializer(user).data,
            "message": "Usuário registrado com sucesso.",
            "token": token_serializer.validated_data
        }, status=status.HTTP_201_CREATED)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sessao(request):
    """
    Retorna os dados do usuário autenticado.
    """
    user_data = {
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
    }
    return Response(user_data)

# ===================================================================================
# Endpoint para Relatório Financeiro
# ===================================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_report(request):
    """
    Gera um relatório financeiro resumido por mês e ano.
    Parâmetros de query: ?mes=MM&ano=AAAA
    """
    mes = request.query_params.get('mes')
    ano = request.query_params.get('ano')

    if not mes or not ano:
        return Response(
            {"erro": "Mês e ano são obrigatórios como parâmetros de query (ex: ?mes=07&ano=2025)."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        mes = int(mes)
        ano = int(ano)
    except ValueError:
        return Response(
            {"erro": "Mês e ano devem ser números válidos."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    servicos_concluidos = Servico.objects.filter(
        status='CONCLUIDO',
        data_inicio__year=ano,
        data_inicio__month=mes
    )

    total_mao_de_obra = servicos_concluidos.aggregate(Sum('valor_mao_de_obra'))['valor_mao_de_obra__sum']
    total_mao_de_obra = total_mao_de_obra if total_mao_de_obra is not None else Decimal('0.00')
    
    total_pecas_receita = Decimal('0.00')
    total_custo_pecas = Decimal('0.00')

    for servico in servicos_concluidos:
        for item_peca in servico.itens_servico_peca.all():
            valor_unitario = Decimal(str(item_peca.valor_unitario_na_epoca)) if isinstance(item_peca.valor_unitario_na_epoca, (float, str)) else item_peca.valor_unitario_na_epoca
            total_pecas_receita += Decimal(item_peca.quantidade_utilizada) * valor_unitario
            
            if item_peca.peca and item_peca.peca.preco_custo is not None:
                preco_custo = Decimal(str(item_peca.peca.preco_custo)) if isinstance(item_peca.peca.preco_custo, (float, str)) else item_peca.peca.preco_custo
                total_custo_pecas += Decimal(item_peca.quantidade_utilizada) * preco_custo
    
    total_receita_bruta = total_mao_de_obra + total_pecas_receita
    total_lucro_bruto = total_receita_bruta - total_custo_pecas
    
    return Response({
        "mes": mes,
        "ano": ano,
        "servicos_concluidos_count": servicos_concluidos.count(),
        "total_mao_de_obra": round(total_mao_de_obra, 2),
        "total_pecas_receita": round(total_pecas_receita, 2),
        "total_custo_pecas": round(total_custo_pecas, 2),
        "total_receita_bruta": round(total_receita_bruta, 2),
        "total_lucro_bruto": round(total_lucro_bruto, 2),
    }, status=status.HTTP_200_OK)

# ===================================================================================
# Endpoints para o Dashboard
# ===================================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def services_in_progress_count(request):
    """
    Retorna a contagem de serviços com status 'EM_ANDAMENTO'.
    """
    count = Servico.objects.filter(status='EM_ANDAMENTO').count()
    return Response({"count": count}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def low_stock_parts_count(request):
    """
    Retorna a contagem de peças com quantidade em estoque abaixo de um limite (ex: 5).
    """
    LOW_STOCK_LIMIT = 5
    count = Peca.objects.filter(quantidade_em_estoque__lte=LOW_STOCK_LIMIT).count()
    return Response({"count": count}, status=status.HTTP_200_OK)

# ===================================================================================
# NOVO: Endpoint para Histórico do Cliente
# ===================================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_history(request, pk=None):
    """
    Retorna o histórico de serviços de um cliente específico.
    A URL será /api/v1/clientes/{id}/historico/.
    """
    try:
        # CORRIGIDO: Usa o nome de variável correto 'cliente'
        cliente = Cliente.objects.get(pk=pk)
    except Cliente.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    # Busca todos os serviços do cliente, ordenados pela data de início
    # CORRIGIDO: Usa o nome de variável correto 'cliente'
    servicos_cliente = Servico.objects.filter(cliente=cliente).order_by('-data_inicio')

    servicos_serializados = []
    for servico in servicos_cliente:
        servico_data = {
            'id': servico.id,
            'data_inicio': servico.data_inicio.strftime('%Y-%m-%d'),
            'status': servico.status,
            'kilometragem': servico.kilometragem,
            'descricao': servico.descricao,
            'valor_mao_de_obra': float(servico.valor_mao_de_obra) if servico.valor_mao_de_obra is not None else 0,
            'valor_total_servico': float(servico.valor_total_servico) if servico.valor_total_servico is not None else 0,
            'moto': servico.moto.placa if servico.moto else 'N/A',
            'itens_peca': []
        }
        
        for item_peca in servico.itens_servico_peca.all():
            peca_data = {
                'nome_peca': item_peca.peca.nome if item_peca.peca else 'Peça removida',
                'quantidade': item_peca.quantidade_utilizada,
                'valor_unitario': float(item_peca.valor_unitario_na_epoca)
            }
            servico_data['itens_peca'].append(peca_data)
            
        servicos_serializados.append(servico_data)
        
    return Response(servicos_serializados, status=status.HTTP_200_OK)


# --- ViewSets para os Modelos ---

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

class GrupoPecaViewSet(viewsets.ModelViewSet):
    queryset = GrupoPeca.objects.all()
    serializer_class = GrupoPecaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

class PecaViewSet(viewsets.ModelViewSet):
    queryset = Peca.objects.all()
    serializer_class = PecaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome', 'descricao', 'numero_serie']
    pagination_class = StandardResultsSetPagination

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome', 'email', 'cpf_cnpj']
    pagination_class = StandardResultsSetPagination

class MotoViewSet(viewsets.ModelViewSet):
    queryset = Moto.objects.all()
    serializer_class = MotoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['modelo', 'placa']
    pagination_class = StandardResultsSetPagination

class ItemServicoPecaViewSet(viewsets.ModelViewSet):
    queryset = ItemServicoPeca.objects.all()
    serializer_class = ItemServicoPecaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    @transaction.atomic
    def perform_create(self, serializer):
        item_servico_peca = serializer.save()
        peca = item_servico_peca.peca
        quantidade_utilizada = item_servico_peca.quantidade_utilizada
        
        if peca.quantidade_em_estoque < quantidade_utilizada:
            raise serializers.ValidationError("Quantidade em estoque insuficiente para esta peça.")
        
        peca.quantidade_em_estoque -= quantidade_utilizada
        peca.save()

        MovimentacaoEstoque.objects.create(
            peca=peca,
            tipo_movimentacao='SAIDA',
            quantidade=quantidade_utilizada,
            usuario_responsavel=self.request.user,
            origem_destino=f"Uso em Serviço {item_servico_peca.servico.id}",
            servico_relacionado=item_servico_peca.servico
        )

    @transaction.atomic
    def perform_update(self, serializer):
        old_item_servico_peca = self.get_object()
        new_item_servico_peca = serializer.save()
        
        peca = new_item_servico_peca.peca
        old_quantidade = old_item_servico_peca.quantidade_utilizada
        new_quantidade = new_item_servico_peca.quantidade_utilizada
        
        diferenca = new_quantidade - old_quantidade

        if diferenca > 0 and peca.quantidade_em_estoque < diferenca:
            raise serializers.ValidationError("Quantidade em estoque insuficiente para aumentar o uso desta peça.")
        
        peca.quantidade_em_estoque -= diferenca
        peca.save()

        MovimentacaoEstoque.objects.create(
            peca=peca,
            tipo_movimentacao='AJUSTE',
            quantidade=diferenca,
            usuario_responsavel=self.request.user,
            origem_destino=f"Ajuste em Serviço {new_item_servico_peca.servico.id}",
            servico_relacionado=new_item_servico_peca.servico
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        peca = instance.peca
        
        if instance.tipo_movimentacao == 'ENTRADA':
            if peca.quantidade_em_estoque < instance.quantidade:
                raise serializers.ValidationError("Não é possível reverter: estoque ficaria negativo.")
            peca.quantidade_em_estoque -= instance.quantidade
        elif instance.tipo_movimentacao == 'SAIDA':
            peca.quantidade_em_estoque += instance.quantidade
        elif instance.tipo_movimentacao == 'AJUSTE':
            peca.quantidade_em_estoque -= instance.quantidade
        
        peca.save()
        instance.delete()


class ServicoViewSet(viewsets.ModelViewSet):
    queryset = Servico.objects.all()
    serializer_class = ServicoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['descricao', 'observacoes'] 
    filterset_fields = ['status']
    pagination_class = StandardResultsSetPagination 

    def perform_create(self, serializer):
        serializer.save(responsavel=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(responsavel=self.request.user)

    @action(detail=True, methods=['get'])
    def imprimir_os(self, request, pk=None):
        servico = self.get_object()
        
        context = {
            'servico': servico,
            'cliente': servico.cliente,
            'moto': servico.moto,
            'itens': servico.itens_servico_peca.all(),
        }
        
        html_string = render_to_string('loja/os.html', context)
        
        html = HTML(string=html_string, base_url=request.build_absolute_uri())
        pdf = html.write_pdf()
        
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="os_{servico.id}.pdf"'
        return response
    
class FotoServicoViewSet(viewsets.ModelViewSet):
    queryset = FotoServico.objects.all()
    serializer_class = FotoServicoSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(servico=Servico.objects.get(id=self.request.data['servico']))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sessao(request):
    """
    Retorna os dados do usuário autenticado.
    """
    user_data = {
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
    }
    return Response(user_data)


class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    queryset = MovimentacaoEstoque.objects.all()
    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    @transaction.atomic
    def perform_create(self, serializer):
        movimentacao = serializer.save(usuario_responsavel=self.request.user)
        peca = movimentacao.peca
        
        if movimentacao.tipo_movimentacao == 'ENTRADA':
            peca.quantidade_em_estoque += movimentacao.quantidade
        elif movimentacao.tipo_movimentacao == 'SAIDA':
            if peca.quantidade_em_estoque < movimentacao.quantidade:
                raise serializers.ValidationError("Quantidade em estoque insuficiente para esta saída.")
            peca.quantidade_em_estoque -= movimentacao.quantidade
        elif movimentacao.tipo_movimentacao == 'AJUSTE':
            peca.quantidade_em_estoque += movimentacao.quantidade
        
        peca.save()

    @transaction.atomic
    def perform_update(self, serializer):
        old_movimentacao = self.get_object()
        new_movimentacao = serializer.save(usuario_responsavel=self.request.user)
        
        peca = new_movimentacao.peca
        
        if old_movimentacao.tipo_movimentacao == 'ENTRADA':
            peca.quantidade_em_estoque -= old_movimentacao.quantidade
        elif old_movimentacao.tipo_movimentacao == 'SAIDA':
            peca.quantidade_em_estoque += old_movimentacao.quantidade
        elif old_movimentacao.tipo_movimentacao == 'AJUSTE':
            peca.quantidade_em_estoque -= old_movimentacao.quantidade
        
        if new_movimentacao.tipo_movimentacao == 'ENTRADA':
            peca.quantidade_em_estoque += new_movimentacao.quantidade
        elif new_movimentacao.tipo_movimentacao == 'SAIDA':
            if peca.quantidade_em_estoque < new_movimentacao.quantidade:
                raise serializers.ValidationError("Quantidade em estoque insuficiente para esta saída.")
            peca.quantidade_em_estoque -= new_movimentacao.quantidade
        elif new_movimentacao.tipo_movimentacao == 'AJUSTE':
            peca.quantidade_em_estoque += new_movimentacao.quantidade
        
        peca.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        peca = instance.peca
        
        if instance.tipo_movimentacao == 'ENTRADA':
            if peca.quantidade_em_estoque < instance.quantidade:
                raise serializers.ValidationError("Não é possível reverter: estoque ficaria negativo.")
            peca.quantidade_em_estoque -= instance.quantidade
        elif instance.tipo_movimentacao == 'SAIDA':
            peca.quantidade_em_estoque += instance.quantidade
        elif instance.tipo_movimentacao == 'AJUSTE':
            peca.quantidade_em_estoque -= instance.quantidade
        
        peca.save()
        instance.delete()