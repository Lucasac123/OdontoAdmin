import React, { useState } from 'react';
import { Patient } from '../../types';
import { FileSignature, Printer, Search } from 'lucide-react';
import { PrescriptionTemplatesModal } from './PrescriptionTemplatesModal';
import { PrintHeader } from '../print/PrintHeader';
import { PrintFooter } from '../print/PrintFooter';

export const ConsentFormsTab = ({ patient }: { patient: Patient }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('geral');
  const [customText, setCustomText] = useState('');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  const cpfText = patient.cpf || '_________________';
  const rgText = patient.rg || '_________________';

  const templates = {
    geral: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE) - GERAL\n\nEu, ${patient.name}, portador(a) do CPF ${cpfText} e RG ${rgText}, autorizo o(a) cirurgião-dentista a realizar os procedimentos odontológicos propostos no plano de tratamento.\n\nFui devidamente informado(a) sobre:\n1. O diagnóstico e o plano de tratamento proposto.\n2. Os benefícios, riscos e possíveis complicações dos procedimentos.\n3. As alternativas de tratamento existentes.\n4. A necessidade de minha colaboração durante e após o tratamento (cuidados, higiene, retornos).\n\nDeclaro que tive a oportunidade de fazer perguntas e todas as minhas dúvidas foram esclarecidas.\n\n\n\n___________________________________\nAssinatura do Paciente\n\nData: ${new Date().toLocaleDateString('pt-BR')}`,
    
    cirurgia: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - CIRURGIA ODONTOLÓGICA\n\nEu, ${patient.name}, portador(a) do CPF ${cpfText} e RG ${rgText}, autorizo o(a) cirurgião-dentista a realizar o procedimento cirúrgico de ___________________________________.\n\nFui informado(a) que:\n1. Todo procedimento cirúrgico envolve riscos, incluindo, mas não se limitando a: sangramento, infecção, inchaço, dor e parestesia (dormência temporária ou permanente).\n2. Devo seguir rigorosamente as recomendações pós-operatórias entregues a mim.\n3. O sucesso do tratamento depende também da minha colaboração.\n\nAutorizo também a administração de anestésicos locais necessários para o procedimento.\n\n\n\n___________________________________\nAssinatura do Paciente\n\nData: ${new Date().toLocaleDateString('pt-BR')}`,
    
    ortodontia: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - TRATAMENTO ORTODÔNTICO\n\nEu, ${patient.name}, portador(a) do CPF ${cpfText} e RG ${rgText}, concordo em iniciar o tratamento ortodôntico.\n\nEstou ciente de que:\n1. O tempo estimado de tratamento é uma previsão e pode variar dependendo da resposta biológica e da minha colaboração.\n2. É fundamental comparecer às consultas de manutenção agendadas.\n3. A higiene oral deve ser rigorosa para evitar cáries, manchas e problemas gengivais durante o uso do aparelho.\n4. Aparelhos quebrados ou soltos podem atrasar o tratamento e gerar custos adicionais.\n\n\n\n___________________________________\nAssinatura do Paciente\n\nData: ${new Date().toLocaleDateString('pt-BR')}`,

    imageRelease: `TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM\n\nEu, ${patient.name}, portador(a) do CPF ${cpfText} e RG ${rgText}, AUTORIZO o uso de minha imagem (fotos e vídeos) captada durante o tratamento odontológico pelo(a) cirurgião-dentista responsável.\n\nA presente autorização é concedida a título gratuito, abrangendo o uso das imagens para fins de:\n( ) Documentação clínica e prontuário.\n( ) Publicações científicas, aulas e palestras.\n( ) Divulgação em redes sociais (Instagram, Facebook, etc.) e materiais de marketing da clínica, desde que não exponha minha intimidade de forma vexatória.\n\nDeclaro estar ciente de que posso revogar esta autorização a qualquer momento, mediante solicitação por escrito.\n\n\n\n___________________________________\nAssinatura do Paciente\n\nData: ${new Date().toLocaleDateString('pt-BR')}`
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
    <div className="space-y-6 no-print">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
          <FileSignature className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
          Termos de Consentimento (TCLE)
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors text-xs sm:text-sm"
          >
            <Search className="w-3.5 h-3.5" />
            Modelos
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 sm:px-4 py-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors text-xs sm:text-sm shadow-lg dark:shadow-none dark:shadow-none"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-semibold text-text-primary mb-3">Modelos Padrão</h3>
            <div className="space-y-2">
              <button
                onClick={() => { setSelectedTemplate('geral'); setCustomText(''); }}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${selectedTemplate === 'geral' && !customText ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-text-secondary hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                Tratamento Geral
              </button>
              <button
                onClick={() => { setSelectedTemplate('cirurgia'); setCustomText(''); }}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${selectedTemplate === 'cirurgia' && !customText ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-text-secondary hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                Cirurgia
              </button>
              <button
                onClick={() => { setSelectedTemplate('ortodontia'); setCustomText(''); }}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${selectedTemplate === 'ortodontia' && !customText ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-text-secondary hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                Ortodontia
              </button>
              <button
                onClick={() => { setSelectedTemplate('imageRelease'); setCustomText(''); }}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${selectedTemplate === 'imageRelease' && !customText ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-text-secondary hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                Uso de Imagem
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <textarea
              value={customText || templates[selectedTemplate as keyof typeof templates]}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full h-[600px] bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none font-sans text-sm leading-relaxed"
            />
          </div>
        </div>
      </div>

      {showTemplatesModal && (
        <PrescriptionTemplatesModal
          isOpen={showTemplatesModal}
          onClose={() => setShowTemplatesModal(false)}
          onSelectTemplate={(content) => {
            setCustomText(content);
            setShowTemplatesModal(false);
          }}
          currentText={customText || templates[selectedTemplate as keyof typeof templates]}
          currentType={selectedTemplate === 'imageRelease' ? 'image-release' : 'tcle'}
        />
      )}
    </div>

    <div className="print-only max-w-4xl mx-auto font-sans">
      <PrintHeader title="Termo de Consentimento" patientName={patient.name} />
      
      <div className="mb-12 whitespace-pre-wrap text-base leading-relaxed text-zinc-800 text-justify">
        {customText || templates[selectedTemplate as keyof typeof templates]}
      </div>

      <PrintFooter />
    </div>
    </>
  );
};
