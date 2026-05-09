export const ADULT_MEDICATIONS = [
  { medicamento: "Dipirona", apresentacao: "Comprimido", concentracao: "500 mg", doseTomada: "1000 mg", intervalo: "8h", dosesDia: 3, doseDiaria: "3000 mg", doseMaxima: "4000 mg", observacoes: "Dor leve-moderada, pós-exodontia", contraindicacoes: "Alergia/hematológicas" },
  { medicamento: "Paracetamol", apresentacao: "Comprimido", concentracao: "500 mg", doseTomada: "750 mg", intervalo: "6h", dosesDia: 4, doseDiaria: "3000 mg", doseMaxima: "4000 mg", observacoes: "Preferível em gestantes", contraindicacoes: "Doença hepática" },
  { medicamento: "Ibuprofeno", apresentacao: "Comprimido", concentracao: "400 mg", doseTomada: "400 mg", intervalo: "8h", dosesDia: 3, doseDiaria: "1200 mg", doseMaxima: "2400 mg", observacoes: "Dor inflamatória (evitar em risco GI/DRC)", contraindicacoes: "Úlcera/DRC/HAS descomp." },
  { medicamento: "Paracetamol + Codeína", apresentacao: "Comprimido", concentracao: "500+30 mg", doseTomada: "500 mg", intervalo: "6h", dosesDia: 4, doseDiaria: "2000 mg", doseMaxima: "2000 mg", observacoes: "Dor intensa (uso restrito)", contraindicacoes: "Risco dependência/gestação" },
  { medicamento: "Tramadol", apresentacao: "Cápsula / Comprimido", concentracao: "50 mg", doseTomada: "50–100 mg", intervalo: "6/6–8/8 h", dosesDia: 4, doseDiaria: "400 mg", doseMaxima: "400 mg", observacoes: "Uso criterioso / pode causar náusea, tontura e dependência", contraindicacoes: "-" }
];

export const PEDIATRIC_MEDICATIONS = [
  { medicamento: "Amoxicilina", apresentacao: "Suspensão", concentracao: "250 mg/5 mL", dosePadrao: "50 mg/kg/dia", frequencia: "3x/dia", observacoes: "Dose padrão de apoio: 50 mg/kg/dia." },
  { medicamento: "Azitromicina", apresentacao: "Suspensão", concentracao: "200 mg/5 mL", dosePadrao: "10 mg/kg/dia", frequencia: "1x/dia", observacoes: "AAPD: 10–12 mg/kg no dia 1, depois 5–6 mg/kg/dia." },
  { medicamento: "Dipirona", apresentacao: "Solução oral", concentracao: "500 mg/mL", dosePadrao: "15 mg/kg/dose", frequencia: "4x/dia", observacoes: "1 gota = 25 mg." },
  { medicamento: "Ibuprofeno", apresentacao: "Suspensão oral", concentracao: "20 mg/mL", dosePadrao: "10 mg/kg/dose", frequencia: "4x/dia", observacoes: "Uso pediátrico comum: 5–10 mg/kg/dose." }
];

