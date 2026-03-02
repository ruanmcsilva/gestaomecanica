# loja/models.py

from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal


class Fornecedor(models.Model):
    nome = models.CharField(max_length=255)
    contato = models.CharField(max_length=255, blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    def __str__(self):
        return self.nome

class GrupoPeca(models.Model):
    nome = models.CharField(max_length=255, unique=True)
    descricao = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nome

class Peca(models.Model):
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True, null=True)
    numero_serie = models.CharField(max_length=100, unique=True, blank=True, null=True)
    preco_custo = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    preco_venda = models.DecimalField(max_digits=10, decimal_places=2)
    grupo = models.ForeignKey(GrupoPeca, on_delete=models.SET_NULL, null=True, blank=True)
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.SET_NULL, null=True, blank=True)
    quantidade_em_estoque = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.nome

class Cliente(models.Model):
    nome = models.CharField(max_length=255)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    cpf_cnpj = models.CharField(max_length=20, unique=True, blank=True, null=True)
    endereco = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.nome

class Moto(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='motos')
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    ano = models.IntegerField(blank=True, null=True)
    placa = models.CharField(max_length=10, unique=True)
    observacoes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.placa})"

class Servico(models.Model):
    STATUS_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('EM_ANDAMENTO', 'Em Andamento'),
        ('CONCLUIDO', 'Concluído'),
        ('CANCELADO', 'Cancelado'),
    ]

    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, blank=True)
    moto = models.ForeignKey(Moto, on_delete=models.SET_NULL, null=True, blank=True)
    descricao = models.TextField()
    data_inicio = models.DateTimeField(auto_now_add=True)
    data_fim = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDENTE')
    valor_mao_de_obra = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    observacoes = models.TextField(blank=True, null=True)
    responsavel = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)


    kilometragem = models.IntegerField(
        verbose_name="Quilometragem",
        help_text="Quilometragem do veículo no momento do serviço."
    )

    @property
    def valor_total_pecas(self):
        return sum(item.valor_total_item for item in self.itens_servico_peca.all())

    @property
    def valor_total_servico(self):
        return self.valor_mao_de_obra + self.valor_total_pecas

    def __str__(self):
        return f"Serviço {self.id} - {self.moto.placa if self.moto else 'N/A'} - {self.status}"

class ItemServicoPeca(models.Model):
    servico = models.ForeignKey(Servico, on_delete=models.CASCADE, related_name='itens_servico_peca')
    peca = models.ForeignKey(Peca, on_delete=models.CASCADE)
    quantidade_utilizada = models.PositiveIntegerField(default=1)
    valor_unitario_na_epoca = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def valor_total_item(self):
        return self.quantidade_utilizada * self.valor_unitario_na_epoca

    def __str__(self):
        return f"{self.quantidade_utilizada}x {self.peca.nome if self.peca else 'Peca Deletada'} em Serviço {self.servico.id}"

class MovimentacaoEstoque(models.Model):
    TIPO_MOVIMENTACAO_CHOICES =[
        ('ENTRADA', 'Entrada'),
        ('SAIDA', 'Saída'),
        ('AJUSTE', 'Ajuste'),
    ]

    peca = models.ForeignKey(Peca, on_delete=models.CASCADE, related_name='movimentacoes')
    tipo_movimentacao = models.CharField(max_length=10, choices=TIPO_MOVIMENTACAO_CHOICES)
    quantidade = models.IntegerField()
    data_movimentacao = models.DateTimeField(auto_now_add=True)
    usuario_responsavel = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    origem_destino = models.CharField(max_length=255, blank=True, null=True)
    servico_relacionado = models.ForeignKey(Servico, on_delete=models.SET_NULL, null=True, blank=True)



    def __str__(self):
        return f"{self.tipo_movimentacao} de {self.quantidade} {self.peca.nome if self.peca else 'Peca Deletada'} em {self.data_movimentacao.strftime('%Y-%m-%d %H:%M')}"

# NOVO MODELO PARA FOTOS
class FotoServico(models.Model):
    servico = models.ForeignKey(Servico, related_name='fotos', on_delete=models.CASCADE)
    foto = models.ImageField(upload_to='fotos_servicos/') # Certifique-se de ter Pillow instalado (pip install Pillow)
    descricao = models.CharField(max_length=255, blank=True, null=True)
    data_upload = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Foto de Serviço #{self.servico.id}"