import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { company } from "@/lib/company";

export const metadata: Metadata = { title: "Política de Privacidade", description: "Política de Privacidade da CIASSTEC e informações sobre o tratamento de dados pessoais.", alternates: { canonical: "/politica-de-privacidade" } };

export default function PrivacyPolicyPage() {
  return <LegalPage eyebrow="Privacidade e dados" title="Política de Privacidade" intro="Esta política explica, de forma clara, como dados pessoais podem ser tratados durante o uso do site e dos canais de atendimento da CIASSTEC.">
    <p className="legal-updated">Última atualização: agosto de 2026.</p>
    <h2>1. Dados que podem ser tratados</h2>
    <p>Conforme a forma de contato e o serviço solicitado, a CIASSTEC pode tratar dados como nome, telefone, número de WhatsApp, e-mail, informações fornecidas nas mensagens, dados do equipamento, registros de atendimento, ordens de serviço e informações necessárias à elaboração de orçamento.</p>
    <h2>2. Finalidades do tratamento</h2>
    <p>Os dados podem ser utilizados para identificar e atender o cliente, compreender a solicitação, registrar equipamentos e ocorrências, organizar diagnósticos, preparar e acompanhar orçamentos e ordens de serviço, comunicar atualizações e manter o histórico necessário ao atendimento.</p>
    <h2>3. Bases e necessidade do tratamento</h2>
    <p>O tratamento ocorre conforme as hipóteses permitidas pela Lei Geral de Proteção de Dados Pessoais (LGPD), especialmente quando necessário para atender a uma solicitação do titular, executar procedimentos relacionados ao serviço, cumprir obrigações aplicáveis ou resguardar direitos. Quando exigido, será solicitado consentimento.</p>
    <h2>4. Armazenamento e segurança</h2>
    <p>A CIASSTEC busca limitar o acesso aos dados às pessoas que necessitam deles para o atendimento e adotar cuidados compatíveis com a natureza das informações. Os dados são mantidos pelo período necessário às finalidades informadas e ao cumprimento de obrigações ou exercício de direitos.</p>
    <h2>5. Compartilhamento</h2>
    <p>Dados podem ser compartilhados com fornecedores de tecnologia e comunicação estritamente quando isso for necessário para disponibilizar o site, manter o sistema de atendimento ou prestar o serviço solicitado. Também poderá haver compartilhamento para cumprimento de obrigação legal ou determinação de autoridade competente.</p>
    <h2>6. Canais digitais e WhatsApp</h2>
    <p>Ao entrar em contato por WhatsApp, e-mail ou outro canal digital, as informações enviadas são tratadas para responder à solicitação e dar continuidade ao atendimento. Esses canais também estão sujeitos às políticas e condições dos respectivos provedores.</p>
    <h2>7. Direitos do titular</h2>
    <p>Nos termos da LGPD, o titular pode solicitar informações sobre o tratamento, confirmação e acesso, correção de dados incompletos ou desatualizados e, quando aplicável, anonimização, bloqueio, eliminação, portabilidade ou revisão de consentimento. Algumas informações podem precisar ser mantidas por obrigação legal ou para o exercício regular de direitos.</p>
    <h2>8. Atualizações desta política</h2>
    <p>Esta política poderá ser atualizada para refletir mudanças nos canais, serviços ou requisitos aplicáveis. A versão vigente será publicada nesta página.</p>
    <h2>9. Contato sobre privacidade</h2>
    <p>Para dúvidas ou solicitações relacionadas a dados pessoais, entre em contato pelo e-mail <a href={`mailto:${company.primaryEmail}`}>{company.primaryEmail}</a>.</p>
  </LegalPage>;
}
