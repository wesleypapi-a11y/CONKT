import { useState, useEffect } from 'react';
import { FileText, Save } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { ClientProduct, ProductType, PlanoStartCategory, ProductStatus } from '../../types/client';
import { Client } from '../../types/client';

interface ClientProdutoTabProps {
  clientId: string | null;
  client: Partial<Client>;
  onNavigateHome?: () => void;
}

const PRODUCT_TYPES: ProductType[] = [
  'Plano Start',
  'Acompanhamento de obra'
];

const PLANO_CATEGORIES: PlanoStartCategory[] = [
  'Bronze',
  'Prata',
  'Ouro',
  'Diamante',
  'Personalizado'
];

const PAYMENT_METHODS = [
  'À vista',
  'Parcelado',
  'Boleto',
  'Cartão de crédito',
  'Cartão de débito',
  'PIX',
  'Transferência bancária'
];

export default function ClientProdutoTab({ clientId, client}: ClientProdutoTabProps) {
  const [product, setProduct] = useState<Partial<ClientProduct>>({
    product_type: 'Acompanhamento de obra',
    status: 'ativo',
    installments: 1
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasProduct, setHasProduct] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadProduct();
    }
  }, [clientId]);

  const loadProduct = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_products')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProduct(data);
        setHasProduct(true);
      } else {
        setHasProduct(false);
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clientId) {
      alert('Salve o cliente primeiro');
      return;
    }

    if (!product.product_type) {
      alert('Selecione um tipo de produto');
      return;
    }

    if (product.product_type === 'Plano Start' && !product.plano_category) {
      alert('Selecione uma categoria do Plano Start');
      return;
    }

    setSaving(true);
    try {
      const productData = {
        ...product,
        client_id: clientId,
        updated_at: new Date().toISOString()
      };

      if (hasProduct && product.id) {
        const { error } = await supabase
          .from('client_products')
          .update(productData)
          .eq('id', product.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('client_products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setProduct(data);
          setHasProduct(true);
        }
      }

      alert('Produto salvo com sucesso!');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateContract = () => {
    if (!hasProduct || !product.product_type) {
      alert('Salve o produto primeiro');
      return;
    }

    const contractHTML = generateContractHTML();

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      alert('Erro ao gerar contrato');
      return;
    }

    iframeDoc.open();
    iframeDoc.write(contractHTML);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  const generateContractHTML = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (product.product_type === 'Acompanhamento de obra') {
      return generateAcompanhamentoContract(dateStr);
    } else {
      return generatePlanoStartContract(dateStr);
    }
  };

  const generateAcompanhamentoContract = (dateStr: string) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contrato de Acompanhamento de Obra</title>
  <style>
    @page { margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #333; }
    h1 { text-align: center; font-size: 16pt; margin-bottom: 20px; }
    h2 { font-size: 13pt; margin-top: 20px; margin-bottom: 10px; }
    .section { margin-bottom: 15px; }
    .data-box { border: 1px solid #333; padding: 15px; margin: 15px 0; }
    .clause { margin: 15px 0; }
    .signatures { margin-top: 40px; display: flex; justify-content: space-around; }
    .signature-line { border-top: 1px solid #333; width: 200px; padding-top: 5px; text-align: center; }
  </style>
</head>
<body>
  <h1>CONTRATO DE ADMINISTRAÇÃO E GESTÃO DE OBRA</h1>

  <div class="data-box">
    <h2>DADOS DO CONTRATANTE</h2>
    <p><strong>Nome:</strong> ${client.name || '__________________'}</p>
    <p><strong>Nacionalidade:</strong> ${client.nationality || '__________________'}</p>
    <p><strong>Estado Civil:</strong> ${client.marital_status || '__________________'}</p>
    <p><strong>Profissão:</strong> ${client.profession || '__________________'}</p>
    <p><strong>CPF:</strong> ${client.cpf_cnpj || '__________________'}</p>
    <p><strong>Endereço:</strong> ${client.address ? `${client.address}, ${client.number || 'S/N'}` : '__________________'}</p>
  </div>

  <div class="data-box">
    <h2>DADOS DO CONTRATADO</h2>
    <p><strong>Nome:</strong> GESTÃO ARCO - Gerenciamento de obras e projetos LTDA</p>
    <p><strong>CNPJ:</strong> 54.248.657/0001-00</p>
    <p><strong>Endereço:</strong> AV. Alfredo Ignácio Nogueira Penido, 335 Sala 706 - CEP 12246-000</p>
    <p><strong>E-mail:</strong> financeiro@arco.com.br</p>
  </div>

  <div class="clause">
    <h2>CLÁUSULA 1 – DO OBJETO</h2>
    <p><strong>1.1</strong> O objeto deste contrato é a prestação de serviços de administração e gestão técnica de obra residencial localizada no <strong>${product.obra_address || '__________________'}</strong>, conforme projetos fornecidos pelo CONTRATANTE e aprovados junto à Prefeitura Municipal.</p>

    <p><strong>1.2</strong> A gestão contratada compreende as seguintes frentes de atuação:</p>

    <p><strong>Gestão Executiva:</strong></p>
    <ol>
      <li>Apresentação de relatórios de acompanhamento e registro de ocorrências;</li>
      <li>Gestão do cronograma de tarefas e controle do progresso da obra;</li>
      <li>Fiscalização e validação de entregas de fornecedores conforme padrão técnico;</li>
      <li>Apoio técnico ao cliente na tomada de decisões estratégicas durante a execução da obra.</li>
    </ol>

    <p><strong>Gestão de Planejamento:</strong></p>
    <ol>
      <li>Elaboração do cronograma base com datas previstas de início e término das atividades principais;</li>
      <li>Planejamento de recursos com definição das datas para contratação de serviços, fornecimento de materiais e alocação de equipamentos;</li>
      <li>Definição de metas e objetivos de curto prazo (PPC);</li>
      <li>Monitoramento de riscos e gestão de mudanças, com registros documentados.</li>
    </ol>

    <p><strong>Gestão Financeira:</strong></p>
    <ol>
      <li>Elaboração e acompanhamento do orçamento base;</li>
      <li>Controle de custos mensais com comparativo orçado x realizado;</li>
      <li>Levantamento financeiro periódico para planejamento de pagamentos futuros;</li>
      <li>Apresentação de relatórios financeiros de acompanhamento, com atualização de saldo da obra e previsões futuras.</li>
    </ol>
  </div>

  <div class="clause">
    <h2>CLÁUSULA 2 – DAS OBRIGAÇÕES DO CONTRATADO</h2>
    <p><strong>2.1</strong> O CONTRATADO compromete-se a executar os serviços descritos na Cláusula 1 deste contrato, observando os princípios da boa técnica, ética profissional, e normas vigentes aplicáveis.</p>
    <p><strong>2.2</strong> São obrigações do CONTRATADO:</p>
    <ol>
      <li>Emitir ART de responsabilidade técnica pela execução da obra;</li>
      <li>Supervisionar a obra com base nos projetos fornecidos;</li>
      <li>Realizar três cotações para materiais e serviços, exceto materiais de uso frequente;</li>
      <li>Elaborar relatórios técnicos e financeiros (orçado x realizado);</li>
      <li>Intermediar conflitos entre contratante e fornecedores com base técnica;</li>
      <li>Elaborar e acompanhar cronogramas físico-financeiros e medições;</li>
      <li>Orientar tecnicamente fornecedores e prestadores;</li>
      <li>Acompanhar definições de projeto e acabamentos;</li>
      <li>Elaborar o manual do proprietário;</li>
      <li>Concluir a gestão com entrega técnica documentada e formalização da ocupação do imóvel.</li>
    </ol>
  </div>

  <div class="clause">
    <h2>CLÁUSULA 3 – LIMITAÇÃO DE RESPONSABILIDADE</h2>
    <p><strong>3.1</strong> Não é responsabilidade do CONTRATADO:</p>
    <ul>
      <li>Execução de qualquer mão de obra;</li>
      <li>Garantia de serviços prestados por terceiros;</li>
      <li>Retrabalhos causados por terceiros ou por mudanças de escopo do cliente;</li>
      <li>Compatibilização de projetos não fornecidos, ou fornecidos fora do prazo;</li>
      <li>Alterações no cronograma por falta de definições do cliente ou atraso expressivo do terceirizado;</li>
      <li>Perdas decorrentes de escolhas feitas sem aprovação do nosso corpo técnico;</li>
      <li>Danos ou reparos que precisem ser feitos por algum terceirizado.</li>
    </ul>
  </div>

  <div class="clause">
    <h2>CLÁUSULA 4 – DO PRAZO</h2>
    <p><strong>4.1</strong> O prazo estimado é de <strong>${product.duration_months || '___'}</strong> meses, podendo ser prorrogado conforme necessário.</p>
    <p><strong>4.2</strong> A contagem se inicia com o início da obra.</p>
    <p><strong>4.3</strong> Ocorrendo paralisações por causas justificadas, o cronograma será readequado entre as partes.</p>
  </div>

  <div class="clause">
    <h2>CLÁUSULA 5 – DOS VALORES</h2>
    <p><strong>5.1</strong> O valor da gestão é de <strong>R$ ${product.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '__________'}</strong>, pagos em <strong>${product.installments || '___'}</strong> parcelas mensais.</p>
    <p><strong>5.2</strong> Pagamento através de <strong>${product.payment_method || '__________'}</strong> na conta do CONTRATADO:</p>
    <p>Banco Itaú – Ag. XXXXX – CC XXXXXX-X</p>
    <p>Pix: XXXXXX</p>
  </div>

  <div class="clause">
    <h2>CLÁUSULA 6 – TERMOS ESPECÍFICOS</h2>
    <p><strong>6.1</strong> O CONTRATANTE autoriza o CONTRATADO a tomar decisões técnicas emergenciais até o limite de R$ 5.000,00 sem necessidade de aprovação prévia, para melhor andamento, segurança e cumprimento das atividades.</p>
    <p><strong>6.2</strong> A ocupação do imóvel pelo CONTRATANTE caracterizará entrega da obra e encerramento da responsabilidade do CONTRATADO.</p>
    <p><strong>6.3</strong> Pendências estéticas serão listadas em ata ou relatório, com prazo definido para finalização.</p>
    <p><strong>6.4</strong> Será incluída no orçamento uma reserva técnica de 3% para ajustes e correções comuns à obra.</p>
    <p><strong>6.5</strong> O CONTRATANTE reconhece que a obra pode apresentar desvios de até 10% do orçamento inicial, desde que devidamente apontados.</p>
    <p><strong>6.6</strong> Variações inflacionárias durante a execução poderão impactar os custos, com previsão de 5% a 8%, conforme prazo da obra e economia de mercado.</p>
  </div>

  <div class="clause">
    <h2>CLÁUSULA 7 – DAS OBRIGAÇÕES DO CONTRATANTE</h2>
    <p><strong>7.1</strong> São obrigações do CONTRATANTE:</p>
    <ol>
      <li>Fornecer os projetos necessários e garantir a compatibilização entre disciplinas;</li>
      <li>Aprovar ou reprovar cotações e decisões solicitadas pelo CONTRATADO no prazo estabelecido;</li>
      <li>Realizar os pagamentos de materiais, fornecedores e prestadores no prazo acordado;</li>
      <li>Arcar com tributos, taxas e tarifas relacionadas à obra, inclusive INSS, ISS, CNO, entre outros;</li>
      <li>Responsabilizar-se pela contratação de mão de obra, empreiteiros e seguros da obra;</li>
      <li>Comunicar formalmente qualquer alteração de projeto ou decisão técnica que possa impactar o andamento da obra;</li>
      <li>Garantir o acesso do CONTRATADO à obra e disponibilizar os insumos operacionais necessários;</li>
      <li>Assinar os documentos de entrega técnica e vistoria de encerramento no prazo acordado após a ocupação do imóvel.</li>
    </ol>
  </div>

  <div class="clause">
    <h2>CLÁUSULA 8 – DISPOSIÇÕES FINAIS</h2>
    <p><strong>8.1</strong> Todas as comunicações formais entre CONTRATANTE e CONTRATADO deverão ser realizadas por escrito, preferencialmente por e-mail, sendo desconsideradas alterações verbais ou informais.</p>
    <p><strong>8.2</strong> O CONTRATADO poderá divulgar imagens e registros técnicos da obra, preservando os dados pessoais e respeitando a confidencialidade de informações comerciais.</p>
    <p><strong>8.3</strong> O CONTRATANTE reconhece que, devido à natureza artesanal de execução dos serviços, pode haver pequenas ondulações em superfícies como pintura e reboco, sem que isso configure vício ou defeito técnico.</p>
    <p><strong>8.4</strong> Também é considerado normal o surgimento de microfissuras nas alvenarias em razão de movimentações naturais de dilatação térmica entre materiais como argamassa, tijolo e concreto.</p>
  </div>

  <div class="clause">
    <h2>CLÁUSULA 9 – RESCISÃO</h2>
    <p><strong>10.1</strong> Em caso de inadimplência ou descontinuidade da obra, o CONTRATANTE pagará pelos serviços executados até a data.</p>
    <p><strong>10.2</strong> O valor de R$ XXXXX referente à fase de planejamento inicial não será devolvido em caso de cancelamento.</p>
  </div>

  <div class="clause">
    <h2>CLÁUSULA 10 – FORO</h2>
    <p><strong>11.1</strong> Fica eleito o foro da comarca de São José dos Campos/SP para dirimir quaisquer dúvidas oriundas deste contrato.</p>
  </div>

  <p style="margin-top: 30px;">E por estarem justos e contratados, assinam o presente instrumento em duas vias de igual teor.</p>
  <p style="text-align: center; margin-top: 40px;">São José dos Campos, ${dateStr}</p>

  <div class="signatures">
    <div class="signature-line">
      <div>CONTRATANTE</div>
      <div>${client.name || ''}</div>
      <div>${client.cpf_cnpj || ''}</div>
    </div>
    <div class="signature-line">
      <div>CONTRATADO</div>
      <div>GESTÃO ARCO</div>
      <div>CNPJ 54.248.657/0001-00</div>
    </div>
  </div>
</body>
</html>`;
  };

  const generatePlanoStartContract = (dateStr: string) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contrato Plano Start</title>
  <style>
    @page { margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #333; }
    h1 { text-align: center; font-size: 16pt; margin-bottom: 20px; }
    h2 { font-size: 13pt; margin-top: 20px; margin-bottom: 10px; }
    .data-box { border: 1px solid #333; padding: 15px; margin: 15px 0; }
    .signatures { margin-top: 40px; display: flex; justify-content: space-around; }
    .signature-line { border-top: 1px solid #333; width: 200px; padding-top: 5px; text-align: center; }
  </style>
</head>
<body>
  <h1>CONTRATO - Prestação de Serviços</h1>
  <p style="text-align: right;">São José dos Campos, ${dateStr}</p>

  <div class="data-box">
    <h2>Contratante</h2>
    <p><strong>Nome:</strong> ${client.name || '__________________'}</p>
    <p><strong>RG:</strong> ${client.rg_ie || '__________________'} <strong>CPF:</strong> ${client.cpf_cnpj || '__________________'}</p>
    <p><strong>Endereço:</strong> ${client.address ? `${client.address}, ${client.number || 'S/N'}` : '__________________'}</p>
    <p><strong>E-mail:</strong> ${client.email || '__________________'} <strong>Celular:</strong> ${client.mobile || '__________________'}</p>
  </div>

  <div class="data-box">
    <h2>Contratado</h2>
    <p><strong>Nome:</strong> GESTÃO ARCO - Gerenciamento de obras e projetos LTDA</p>
    <p><strong>CNPJ:</strong> 54.248.657/0001-00</p>
    <p><strong>Endereço:</strong> AV. Alfredo Ignácio Nogueira Penido, 335 Sala 706 - CEP 12246-000</p>
    <p><strong>E-mail:</strong> financeiro@arco.com.br</p>
  </div>

  <h2>1. Objeto do contrato</h2>
  <p><strong>1.1.</strong> A CONTRATADA se compromete a prestar serviços de consultoria em gestão de construção - <strong>Plano Start ${product.plano_category || ''}</strong> conforme descrito na proposta comercial, para a execução do projeto dos CONTRATANTES. Os serviços incluem, mas não se limitam a, planejamento inicial, projetos preliminares, quantificação de materiais e orçamento detalhado.</p>

  <h2>2. Valor e forma de pagamento</h2>
  <p><strong>2.1.</strong> O total a ser pago pela prestação de serviço será de <strong>R$ ${product.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '__________'}</strong></p>
  <p><strong>2.2.</strong> O valor total dos serviços será dividido em <strong>${product.installments || '___'}</strong> parcelas.</p>
  <p><strong>2.3.</strong> Os pagamentos deverão ser realizados conforme o progresso das etapas, com faturamento em até 5 dias úteis após a conclusão de cada etapa. Se o atraso nos pagamentos por parte do CONTRATANTE, ultrapassar 30 dias, a CONTRATADA poderá suspender a prestação dos serviços até que a situação seja regularizada.</p>

  <p style="margin-top: 30px;">Para demais cláusulas e condições, consulte o contrato completo do Plano Start.</p>

  <div class="signatures">
    <div class="signature-line">
      <div>${client.name || ''}</div>
      <div>CPF ${client.cpf_cnpj || ''}</div>
    </div>
    <div class="signature-line">
      <div>GESTÃO ARCO</div>
      <div>CNPJ 54.248.657/0001-00</div>
    </div>
  </div>
</body>
</html>`;
  };

  if (!clientId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o cliente primeiro para adicionar produto
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">Carregando...</div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Produto <span className="text-red-500">*</span>
          </label>
          <select
            value={product.product_type || ''}
            onChange={(e) => {
              const newProductType = e.target.value as ProductType;
              setProduct({
                ...product,
                product_type: newProductType,
                plano_category: newProductType === 'Plano Start' ? undefined : undefined
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
            style={{}}
          >
            {PRODUCT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {product.product_type === 'Plano Start' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria do Plano <span className="text-red-500">*</span>
            </label>
            <select
              value={product.plano_category || ''}
              onChange={(e) => setProduct({ ...product, plano_category: e.target.value as PlanoStartCategory })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              style={{}}
            >
              <option value="">Selecione...</option>
              {PLANO_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={product.status || 'ativo'}
            onChange={(e) => setProduct({ ...product, status: e.target.value as ProductStatus })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          >
            <option value="ativo">Ativo</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor (R$)
          </label>
          <input
            type="text"
            value={
              product.value !== undefined && product.value !== null
                ? new Intl.NumberFormat('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(product.value)
                : ''
            }
            onChange={(e) => {
              const rawValue = e.target.value.replace(/\D/g, '');
              const numValue = rawValue ? parseInt(rawValue) / 100 : undefined;
              setProduct({ ...product, value: numValue });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
            placeholder="0,00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Forma de Pagamento
          </label>
          <select
            value={product.payment_method || ''}
            onChange={(e) => setProduct({ ...product, payment_method: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          >
            <option value="">Selecione...</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Parcelas
          </label>
          <input
            type="number"
            min="1"
            value={product.installments || 1}
            onChange={(e) => setProduct({ ...product, installments: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prazo de execução (meses)
          </label>
          <input
            type="number"
            min="1"
            value={product.duration_months || ''}
            onChange={(e) => setProduct({ ...product, duration_months: parseInt(e.target.value) || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Contratação
          </label>
          <input
            type="date"
            value={product.contract_date || ''}
            onChange={(e) => setProduct({ ...product, contract_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Prevista de Término
          </label>
          <input
            type="date"
            value={product.estimated_end_date || ''}
            onChange={(e) => setProduct({ ...product, estimated_end_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Endereço da Obra
          </label>
          <input
            type="text"
            value={product.obra_address || ''}
            onChange={(e) => setProduct({ ...product, obra_address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
            placeholder="Endereço completo da obra"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações
          </label>
          <textarea
            value={product.observations || ''}
            onChange={(e) => setProduct({ ...product, observations: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 resize-none"
            placeholder="Observações adicionais sobre o produto/contrato"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: arcoColors.primary.blue }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Produto'}
        </button>

        <button
          onClick={handleGenerateContract}
          disabled={!hasProduct}
          className="flex items-center gap-2 px-4 py-2 border-2 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: arcoColors.primary.blue,
            color: arcoColors.primary.blue
          }}
          title={!hasProduct ? 'Salve o produto primeiro' : 'Gerar contrato em PDF'}
        >
          <FileText className="w-4 h-4" />
          Gerar Contrato PDF
        </button>
      </div>
    </div>
  );
}