export const DOCUMENT_TEMPLATES = {
  receita: {
    title: "Modelo de Receita",
    content: "Para: [Nome do Paciente]\nData: [Data]\n\n1. [Medicamento] - [Dose] - [Posologia]"
  },
  atestado: {
    title: "Modelo de Atestado",
    content: "ATESTADO ODONTOLÓGICO\n\nAtesto para os devidos fins que o(a) paciente [Nome do Paciente]..."
  },
  termoConsentimento: {
    title: "Termo de Consentimento Livre e Esclarecido",
    content: "Eu, [Nome do Paciente], declaro que fui informado(a) e esclarecido(a) a respeito do tratamento que será realizado..."
  },
  termoCirurgia: {
    title: "TCLE - Cirurgia Odontológica",
    content: "TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - CIRURGIA ODONTOLÓGICA\n\nEu, [Nome do Paciente], portador(a) do CPF [CPF] e RG [RG], autorizo o(a) cirurgião-dentista a realizar o procedimento cirúrgico de ___________________________________.\n\nFui informado(a) que:\n1. Todo procedimento cirúrgico envolve riscos, incluindo, mas não se limitando a: sangramento, infecção, inchaço, dor e parestesia (dormência temporária ou permanente).\n2. Devo seguir rigorosamente as recomendações pós-operatórias entregues a mim.\n3. O sucesso do tratamento depende também da minha colaboração.\n\nAutorizo também a administração de anestésicos locais necessários para o procedimento.\n\nData: [Data]"
  },
  termoOrtodontia: {
    title: "TCLE - Tratamento Ortodôntico",
    content: "TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - TRATAMENTO ORTODÔNTICO\n\nEu, [Nome do Paciente], portador(a) do CPF [CPF] e RG [RG], concordo em iniciar o tratamento ortodôntico.\n\nEstou ciente de que:\n1. O tempo estimado de tratamento é uma previsão e pode variar dependendo da resposta biológica e da minha colaboração.\n2. É fundamental comparecer às consultas de manutenção agendadas.\n3. A higiene oral deve ser rigorosa para evitar cáries, manchas e problemas gengivais durante o uso do aparelho.\n4. Aparelhos quebrados ou soltos podem atrasar o tratamento e gerar custos adicionais.\n\nData: [Data]"
  },
  posOperatorio: {
    title: "Cuidados Pós-operatório",
    content: "1 – Não tomar sol; 2 – Não fazer esforço físico; 3 – Não cuspir..."
  },
  encaminhamentoCardio: {
    title: "Encaminhamento para Avaliação Cardiológica",
    content: "Encaminho o(a) paciente [Nome do Paciente] para avaliação cardiológica..."
  },
  encaminhamentoMedico: {
    title: "Encaminhamento Médico",
    content: "ENCAMINHAMENTO MÉDICO\n\nProfissional: [Nome do Profissional]\nCRO: [CRO]\nEndereço: [Endereço]\nTelefone: [Telefone]\n\nPaciente: [Nome do Paciente]\nCPF: [CPF]\nData de Nascimento: [Data de Nascimento]\n\nSolicitação de Avaliação, Conduta e Parecer Médico no campo da [Especialidade].\n\nEncaminho o(a) paciente acima qualificado(a) para sua avaliação e/ou conduta médica, informando que o mesmo possui necessidade de realizar procedimento odontológico de [Procedimento], a ser realizado sob anestesia local, com expectativa de duração de aproximadamente [Duração] hora(s).\n\nSolicito que seja especificado no Parecer Médico se o(a) referido paciente está apto a ser submetido ao procedimento, com apontamento sobre eventuais observações e/ou cuidados médicos específicos, no pré e no pós-procedimento.\n\nAnamnese/Inventário de Saúde: [Aspectos Relevantes]\n\nLocal e data: [Local e Data]"
  },
  encaminhamentoOdontologico: {
    title: "Encaminhamento Odontológico",
    content: "ENCAMINHAMENTO ODONTOLÓGICO\n\nProfissional: [Nome do Profissional]\nCRO: [CRO]\nEndereço: [Endereço]\nTelefone: [Telefone]\n\nPaciente: [Nome do Paciente]\nCPF: [CPF]\nData de Nascimento: [Data de Nascimento]\n\nSolicitação de Avaliação, Conduta e Parecer Odontológico no campo da [Especialidade].\n\nEncaminho o(a) paciente acima qualificado(a) para sua avaliação e/ou conduta odontológica, informando que o mesmo possui necessidade de realizar procedimento de [Procedimento].\n\nDentes e área/região a serem avaliados: [Área/Região]\n\nSolicito que seja especificado no Parecer Odontológico apontamento sobre sua análise especializada, detalhamento de procedimento e/ou conduta realizada, bem como eventuais observações e/ou cuidados específicos que entender pertinentes.\n\nAnamnese/Inventário de Saúde: [Aspectos Relevantes]\n\nLocal e data: [Local e Data]"
  },
  encaminhamentoProtetico: {
    title: "Encaminhamento para Tratamento Protético",
    content: "ENCAMINHAMENTO PARA TRATAMENTO PROTÉTICO\n\nCirurgião-Dentista: [Nome]\nCRO: [CRO]\nTelefone: [Telefone]\n\nDADOS DO PACIENTE\nNome do paciente: [Nome]\nData de nascimento: [Data]\nTelefone: [Telefone]\n\nINFORMAÇÕES CLÍNICAS\nElemento(s) dentário(s): [Elementos]\nDiagnóstico clínico: [Diagnóstico]\nCondição atual: [Condição]\nTratamento prévio realizado: [Tratamento]\n\nSOLICITAÇÃO\nEncaminho o(a) paciente acima identificado(a) para avaliação e realização de tratamento protético, com a finalidade de reabilitação funcional e estética, conforme necessidade clínica.\n\nTIPO DE PRÓTESE SUGERIDA\n( ) Prótese total\n( ) Prótese parcial removível\n( ) Prótese fixa\n( ) Coroa unitária\n( ) Outro: [Outro]\n\nLocal e data: [Local e Data]"
  },
  atestadoComparecimento: {
    title: "Atestado de Comparecimento",
    content: "DECLARAÇÃO DE COMPARECIMENTO\n\nDeclaro para os devidos fins que o(a) paciente [Nome do Paciente], portador(a) do CPF [CPF], compareceu a esta clínica odontológica no dia [Data], das [Início] às [Fim] horas, para realização de consulta/tratamento odontológico.\n\nLocal e data: [Local e Data]"
  },
  laudo: {
    title: "Laudo Odontológico",
    content: "LAUDO ODONTOLÓGICO\n\nPaciente: [Nome do Paciente]\nData: [Data]\n\nAo exame clínico e radiográfico, observou-se: [Descrição dos achados]\n\nDiagnóstico: [Diagnóstico]\n\nConduta/Tratamento: [Conduta]\n\nLocal e data: [Local e Data]"
  },
  exame: {
    title: "Pedido de Exames",
    content: "SOLICITAÇÃO DE EXAMES\n\nPaciente: [Nome do Paciente]\nData: [Data]\n\nSolicito a realização dos seguintes exames:\n( ) Radiografia Periapical de [Dentes]\n( ) Radiografia Panorâmica\n( ) Tomografia Computadorizada de [Região]\n( ) Exames laboratoriais: [Exames]\n\nFinalidade: [Finalidade]\n\nLocal e data: [Local e Data]"
  },
  registroImagens: {
    title: "Registro de Imagens/Modelos",
    content: "REGISTRO DE IMAGENS/MODELOS/ENCERAMENTOS/OUTROS\n\nData | Tipo de Registro | Justificativa | Local de Arquivo\n---------------------------------------------------------\n[Data] | [Tipo] | [Justificativa] | [Local]"
  }
};

