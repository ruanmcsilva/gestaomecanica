# loja/serializers.py

from rest_framework import serializers
from .models import Fornecedor, GrupoPeca, Peca, Cliente, Moto, Servico, ItemServicoPeca, MovimentacaoEstoque, FotoServico
from django.contrib.auth.models import User


class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fornecedor
        fields = '__all__'


class GrupoPecaSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrupoPeca
        fields = '__all__'

class PecaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Peca
        fields = '__all__'

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'


class MotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Moto
        fields = '__all__'


class ItemServicoPecaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemServicoPeca
        # CORRIGIDO: Use o nome correto do campo do modelo
        fields = ['id', 'servico', 'peca', 'quantidade_utilizada', 'valor_unitario_na_epoca']

class FotoServicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoServico
        fields = ['id', 'foto', 'descricao', 'data_upload']
        read_only_fields = ['data_upload']

class ServicoSerializer(serializers.ModelSerializer):
    itens_servico_peca = ItemServicoPecaSerializer(many=True, read_only=True)
    fotos = FotoServicoSerializer(many=True, read_only=True)

    class Meta:
        model = Servico
        fields = [
            'id', 'cliente', 'moto', 'descricao', 'data_inicio', 'data_fim',
            'status', 'valor_mao_de_obra', 'observacoes', 'responsavel',
            'kilometragem', 'valor_total_pecas', 'valor_total_servico', 'itens_servico_peca', 'fotos'
        ]
        read_only_fields = ['data_inicio', 'valor_total_pecas', 'valor_total_servico', 'responsavel']


class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimentacaoEstoque
        fields = '__all__'
        read_only_fields = ['data_movimentacao']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user