export const CATEGORIZED_MEDICATIONS = [
  {
    category: "Analgésicos",
    medications: [
      { name: "Dipirona", indication: "Dor leve a moderada e febre.", choiceOrder: "1ª escolha para a maioria dos pacientes.", posology: "Tomar 2 comprimidos (500mg cada) a cada 8h por 3 dias.", observation: "Dor leve-moderada, pós-exodontia.", contraindication: "Alergia/hematológicas." },
      { name: "Paracetamol", indication: "Dor leve a moderada e febre.", choiceOrder: "1ª escolha para gestantes e pacientes com restrição a AINEs.", posology: "Tomar 1 comprimido (750mg) a cada 6h por 3 dias.", observation: "Preferível em gestantes.", contraindication: "Doença hepática." },
      { name: "Ibuprofeno", indication: "Dor de origem inflamatória.", choiceOrder: "2ª escolha para dor leve (após analgésicos simples).", posology: "Tomar 1 comprimido (400mg) a cada 8h por 3 dias.", observation: "Dor inflamatória (evitar em risco GI/DRC).", contraindication: "Úlcera/DRC/HAS descomp." },
      { name: "Paracetamol + Codeína", indication: "Dor moderada a intensa.", choiceOrder: "2ª escolha (quando analgésicos simples falham).", posology: "Tomar 1 comprimido (500+30mg) a cada 6h por 3 dias.", observation: "Dor intensa (uso restrito).", contraindication: "Risco dependência/gestação." },
      { name: "Tramadol", indication: "Dor moderada a intensa.", choiceOrder: "3ª escolha (dor refratária).", posology: "Tomar 1 comprimido (50 mg) a cada 6-8h se dor, por até 3 dias.", observation: "Uso criterioso / pode causar náusea, tontura e dependência.", contraindication: "-" }
    ]
  },
  {
    category: "Anti-inflamatórios",
    medications: [
      { name: "Ibuprofeno", indication: "Processos inflamatórios agudos.", choiceOrder: "1ª escolha entre AINEs não seletivos.", posology: "Tomar 1 comprimido (600mg) a cada 8h por 3 dias.", observation: "Dor inflamatória/pós-op.", contraindication: "Úlcera/DRC/HAS descomp." },
      { name: "Nimesulida", indication: "Inflamação e dor.", choiceOrder: "2ª escolha (uso restrito a 3-5 dias).", posology: "Tomar 1 comprimido (100mg) a cada 12h por 3 dias.", observation: "Edema/dor (curto prazo).", contraindication: "Hepatopatia." },
      { name: "Diclofenaco potássico", indication: "Inflamação e dor.", choiceOrder: "2ª escolha.", posology: "Tomar 1 comprimido (50mg) a cada 8h por 3 dias.", observation: "Dor inflamatória.", contraindication: "Risco GI/DRC." },
      { name: "Naproxeno", indication: "Inflamação e dor.", choiceOrder: "2ª escolha (maior tempo de meia-vida).", posology: "Tomar 1 comprimido (500mg) a cada 12h por 2 dias.", observation: "Alternativa AINE.", contraindication: "Risco CV/úlcera." }
    ]
  },
  {
    category: "Corticoides",
    medications: [
      { name: "Dexametasona", indication: "Prevenção de edema e trismo.", choiceOrder: "1ª escolha para cirurgias invasivas.", posology: "Tomar 1 comprimido (4 mg) 1x/dia por 3 dias.", observation: "Edema/trismo pós-op. Preferir curto período.", contraindication: "-" },
      { name: "Prednisona", indication: "Inflamação intensa e edema.", choiceOrder: "Alternativa à dexametasona.", posology: "Tomar 1 comprimido (20 mg) 1x/dia por 3 dias.", observation: "Inflamação intensa. Avaliar desmame se > 5 dias.", contraindication: "-" },
      { name: "Prednisolona", indication: "Inflamação e edema.", choiceOrder: "Uso comum em pediatria (solução).", posology: "Tomar 20 mg 1x/dia por 3 dias.", observation: "-", contraindication: "-" }
    ]
  },
  {
    category: "Antibióticos",
    medications: [
      { name: "Amoxicilina", indication: "Infecções odontogênicas leves.", choiceOrder: "1ª escolha para pacientes não alérgicos.", posology: "Tomar 1 comprimido (500mg) a cada 8h por 7 dias.", observation: "Infecção odontogênica leve-moderada.", contraindication: "Alergia à penicilina." },
      { name: "Amoxicilina + Clavulanato", indication: "Infecções persistentes ou graves.", choiceOrder: "2ª escolha (quando há suspeita de resistência).", posology: "Tomar 1 comprimido (875+125mg) a cada 12h por 7 dias.", observation: "Infecção moderada/recidiva.", contraindication: "Alergia à penicilina." },
      { name: "Azitromicina", indication: "Infecções em alérgicos a penicilina.", choiceOrder: "1ª escolha para alérgicos (perfil ambulatorial).", posology: "Tomar 1 comprimido (500mg) a cada 24h por 3 dias.", observation: "Alergia à penicilina.", contraindication: "-" },
      { name: "Clindamicina", indication: "Infecções graves ou em alérgicos.", choiceOrder: "2ª escolha para alérgicos (risco de colite).", posology: "Tomar 1 cápsula (300mg) a cada 6h por 7 dias.", observation: "Infecção mais grave/alergia.", contraindication: "-" },
      { name: "Metronidazol", indication: "Infecções por anaeróbios.", choiceOrder: "Adjuvante (associar à amoxicilina).", posology: "Tomar 1 comprimido (400mg) a cada 8h por 7 dias.", observation: "Anaeróbios/associação.", contraindication: "Associar amoxicilina." },
      { name: "Cefalexina", indication: "Infecções de pele/tecidos moles.", choiceOrder: "Alternativa em alérgicos leves (cuidado).", posology: "Tomar 1 comprimido (500mg) a cada 6h por 7 dias.", observation: "Infecção odontogênica.", contraindication: "Alergia à penicilina leve." }
    ]
  },
  {
    category: "Uso Local",
    medications: [
      { name: "Clorexidina 0,12%", indication: "Controle de placa e pós-operatório.", choiceOrder: "Padrão ouro em antissepsia bucal.", posology: "Bochechar 15 mL por 30-60s, 2x ao dia por 7 dias.", observation: "Gengivite/pós-op. Evitar > 14 dias (manchamento).", contraindication: "-" },
      { name: "Nistatina 100.000 UI/mL", indication: "Candidíase oral.", choiceOrder: "1ª escolha para candidíase eritematosa.", posology: "Bochechar 5 mL e engolir/descartar, 4x ao dia por 7 dias.", observation: "Candidíase oral. Agitar antes de usar.", contraindication: "-" },
      { name: "Miconazol Gel oral 20 mg/g", indication: "Candidíase oral localizada.", choiceOrder: "Eficaz para queilite angular.", posology: "Aplicar camada fina, 3x ao dia por 7 dias.", observation: "Candidíase. Cuidado com prótese.", contraindication: "-" },
      { name: "Triancinolona orabase 1,0 mg/g", indication: "Lesões ulcerativas (aftas).", choiceOrder: "Uso tópico para alívio de dor e inflamação.", posology: "Aplicar camada fina, 3x ao dia por 7 dias.", observation: "Aftas. Cuidado com prótese/estomatite.", contraindication: "-" }
    ]
  },
  {
    category: "Auxiliares",
    medications: [
      { name: "Omeprazol 20 mg", indication: "Proteção gástrica.", choiceOrder: "Indicado em uso prolongado de AINEs.", posology: "Tomar 1 cápsula ao dia por 5-7 dias.", observation: "Proteção gástrica em uso de AINE. Usar quando risco GI.", contraindication: "-" },
      { name: "Ondansetrona 4-8 mg", indication: "Náuseas e vômitos.", choiceOrder: "1ª escolha para controle de emese.", posology: "Tomar 1 comprimido a cada 8h se necessário por 2 dias.", observation: "Náusea/vômito pós-op. Ajustar conforme necessidade.", contraindication: "-" },
      { name: "Dimenidrinato 50 mg", indication: "Náuseas e tontura.", choiceOrder: "Alternativa de baixo custo.", posology: "Tomar 1 comprimido a cada 8h se necessário por 2 dias.", observation: "Náusea. Pode causar sonolência.", contraindication: "-" },
      { name: "Diazepam 5-10 mg", indication: "Ansiedade pré-operatória.", choiceOrder: "Benzodiazepínico de longa duração.", posology: "Dose única pré-procedimento.", observation: "Ansiedade (uso criterioso). Controle especial.", contraindication: "Avaliar contraindicações." },
      { name: "Ácido tranexâmico 250 mg", indication: "Controle de sangramento.", choiceOrder: "Hemostático local ou sistêmico.", posology: "Tomar 500 mg a cada 8h até cessar sangramento.", observation: "Hemostasia pós-operatória.", contraindication: "-" },
      { name: "Cetorolaco trometamol 10 mg", indication: "Dor aguda intensa.", choiceOrder: "Potente analgésico não opioide.", posology: "Tomar 10 mg a cada 8h por até 8 dias (Máx 40 mg/dia).", observation: "Dor aguda intensa.", contraindication: "-" },
      { name: "Midazolam 7,5 mg", indication: "Sedação consciente.", choiceOrder: "1ª escolha para sedação oral (curta duração).", posology: "Dose única.", observation: "Sedação/ansiedade - controle especial.", contraindication: "-" }
    ]
  },
  {
    category: "Injetáveis (Uso Clínico)",
    medications: [
      { name: "Cetorolaco trometamol", indication: "Dor aguda intensa.", choiceOrder: "Uso imediato em consultório.", posology: "30 mg IM/EV a cada 6-8h.", observation: "Dor intensa. Máx. 5 dias.", contraindication: "-" },
      { name: "Tramadol", indication: "Dor moderada a intensa.", choiceOrder: "Opioide para dor refratária.", posology: "50-100 mg IM/EV a cada 6-8h.", observation: "Dor moderada/intensa. Risco dependência.", contraindication: "-" },
      { name: "Dexametasona", indication: "Edema e inflamação grave.", choiceOrder: "Potente anti-inflamatório injetável.", posology: "4-8 mg IM/EV dose única.", observation: "Edema/trismo. Uso curto.", contraindication: "-" },
      { name: "Clindamicina", indication: "Infecções graves.", choiceOrder: "Alternativa EV para alérgicos.", posology: "600 mg EV a cada 8h.", observation: "Infecção grave. Monitorar GI.", contraindication: "-" },
      { name: "Metronidazol", indication: "Infecções por anaeróbios.", choiceOrder: "Uso hospitalar ou infecções graves.", posology: "500 mg EV a cada 8h.", observation: "Anaeróbios. Sem álcool.", contraindication: "-" },
      { name: "Amoxicilina + Clavulanato", indication: "Infecções graves.", choiceOrder: "Amplo espectro injetável.", posology: "1,2 g EV a cada 8h.", observation: "Infecção grave. Hospitalar.", contraindication: "-" },
      { name: "Ceftriaxona", indication: "Infecções graves.", choiceOrder: "Cefalosporina de 3ª geração.", posology: "1 g EV 1x/dia.", observation: "Infecção grave. Boa cobertura.", contraindication: "-" },
      { name: "Ácido tranexâmico", indication: "Hemorragia.", choiceOrder: "Controle de sangramento agudo.", posology: "1 g ataque + 1 g EV a cada 8h.", observation: "Sangramento. Hemostático.", contraindication: "-" },
      { name: "Midazolam", indication: "Sedação profunda/emergência.", choiceOrder: "Uso restrito e monitorado.", posology: "1-2 mg EV ou 5-10 mg IM.", observation: "Sedação. Controle especial.", contraindication: "-" }
    ]
  }
];

export const TWO_COPY_MEDICATIONS = [
  // Antibióticos
  "Amoxicilina", "Clavulanato", "Azitromicina", "Clindamicina", "Metronidazol", "Cefalexina", "Ceftriaxona",
  // Controle Especial / Psicotrópicos / Opioides
  "Diazepam", "Midazolam", "Tramadol", "Codeína", "Cetorolaco"
];
